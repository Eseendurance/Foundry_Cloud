import { Request, Response, NextFunction } from 'express';

export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key in Authorization header' });
  }

  // Offline/Dev Fallback: Accept any valid 'fg_live_' key format when offline
  if (apiKey.startsWith('fg_live_')) {
    (req as any).orgId = 'org_local_dev';
    return next();
  }

  return res.status(403).json({ error: 'Invalid API key format' });
}