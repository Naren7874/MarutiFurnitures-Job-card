import DeliveryTrip from '../models/DeliveryTrip.js';
import JobCard from '../models/JobCard.js';
import { emitJobCardStatus, emitNotification } from '../socket/socket.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendWhatsApp, WA_TEMPLATES } from '../utils/sendWhatsApp.js';
import { uploadReqFile } from '../middleware/upload.js';
import { auditLog } from '../utils/auditLogger.js';

// GET /api/deliveries - Dispatcher fetches their assigned trips
export const getDeliveries = async (req, res, next) => {
    try {
        const { status, limit = 50 } = req.query;
        let query = {};
        
        // For dispatchers and super admins, we allow cross-company visibility 
        // as requested for the global dispatch hub.
        if (req.user.role !== 'dispatch' && req.user.role !== 'super_admin' && req.user.role !== 'master_admin') {
            query.companyId = req.user.companyId;
        }

        let statusArray = [];
        if (status) {
            statusArray = Array.isArray(status) ? status : status.split(',');
            query.status = { $in: statusArray };
        }


        let trips = await DeliveryTrip.find(query)
            .populate('clientId', 'name phone address')
            .populate({
                path: 'jobCards',
                select: 'jobCardNumber title status items'
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        // If 'delivered' status is requested, also fetch standalone legacy jobcards
        if (statusArray.includes('delivered')) {
            const standaloneQuery = { 
                status: 'delivered',
                deliveryTripId: { $exists: false }
            };
            if (req.user.role !== 'dispatch' && req.user.role !== 'super_admin' && req.user.role !== 'master_admin') {
                standaloneQuery.companyId = req.user.companyId;
            }

            const standaloneJobs = await JobCard.find(standaloneQuery)
                .populate('clientId', 'name phone address')
                .populate('dispatchStageId', 'proofOfDelivery deliveredByName')
                .sort({ actualDelivery: -1 })
                .limit(50)
                .lean();

            const virtualTrips = standaloneJobs.map(jc => {
                const photos = [];
                if (jc.dispatchStageId?.proofOfDelivery?.photo) {
                    photos.push(jc.dispatchStageId.proofOfDelivery.photo);
                }
                
                return {
                    _id: jc._id,
                    clientId: jc.clientId,
                    jobCards: [{
                        _id: jc._id,
                        jobCardNumber: jc.jobCardNumber,
                        title: jc.title,
                        status: jc.status,
                        photo: jc.items?.[0]?.photo
                    }],
                    deliveryTeam: [], 
                    status: 'delivered',
                    scheduledDate: jc.expectedDelivery,
                    timeSlot: 'Individual',
                    deliveredByName: jc.dispatchStageId?.deliveredByName || 'N/A',
                    proofOfDelivery: {
                        photos,
                        capturedAt: jc.actualDelivery || jc.updatedAt
                    },
                    isLegacy: true
                };
            });

            trips = [...trips, ...virtualTrips];
            // Re-sort combined list by delivery date
            trips.sort((a, b) => {
                const dateA = a.proofOfDelivery?.capturedAt || a.createdAt || 0;
                const dateB = b.proofOfDelivery?.capturedAt || b.createdAt || 0;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        }

        const result = trips.map(t => ({
            ...t,
            jobCards: t.jobCards.map(jc => ({
                ...jc,
                photo: jc.photo || jc.items?.[0]?.photo
            }))
        }));

        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

// POST /api/deliveries - Admin schedules a batch trip
export const scheduleDelivery = async (req, res, next) => {
    try {
        const { jobCardIds, deliveryTeam, scheduledDate, timeSlot } = req.body;

        if (!jobCardIds || !jobCardIds.length) {
            return res.status(400).json({ success: false, message: 'Must select at least one Job Card.' });
        }

        // Verify job cards belong to company & are qc_passed
        let jcQuery = { _id: { $in: jobCardIds } };
        if (req.user.role !== 'dispatch' && req.user.role !== 'super_admin' && req.user.role !== 'master_admin') {
            jcQuery.companyId = req.user.companyId;
        }

        const jobCards = await JobCard.find(jcQuery).lean();
        
        if (jobCards.length !== jobCardIds.length) {
            return res.status(404).json({ success: false, message: 'Some Job Cards were not found or not accessible.' });
        }

        const clientId = jobCards[0].clientId;
        const projectId = jobCards[0].projectId;
        const targetCompanyId = jobCards[0].companyId; // The actual owner of the job cards

        const trip = await DeliveryTrip.create({
            companyId: targetCompanyId,
            projectId,
            clientId,
            jobCards: jobCardIds,
            deliveryTeam,
            scheduledDate,
            timeSlot,
            status: 'scheduled',
            createdBy: req.user.userId
        });

        // Update JobCards status and link to trip
        await JobCard.updateMany(
            { _id: { $in: jobCardIds } },
            { 
                $set: { 
                    status: 'dispatched',
                    deliveryTripId: trip._id
                },
                $push: {
                    activityLog: {
                        action: 'status_changed',
                        doneBy: req.user.userId,
                        doneByName: req.user.name,
                        prevStatus: 'qc_passed',
                        newStatus: 'dispatched',
                        note: `Batch delivery scheduled. Trip ID: ${trip._id}`
                    }
                }
            }
        );

        // Emit status and log audit
        for (const jc of jobCards) {
            emitJobCardStatus(targetCompanyId, { jobCardId: jc._id, status: 'dispatched', jobCardNumber: jc.jobCardNumber });
            auditLog(req, {
                action: 'update',
                resourceType: 'JobCard',
                resourceId: jc._id,
                resourceLabel: jc.jobCardNumber,
                changes: { status: { from: 'qc_passed', to: 'dispatched' } },
                metadata: { action: 'batch_dispatch_scheduled', tripId: trip._id }
            });
        }

        // WhatsApp notification to Client (Grouped message if possible, or individual)
        /* WhatsApp notification disabled
        import('mongoose').then(async (mongoose) => {
            const client = await mongoose.model('Client').findById(clientId).lean();
            if (client?.whatsappNumber) {
                // Send for the first one, or customized batch message. Using existing template for now.
                const jcNumbers = jobCards.map(jc => jc.jobCardNumber).join(', ');
                await sendWhatsApp(
                    client.whatsappNumber,
                    WA_TEMPLATES.DELIVERY_SCHEDULED,
                    [
                        jcNumbers,
                        new Date(scheduledDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
                        timeSlot,
                        'N/A', // Vehicle
                        deliveryTeam?.[0]?.name || 'N/A',
                    ]
                );
            }
        });
        */

        res.status(201).json({ success: true, data: trip });
    } catch (error) { next(error); }
};

// PATCH /api/deliveries/:id/complete
export const completeDelivery = async (req, res, next) => {
    try {
        const { gpsLocation, clientSignature, podPhotoUrls, deliveredByName } = req.body;
        
        const query = { _id: req.params.id };
        if (req.user.role !== 'dispatch' && req.user.role !== 'super_admin' && req.user.role !== 'master_admin') {
            query.companyId = req.user.companyId;
        }

        const trip = await DeliveryTrip.findOne(query).populate('jobCards', 'jobCardNumber status companyId').populate('clientId', 'whatsappNumber');
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

        let finalPhotos = Array.isArray(podPhotoUrls) ? podPhotoUrls : (podPhotoUrls ? [podPhotoUrls] : []);
        
        // Handle direct multiparty file uploads if attached
        if (req.files && req.files.length > 0) {
           for (const file of req.files) {
              // Now using trip.companyId for the storage path instead of dispatcher's company
              const { url } = await uploadReqFile({ file, user: req.user }, `${trip.companyId}/pod`);
              finalPhotos.push(url);
           }
        }

        const updateData = {
            status: 'delivered',
            deliveredBy: req.user.userId,
            deliveredByName: deliveredByName || null,
            actualDelivery: new Date(),
            'proofOfDelivery.gpsLocation': gpsLocation || null,
            'proofOfDelivery.signature': clientSignature || null,
            'proofOfDelivery.capturedAt': new Date(),
            'proofOfDelivery.photos': finalPhotos
        };

        await trip.set(updateData).save();

        const jobCardIds = trip.jobCards.map(jc => jc._id);
        
        // Update all associated real Job Cards to delivered
        await JobCard.updateMany(
            { _id: { $in: jobCardIds } },
            {
                status: 'delivered',
                actualDelivery: new Date(),
                $push: { activityLog: { action: 'delivered', doneBy: req.user.userId, prevStatus: 'dispatched', newStatus: 'delivered', timestamp: new Date() } }
            }
        );

        // Notify Admins & Sales globally for the trip's specific company
        const notifyStaff = await User.find({
            companyId: trip.companyId,
            role: { $in: ['master_admin', 'super_admin', 'admin', 'sales'] },
            isActive: true
        }, '_id');

        if (notifyStaff.length > 0) {
            const jcNumbers = trip.jobCards.map(jc => jc.jobCardNumber).join(', ');
            const notifications = notifyStaff.map(u => ({
                companyId: trip.companyId,
                recipientId: u._id,
                type: 'delivered',
                title: 'Batch Delivery Completed',
                message: `Delivery trip containing ${trip.jobCards.length} items (${jcNumbers}) has been completed.`,
                channel: 'in_app'
            }));
            const inserted = await Notification.insertMany(notifications);
            inserted.forEach(n => emitNotification(trip.companyId.toString(), n));
        }

        // Audit & WebSockets
        for (const jc of trip.jobCards) {
             emitJobCardStatus(trip.companyId, { jobCardId: jc._id, status: 'delivered', jobCardNumber: jc.jobCardNumber });
             auditLog(req, {
                action: 'update',
                resourceType: 'JobCard',
                resourceId: jc._id,
                resourceLabel: jc.jobCardNumber,
                changes: { status: { from: 'dispatched', to: 'delivered' } },
                metadata: { action: 'batch_delivered', tripId: trip._id }
            });
        }

        // WhatsApp to Client
        /* WhatsApp to Client disabled
        if (trip.clientId?.whatsappNumber) {
            const jcNumbers = trip.jobCards.map(jc => jc.jobCardNumber).join(', ');
            await sendWhatsApp(trip.clientId.whatsappNumber, WA_TEMPLATES.JOB_DELIVERED, [jcNumbers]);
        }
        */

        res.status(200).json({ success: true, data: trip, message: 'All items marked as delivered!' });
    } catch (error) { next(error); }
};
