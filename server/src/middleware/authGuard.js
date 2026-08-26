import User from '../models/User.js';

// StoryBuilder authGuard (SPEC §3.1) — reads req.session.userId.
// Missing/invalid → 401 UNAUTHORIZED.
// Loads req.user from DB, attaches.
// optionalAuth variant sets req.user=null instead of failing.

export async function authGuard(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    const user = await User.findById(userId).select('-__v');
    if (!user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found.' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid session.' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      req.user = null;
      return next();
    }
    const user = await User.findById(userId).select('-__v');
    req.user = user || null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

export default { authGuard, optionalAuth };