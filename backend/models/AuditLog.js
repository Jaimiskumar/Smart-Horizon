import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    actorRole: String,
    action: {
      type: String,
      required: true,
      index: true
    },
    resourceType: {
      type: String,
      required: true
    },
    resourceId: String,
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success'
    },
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', auditLogSchema);
