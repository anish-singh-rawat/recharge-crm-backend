import { ProviderError } from '../../../helpers/error.helper.js';

export class MRoboticsError extends ProviderError {
  constructor(message, code = null, isRetryable = false, rawResponse = null) {
    super(message);
    this.name = 'MRoboticsError';
    this.providerCode = code;
    this.isRetryable = isRetryable;
    this.rawResponse = rawResponse;
  }
}

export class MRoboticsAuthError extends MRoboticsError {
  constructor(message = 'MRobotics authentication failed') {
    super(message, 'AUTH_FAILED', false);
    this.name = 'MRoboticsAuthError';
  }
}

export class MRoboticsTimeoutError extends MRoboticsError {
  constructor(message = 'MRobotics request timed out') {
    super(message, 'TIMEOUT', true);
    this.name = 'MRoboticsTimeoutError';
  }
}

export class MRoboticsInsufficientBalanceError extends MRoboticsError {
  constructor(message = 'Insufficient balance in MRobotics account') {
    super(message, 'INSUFFICIENT_BALANCE', false);
    this.name = 'MRoboticsInsufficientBalanceError';
  }
}

export class MRoboticsInvalidRequestError extends MRoboticsError {
  constructor(message = 'Invalid request to MRobotics', rawResponse = null) {
    super(message, 'INVALID_REQUEST', false, rawResponse);
    this.name = 'MRoboticsInvalidRequestError';
  }
}

export class MRoboticsDuplicateError extends MRoboticsError {
  constructor(message = 'Duplicate transaction in MRobotics', rawResponse = null) {
    super(message, 'DUPLICATE', false, rawResponse);
    this.name = 'MRoboticsDuplicateError';
  }
}
