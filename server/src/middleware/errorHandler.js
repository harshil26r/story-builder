import { errorResponse } from '../utils/errors.js';

// Central error handler (SPEC §7.4). Every thrown error maps to one of the
// authoritative codes. No stack traces leak to clients.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, _req, res, _next) {
  const { status, body } = errorResponse(err);
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', status, body.code, err.message);
  }
  return res.status(status).json(body);
}