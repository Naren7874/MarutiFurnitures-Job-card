import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Inventory } from '../models/Inventory.js';
import Company from '../models/Company.js';
import { generatePONumber } from '../utils/autoNumber.js';

// ── POST /api/purchase-orders ────────────────────────────────────────────────

export const createPO = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.companyId).lean();
    const poNumber = await generatePONumber(req.user.companyId, company.quotationPrefix);

    // High-value PO threshold: ₹50,000
    const total = req.body.items?.reduce((s, i) => s + (i.qty * i.pricePerUnit), 0) || 0;
    const requiresApproval = total >= 50000;

    const po = await PurchaseOrder.create({
      ...req.body,
      companyId: req.user.companyId,
      poNumber,
      totalAmount: total,
      requiresApproval,
      status: 'raised',
      createdBy: req.user.userId,
    });

    res.status(201).json({ success: true, data: po, requiresApproval });
  } catch (err) { next(err); }
};

// ── GET /api/purchase-orders ─────────────────────────────────────────────────

export const getPOs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { ...req.companyFilter };
    if (status) filter.status = status;

    const [pos, total] = await Promise.all([
      PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      PurchaseOrder.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, data: pos, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ── PATCH /api/purchase-orders/:id/approve ──────────────────────────────────

export const approvePO = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only super_admin can approve POs' });
    }
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { approvedBy: req.user.userId, approvedAt: new Date(), status: 'ordered' },
      { new: true }
    );
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    res.status(200).json({ success: true, data: po });
  } catch (err) { next(err); }
};

// ── PATCH /api/purchase-orders/:id/receive — Mark received + update inventory ──

export const receivePO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

    po.status       = 'received';
    po.receivedDate = new Date();
    await po.save();

    // Update inventory stock for each PO item
    for (const item of po.items) {
      if (item.inventoryId) {
        await Inventory.findByIdAndUpdate(item.inventoryId, {
          $inc: { currentStock: item.qty },
          lowStockAlert: false,
          updatedBy: req.user.userId,
        });
      }
    }

    res.status(200).json({ success: true, data: po });
  } catch (err) { next(err); }
};
