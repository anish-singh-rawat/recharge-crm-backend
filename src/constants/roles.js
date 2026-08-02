export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  RETAILER: 'retailer',
});

export const ROLE_HIERARCHY = Object.freeze({
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 50,
  [ROLES.RETAILER]: 10,
});

export const ALL_ROLES = Object.values(ROLES);
