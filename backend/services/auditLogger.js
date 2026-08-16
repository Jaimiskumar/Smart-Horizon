import AuditLog from '../models/AuditLog.js';

export async function logAudit({
  req,
  action,
  resourceType,
  resourceId,
  status = 'success',
  metadata
}) {
  try {
    await AuditLog.create({
      actorUserId: req.user?.userId,
      actorRole: req.user?.role,
      action,
      resourceType,
      resourceId,
      status,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
}
