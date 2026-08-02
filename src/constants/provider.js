export const PROVIDER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
});

export const PROVIDER_CODES = Object.freeze({
  MROBOTICS: 'MROBOTICS',
});

// MRobotics provider response status codes (placeholders — update when official docs are available)
export const MROBOTICS_STATUS = Object.freeze({
  SUCCESS: '1',
  PENDING: '2',
  FAILED: '3',
  REFUNDED: '4',
  DUPLICATE: '5',
  INVALID: '6',
  TIMEOUT: '7',
  INSUFFICIENT_BALANCE: '8',
});

// Map provider status → internal transaction status
export const MROBOTICS_STATUS_MAP = Object.freeze({
  [MROBOTICS_STATUS.SUCCESS]: 'SUCCESS',
  [MROBOTICS_STATUS.PENDING]: 'PENDING',
  [MROBOTICS_STATUS.FAILED]: 'FAILED',
  [MROBOTICS_STATUS.REFUNDED]: 'REFUNDED',
  [MROBOTICS_STATUS.DUPLICATE]: 'SUCCESS',
  [MROBOTICS_STATUS.INVALID]: 'FAILED',
  [MROBOTICS_STATUS.TIMEOUT]: 'TIMEOUT',
  [MROBOTICS_STATUS.INSUFFICIENT_BALANCE]: 'FAILED',
});
