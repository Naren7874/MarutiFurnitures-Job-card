import { DispatchStage } from '../../models/DispatchStage.js';
import JobCard from '../../models/JobCard.js';
import { generateAndUploadPDF } from '../../utils/generatePDF.js';
import { uploadReqFile } from '../../middleware/upload.js';
import { sendWhatsApp, WA_TEMPLATES } from '../../utils/sendWhatsApp.js';
import Client from '../../models/Client.js';
import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import { auditLog } from '../../utils/auditLogger.js';
import { emitNotification, emitJobCardStatus } from '../../socket/socket.js';

/** GET /api/jobcards/:id/dispatch */
export const getDispatch = async (req, res, next) => {
  try {
    const jobCard = await JobCard.findById(req.params.id).populate('deliveryTripId').lean();
    let stage = null;

    // 1. Prefer DeliveryTrip (Modern Batch flow)
    if (jobCard?.deliveryTripId) {
      const trip = jobCard.deliveryTripId;
      stage = {
        _id: trip._id,
        jobCardId: req.params.id,
        status: trip.status,
        scheduledDate: trip.scheduledDate,
        timeSlot: trip.timeSlot,
        deliveryTeam: trip.deliveryTeam,
        deliveredAt: trip.actualDelivery,
        deliveredBy: trip.deliveredBy,
        deliveredByName: trip.deliveredByName,
        isBatch: true,
        proofOfDelivery: {
          signature: trip.proofOfDelivery?.signature,
          gpsLocation: trip.proofOfDelivery?.gpsLocation,
          capturedAt: trip.proofOfDelivery?.capturedAt,
        }
      };

      if (trip.jobCards && trip.proofOfDelivery?.photos) {
        const index = trip.jobCards.indexOf(req.params.id);
        if (index !== -1 && trip.proofOfDelivery.photos[index]) {
          stage.proofOfDelivery.photo = trip.proofOfDelivery.photos[index];
        }
      }
    } 
    
    // 2. Fallback to DispatchStage (Legacy or Standalone flow)
    if (!stage) {
      stage = await DispatchStage.findOne({ jobCardId: req.params.id }).lean();
    }

    if (!stage) return res.status(404).json({ success: false, message: 'Dispatch information not found' });
    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/dispatch — Schedule delivery */
export const scheduleDispatch = async (req, res, next) => {
  try {
    const { scheduledDate, timeSlot, deliveryTeam, itemsDispatched } = req.body;

    const jobCard = await JobCard.findById(req.params.id);
    if (jobCard?.deliveryTripId) {
      return res.status(400).json({ 
        success: false, 
        message: 'This Job Card is part of a Batch Delivery Trip. Please manage scheduling through the Global Dispatch Hub.' 
      });
    }

    const stage = await DispatchStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { scheduledDate, timeSlot, deliveryTeam, itemsDispatched, status: 'scheduled' },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'Dispatch stage not found' });

    // Notify client directly (not group) via WhatsApp
    /* WhatsApp notification disabled
    /* WhatsApp notification disabled
    const jobCardWithClient = await JobCard.findById(req.params.id).populate('clientId', 'whatsappNumber name').lean();
    if (jobCardWithClient?.clientId?.whatsappNumber) {
      await sendWhatsApp(
        jobCardWithClient.clientId.whatsappNumber,
        WA_TEMPLATES.DELIVERY_SCHEDULED,
        [
          jobCard.jobCardNumber,
          new Date(scheduledDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
          timeSlot,
          'N/A', // Vehicle No (legacy template expects something)
          deliveryTeam?.[0]?.name || 'N/A',
        ]
      );
    }
    */

    // Update JC status
    await JobCard.findByIdAndUpdate(req.params.id, {
      status: 'dispatched',
      $push: { activityLog: { action: 'dispatched', doneBy: req.user.userId, prevStatus: 'qc_passed', newStatus: 'dispatched', timestamp: new Date() } },
    });

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: req.params.id,
      resourceLabel: req.params.id,
      changes: { status: { from: 'qc_passed', to: 'dispatched' } },
      metadata: { action: 'dispatch_scheduled', scheduledDate, driver: deliveryTeam?.[0]?.name },
    });

    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/dispatch/deliver — Capture POD + mark delivered */
export const markDelivered = async (req, res, next) => {
  try {
    const { gpsLocation, clientSignature, podPhotoUrl, deliveredByName } = req.body;

    const jobCard = await JobCard.findById(req.params.id);
    if (jobCard?.deliveryTripId) {
      return res.status(400).json({ 
        success: false, 
        message: 'This Job Card is part of a Batch Delivery Trip. Please capture proof and mark as delivered through the Global Dispatch Hub.' 
      });
    }

    // Upload POD photo if attached (fallback for direct uploads)
    let finalPodPhoto = podPhotoUrl || null;
    if (req.file) {
      const { url } = await uploadReqFile(req, `${req.user.companyId}/pod`);
      finalPodPhoto = url;
    }

    const updateData = {
      status: 'delivered',
      deliveredBy: req.user.userId,
      deliveredByName: deliveredByName || null,
      deliveredAt: new Date(),
      'proofOfDelivery.gpsLocation': gpsLocation || null,
      'proofOfDelivery.signature': clientSignature || null,
      'proofOfDelivery.capturedAt': new Date(),
    };

    if (finalPodPhoto) {
      updateData['proofOfDelivery.photo'] = finalPodPhoto;
    }

    const stage = await DispatchStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { $set: updateData },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'Dispatch stage not found' });

    await JobCard.findByIdAndUpdate(req.params.id, {
      status: 'delivered',
      actualDelivery: new Date(),
      $push: { activityLog: { action: 'delivered', doneBy: req.user.userId, prevStatus: 'dispatched', newStatus: 'delivered', timestamp: new Date() } },
    });

    // Notify group + client
    // Notify group + client
    const jobCardWithClient = await JobCard.findById(req.params.id).populate('clientId', 'whatsappNumber').lean();
    
    // Safety fallback: Default to JobCard's designated company, preventing cross-company broadcast leaks from dispatched user context
    const targetCompanyId = jobCardWithClient?.companyId || req.user.companyId;

    emitJobCardStatus(targetCompanyId.toString(), { jobCardId: req.params.id, status: 'delivered', jobCardNumber: jobCardWithClient?.jobCardNumber || req.params.id });
    /* WhatsApp to Client disabled
    if (jobCardWithClient?.clientId?.whatsappNumber) {
      await sendWhatsApp(jobCardWithClient.clientId.whatsappNumber, WA_TEMPLATES.JOB_DELIVERED, [jobCardWithClient.jobCardNumber]);
    }
    */

    // Notify admins and sales team in-app at target company
    const notifyStaff = await User.find({
      companyId: targetCompanyId,
      role: { $in: ['master_admin', 'super_admin', 'admin', 'sales'] },
      isActive: true
    }, '_id');

    if (notifyStaff.length > 0) {
      const notifications = notifyStaff.map(u => ({
        companyId: targetCompanyId,
        recipientId: u._id,
        jobCardId: req.params.id,
        type: 'delivered',
        title: 'Delivery Completed',
        message: `Job Card ${jobCardWithClient?.jobCardNumber || req.params.id} has been successfully delivered.`,
        channel: 'in_app'
      }));
      const inserted = await Notification.insertMany(notifications);
      inserted.forEach(n => emitNotification(targetCompanyId.toString(), n));
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: req.params.id,
      resourceLabel: jobCardWithClient?.jobCardNumber || req.params.id,
      changes: { status: { from: 'dispatched', to: 'delivered' } },
      metadata: { action: 'delivered', podPhoto: !!podPhotoUrl, gpsLocation: !!gpsLocation },
    });

    res.status(200).json({ success: true, data: stage, message: 'Delivered! Admin: please proceed to billing.' });
  } catch (err) { next(err); }
};
