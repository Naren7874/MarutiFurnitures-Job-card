import { DispatchStage } from '../../models/DispatchStage.js';
import JobCard from '../../models/JobCard.js';
import { generateAndUploadPDF } from '../../utils/generatePDF.js';
import { uploadReqFile } from '../../middleware/upload.js';
import { sendWhatsApp, WA_TEMPLATES } from '../../utils/sendWhatsApp.js';
import Client from '../../models/Client.js';
import { auditLog } from '../../utils/auditLogger.js';

/** GET /api/jobcards/:id/dispatch */
export const getDispatch = async (req, res, next) => {
  try {
    const stage = await DispatchStage.findOne({ jobCardId: req.params.id }).lean();
    if (!stage) return res.status(404).json({ success: false, message: 'Dispatch stage not found' });
    res.status(200).json({ success: true, data: stage });
  } catch (err) { next(err); }
};

/** POST /api/jobcards/:id/dispatch — Schedule delivery */
export const scheduleDispatch = async (req, res, next) => {
  try {
    const { scheduledDate, timeSlot, deliveryTeam, vehicle, itemsDispatched } = req.body;

    const stage = await DispatchStage.findOneAndUpdate(
      { jobCardId: req.params.id },
      { scheduledDate, timeSlot, deliveryTeam, vehicle, itemsDispatched, status: 'scheduled' },
      { new: true }
    );
    if (!stage) return res.status(404).json({ success: false, message: 'Dispatch stage not found' });

    // Generate delivery challan PDF
    const challanUrl = await generateAndUploadPDF(
      'challan',
      {
        JC_NUMBER:    req.params.id,
        DATE:         new Date(scheduledDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        TIME_SLOT:    timeSlot,
        VEHICLE:      vehicle?.number || '',
        DRIVER_NAME:  deliveryTeam?.[0]?.name || '',
      },
      `${req.user.companyId}/challans`,
      `challan-${req.params.id}`
    ).catch(() => null);

    if (challanUrl) {
      await DispatchStage.findByIdAndUpdate(stage._id, { challanPDF: challanUrl });
    }

    // Notify client directly (not group) via WhatsApp
    const jobCard = await JobCard.findById(req.params.id).populate('clientId', 'whatsappNumber name').lean();
    if (jobCard?.clientId?.whatsappNumber) {
      await sendWhatsApp(
        jobCard.clientId.whatsappNumber,
        WA_TEMPLATES.DELIVERY_SCHEDULED,
        [
          jobCard.jobCardNumber,
          new Date(scheduledDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
          timeSlot,
          vehicle?.number || 'N/A',
          deliveryTeam?.[0]?.name || 'N/A',
        ]
      );
    }

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
      metadata: { action: 'dispatch_scheduled', scheduledDate, vehicle: vehicle?.number, driver: deliveryTeam?.[0]?.name, challanUrl },
    });

    res.status(200).json({ success: true, data: stage, challanUrl });
  } catch (err) { next(err); }
};

/** PATCH /api/jobcards/:id/dispatch/deliver — Capture POD + mark delivered */
export const markDelivered = async (req, res, next) => {
  try {
    const { gpsLocation, clientSignature, podPhotoUrl } = req.body;

    // Upload POD photo if attached (fallback for direct uploads)
    let finalPodPhoto = podPhotoUrl || null;
    if (req.file) {
      const { url } = await uploadReqFile(req, `${req.user.companyId}/pod`);
      finalPodPhoto = url;
    }

    const updateData = {
      status: 'delivered',
      deliveredBy: req.user.userId,
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
    const jobCard = await JobCard.findById(req.params.id).populate('clientId', 'whatsappNumber').lean();
    if (jobCard?.clientId?.whatsappNumber) {
      await sendWhatsApp(jobCard.clientId.whatsappNumber, WA_TEMPLATES.JOB_DELIVERED, [jobCard.jobCardNumber]);
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'JobCard',
      resourceId: req.params.id,
      resourceLabel: jobCard?.jobCardNumber || req.params.id,
      changes: { status: { from: 'dispatched', to: 'delivered' } },
      metadata: { action: 'delivered', podPhoto: !!podPhotoUrl, gpsLocation: !!gpsLocation },
    });

    res.status(200).json({ success: true, data: stage, message: 'Delivered! Admin: please proceed to billing.' });
  } catch (err) { next(err); }
};
