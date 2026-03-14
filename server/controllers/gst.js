import { verifyGSTIN, determineGSTType } from '../utils/verifyGST.js';
import Client from '../models/Client.js';

// ── POST /api/gst/verify ─────────────────────────────────────────────────────

export const verifyGST = async (req, res, next) => {
  try {
    const { gstin, clientId } = req.body;

    if (!gstin) {
      return res.status(400).json({ success: false, message: 'GSTIN is required' });
    }

    const gstData = await verifyGSTIN(gstin);

    // Auto-update the client document if clientId provided
    if (clientId) {
      await Client.findOneAndUpdate(
        { _id: clientId, ...req.companyFilter },
        {
          gstin:           gstData.gstin,
          gstVerified:     true,
          gstVerifiedAt:   new Date(),
          gstBusinessName: gstData.legalName,
          gstState:        gstData.stateName,
          gstStatus:       gstData.status,
          taxType:         gstData.taxpayerType?.toLowerCase() === 'composition' ? 'composition' : 'regular',
        }
      );
    }

    auditLog(req, {
      action: 'update',
      resourceType: 'Client',
      resourceId: clientId || undefined,
      resourceLabel: gstin,
      metadata: { action: 'gst_verification', legalName: gstData.legalName, clientId },
    });

    res.status(200).json({ success: true, data: gstData });
  } catch (err) {
    if (err.response?.status === 404 || err.message?.includes('Invalid')) {
      return res.status(400).json({ success: false, message: 'Invalid or unregistered GSTIN' });
    }
    next(err);
  }
};

// ── POST /api/gst/determine-type ─────────────────────────────────────────────
// Determine if transaction is CGST+SGST or IGST based on two GSTINs

export const getGSTType = (req, res) => {
  const { companyGstin, clientGstin } = req.body;
  const type = determineGSTType(companyGstin, clientGstin);
  res.status(200).json({ success: true, gstType: type });
};
