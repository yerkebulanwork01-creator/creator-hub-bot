import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret';

/** JWT токен құру */
export function createToken(user) {
  return jwt.sign(
    { userId: user.id, telegramId: Number(user.telegramId), role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/** JWT тексеру middleware */
export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен жоқ' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Токен жарамсыз' });
  }
}

/** Админ рұқсаты */
export function adminRequired(req, res, next) {
  if (!['ADMIN', 'SUPERADMIN'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Админ рұқсаты қажет' });
  }
  next();
}

/** Суперадмин рұқсаты */
export function superadminRequired(req, res, next) {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Суперадмин рұқсаты қажет' });
  }
  next();
}
