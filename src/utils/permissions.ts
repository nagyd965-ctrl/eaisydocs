export type UserRole = 
  | 'admin'
  | 'vezeto'
  | 'munkavallalo'
  | 'rendszergazda'
  | 'iktato'
  | 'ugyintezo'
  | 'betekinto'
  | 'auditor'
  | string;

export interface Permissions {
  canViewAll: boolean;
  canEdit: boolean;
  canAssign: boolean;
  canAddIncoming: boolean;
  canManageUsers: boolean;
}

export function getPermissions(
  role?: UserRole | null,
  docsModules?: string[],
  docsWriteModules?: string[],
  moduleKey?: string
): Permissions {
  const currentRole = (role || '').toLowerCase();
  const isAdmin = ['admin', 'rendszergazda'].includes(currentRole);
  const hasExplicitModules = Array.isArray(docsModules) && docsModules.length > 0;
  const hasExplicitWriteModules = Array.isArray(docsWriteModules);
  const writeSet = hasExplicitWriteModules ? new Set(docsWriteModules!) : null;

  const canWriteModule = (key?: string) => {
    if (isAdmin) return true;
    if (!writeSet) return true;
    return key ? writeSet.has(key) : writeSet.size > 0;
  };

  return {
    // Kicsoda láthat mindent korlátozás nélkül?
    canViewAll: ['admin', 'rendszergazda', 'vezeto', 'auditor', 'iktato'].includes(currentRole),

    // Kicsoda hozhat létre, módosíthat vagy törölhet (ABAC és Írás moduljog alapján)?
    canEdit:
      ['admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo'].includes(currentRole) &&
      canWriteModule(moduleKey),

    // Kicsoda oszthat ki ügyiratot (szignálás)?
    canAssign:
      ['admin', 'rendszergazda', 'vezeto', 'iktato'].includes(currentRole) &&
      (canWriteModule('dossiers') || canWriteModule('inbox')),

    // Kicsoda érkeztethet új iratot?
    canAddIncoming:
      ['admin', 'rendszergazda', 'vezeto', 'iktato', 'ugyintezo', 'munkavallalo'].includes(currentRole) &&
      (isAdmin || (!hasExplicitModules || docsModules!.includes('inbox'))) &&
      canWriteModule('inbox'),

    // Kicsoda kezelheti a felhasználókat és a rendszert?
    canManageUsers:
      isAdmin ||
      (hasExplicitModules && docsModules!.includes('settings') && canWriteModule('settings')),
  };
}
