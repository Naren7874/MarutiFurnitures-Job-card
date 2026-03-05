import { Inventory } from '../models/Inventory.js';

// ── POST /api/inventory ──────────────────────────────────────────────────────

export const createItem = async (req, res, next) => {
  try {
    const item = await Inventory.create({ ...req.body, companyId: req.user.companyId, updatedBy: req.user.userId });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

// ── GET /api/inventory ───────────────────────────────────────────────────────

export const getInventory = async (req, res, next) => {
  try {
    const { category, lowStock, search, page = 1, limit = 30 } = req.query;
    const filter = { ...req.companyFilter };
    if (category) filter.category = category;
    if (lowStock === 'true') filter.lowStockAlert = true;
    if (search) filter.itemName = new RegExp(search, 'i');

    const [items, total] = await Promise.all([
      Inventory.find(filter).sort({ itemName: 1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      Inventory.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, data: items, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ── GET /api/inventory/:id ───────────────────────────────────────────────────

export const getItemById = async (req, res, next) => {
  try {
    const item = await Inventory.findOne({ _id: req.params.id, ...req.companyFilter }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.status(200).json({ success: true, data: item });
  } catch (err) { next(err); }
};

// ── PUT /api/inventory/:id ───────────────────────────────────────────────────

export const updateItem = async (req, res, next) => {
  try {
    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { ...req.body, updatedBy: req.user.userId },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Auto-set lowStockAlert
    if (item.currentStock <= item.minStock) {
      await Inventory.findByIdAndUpdate(item._id, { lowStockAlert: true });
    }

    res.status(200).json({ success: true, data: item });
  } catch (err) { next(err); }
};

// ── PATCH /api/inventory/:id/restock — Add stock ────────────────────────────

export const restockItem = async (req, res, next) => {
  try {
    const { qty } = req.body;
    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { $inc: { currentStock: qty }, lowStockAlert: false, updatedBy: req.user.userId },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Re-check low stock
    if (item.currentStock <= item.minStock) {
      await Inventory.findByIdAndUpdate(item._id, { lowStockAlert: true });
    }

    res.status(200).json({ success: true, data: item });
  } catch (err) { next(err); }
};
