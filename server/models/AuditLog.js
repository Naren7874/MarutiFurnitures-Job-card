import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * AUDIT LOG
 * Records every business action — who did what, on which resource, at what time.
 * Separate from AccessLog (which only records permission check events).
 *
 * TTL: auto-delete after 2 years (730 days).
 */

const ACTION_ENUM = [
  'create',
  'update',
  'delete',
  'status_change',
  'login',
  'logout',
  'permission_grant',
  'permission_deny',
  'role_change',
  'password_reset',
  'deactivate',
  'activate',
];

const RESOURCE_ENUM = [
  'User',
  'Role',
  'PermissionSet',
  'JobCard',
  'Quotation',
  'Project',
  'Invoice',
  'Client',
  'Inventory',
  'PurchaseOrder',
  // Stage documents
  'ProductionStage',
  'QcStage',
  'DispatchStage',
];

const auditLogSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },

  // Who performed the action (snapshot fields survive user deletion)
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String },
  actorRole: { type: String },

  // What happened
  action: {
    type: String,
    enum: ACTION_ENUM,
    required: true,
    index: true,
  },

  // Which document was affected
  resourceType: { type: String, enum: RESOURCE_ENUM },
  resourceId:   { type: Schema.Types.ObjectId },
  resourceLabel: { type: String }, // Human-readable e.g. "MF-26-011" or "Ramesh Kumar"

  // What changed: { fieldName: { from: old, to: new } }
  changes: { type: Schema.Types.Mixed },

  // Extra context (reason text, notes, etc.)
  metadata: { type: Schema.Types.Mixed },

  // Request context
  ip:        { type: String },
  userAgent: { type: String },

  // createdAt with 2-year TTL (63,072,000 seconds = 730 days)
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 63072000,
  },
});

// Compound indexes for fast dashboard queries
auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, actorId: 1 });
auditLogSchema.index({ companyId: 1, resourceId: 1 });
auditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
