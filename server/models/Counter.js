import mongoose from "mongoose";
/* ─────────────────────────────────────────
   COUNTER
   Auto-number generator — one doc per
   company per document type
   Key format: "{companyId}_{type}"
───────────────────────────────────────── */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },                 // e.g. "mf001_quotation"
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model("Counter", counterSchema);

/*
  Usage in utils/autoNumber.js:
  ─────────────────────────────
  import { Counter } from "../models/Invoice.model.js";

  export const getNextSequence = async (companyId, type) => {
    const key = `${companyId}_${type}`;
    const counter = await Counter.findByIdAndUpdate(
      key,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return counter.seq;
  };

  // Quotation:  MF-311025-01  → prefix + DDMMYY + seq
  // Job Card:   MF-26-011     → prefix + YY + seq
  // Invoice:    MF-INV-2026-001 → prefix + YYYY + seq
  // Project:    MF-PRJ-2026-001 → prefix + YYYY + seq
*/