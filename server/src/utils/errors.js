// StoryBuilder error contract helpers (SPEC §7.4).
// Codes: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, EMAIL_EXISTS,
// INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED, OTP_EXPIRED, OTP_TOO_MANY_ATTEMPTS,
// ACCOUNT_ALREADY_LINKED, NOT_CONFIGURED, CONFLICT, RATE_LIMITED,
// DAY_BUDGET_EXCEEDED, AI_UNAVAILABLE, RESUME_EXHAUSTED, STORY_INCOMPLETE,
// HAS_CHILDREN, INVALID_FILE, INTERNAL_ERROR.

export class AppError extends Error {
  constructor(code, message, status = 400, fields) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    if (fields) this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict.', fields) {
    super('CONFLICT', message, 409, fields);
  }
}

export class StoryIncompleteError extends AppError {
  constructor(message = 'This story has no content to export yet.') {
    super('STORY_INCOMPLETE', message, 409);
  }
}

export function errorResponse(err) {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    };
  }
  // Mongo duplicate key → EMAIL_EXISTS
  if (err && err.code === 11000) {
    return {
      status: 409,
      body: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' },
    };
  }
  // Mongoose CastError (malformed/non-castable ObjectId) → 404 NOT_FOUND
  if (err && err.name === 'CastError') {
    return {
      status: 404,
      body: { code: 'NOT_FOUND', message: 'Not found.' },
    };
  }
  // Fallback — never leak internals.
  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
  };
}

export default { AppError, NotFoundError, ConflictError, StoryIncompleteError, errorResponse };
