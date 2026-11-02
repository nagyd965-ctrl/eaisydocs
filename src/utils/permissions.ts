export type UserRole = 
  | 'admin'
  | 'rendszergazda'
  | 'iktato'
  | 'vezeto'
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

export function getPermissions(role?: UserRole | null): Permissions {
  const currentRole = (role || '').toLowerCase();

  return {
    // Kicsoda láthat mindent korlátozás nélkül?
    canViewAll: ['admin', 'rendszergazda', 'auditor', 'iktato'].includes(currentRole),
    
    // Kicsoda hozhat létre, módosíthat vagy törölhet (ABAC alapján szűrve az adatbázisban)?
    canEdit: ['admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo'].includes(currentRole),
    
    // Kicsoda oszthat ki ügyiratot (szignálás)?
    canAssign: ['admin', 'rendszergazda', 'vezeto', 'iktato'].includes(currentRole),
    
    // Kicsoda érkeztethet új iratot?
    canAddIncoming: ['admin', 'rendszergazda', 'iktato'].includes(currentRole),
    
    // Kicsoda kezelheti a felhasználókat és a rendszert?
    canManageUsers: ['admin', 'rendszergazda'].includes(currentRole),
  };
}
