import DispatchMember from "../models/DispatchMember.js";

// @desc    Get all dispatch members for a company
// @route   GET /aapi/dispatch-team
// @access  Private
export const getDispatchMembers = async (req, res, next) => {
  try {
    // Return ALL active dispatch members (global pool)
    const members = await DispatchMember.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a new dispatch member
// @route   POST /api/dispatch-team
// @access  Private/Admin
export const createDispatchMember = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Please provide a name" });
    }

    // Check if member already exists
    const existing = await DispatchMember.findOne({
      companyId: req.user.companyId,
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Dispatch member already exists with this name" });
    }

    const member = await DispatchMember.create({
      companyId: req.user.companyId,
      name: name.trim(),
      phone,
      createdBy: req.user.userId, // use userId from req.user
    });

    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a dispatch member
// @route   DELETE /api/dispatch-team/:id
// @access  Private/Admin
export const deleteDispatchMember = async (req, res, next) => {
  try {
    const member = await DispatchMember.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    await member.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
