import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string; email: string; role: Role; name: string;
    };

    // Verify session exists and not expired
    const session = await prisma.session.findFirst({
      where: { token, userId: decoded.id, expiresAt: { gt: new Date() } },
    });

    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Verify user is still active
    const user = await prisma.user.findFirst({
      where: { id: decoded.id, isActive: true },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Role hierarchy
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 9,
  ADMIN: 8,
  SALES_MANAGER: 7,
  TEAM_LEADER: 6,
  SALES_EXECUTIVE: 5,
  POST_SALES_EXECUTIVE: 4,
  ACCOUNTS: 3,
  MARKETING: 2,
  CHANNEL_PARTNER: 1,
};

export const hasMinRole = (userRole: Role, minRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
};
