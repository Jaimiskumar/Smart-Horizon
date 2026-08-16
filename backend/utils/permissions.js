export const PERMISSIONS_BY_ROLE = {
  admin: [
    'traffic:read',
    'traffic:update',
    'traffic:manual-control',
    'parking:read',
    'parking:book',
    'parking:release:any',
    'parking:send-alert',
    'fine:read',
    'fine:issue',
    'fine:cancel',
    'fine:pay:any',
    'emergency:read',
    'emergency:activate',
    'emergency:complete',
    'payment:create:any',
    'payment:view:any',
    'audit:read',
    'admin:read',
    'road-issues:read',
    'road-issues:write'
  ],
  citizen: [
    'traffic:read',
    'road-issues:read',
    'parking:read',
    'parking:book',
    'parking:release:own',
    'fine:read:own',
    'fine:pay:own',
    'emergency:read',
    'payment:create:own',
    'payment:view:own'
  ]
};

export function getPermissionsForRole(role) {
  return PERMISSIONS_BY_ROLE[role] || [];
}
