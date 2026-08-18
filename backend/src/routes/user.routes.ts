// user.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER, Role.TEAM_LEADER), async (req, res, next) => {
  try {
    const { role, isActive, search } = req.query;
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, avatar: true, teamLeader: { select: { name: true } }, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) { next(error); }
});

router.post('/', authorize(Role.ADMIN, Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { name, email, phone, role, password, teamLeaderId } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, phone, role, password: hashed, teamLeaderId },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json(user);
  } catch (error) { next(error); }
});

router.put('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { password, ...data } = req.body;
    const updateData: Record<string, unknown> = { ...data };
    if (password) updateData.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json(user);
  } catch (error) { next(error); }
});

router.delete('/:id', authorize(Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'User deactivated' });
  } catch (error) { next(error); }
});

export default router;
