import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Role, InventoryStatus } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  getQuotations, createQuotation, approveQuotation, generateQuotationPDF,
} from '../controllers/quotation.controller';
import {
  getBookings, getBooking, createBooking, updateBookingStage, generateBookingReceipt,
} from '../controllers/booking.controller';

// =================== PROJECT ROUTES ===================
export const projectRouter = Router();
projectRouter.use(authenticate);

projectRouter.get('/', async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { isActive: true },
      include: { _count: { select: { inventory: true, leads: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(projects);
  } catch (error) { next(error); }
});

projectRouter.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        inventory: { orderBy: [{ block: 'asc' }, { unitNumber: 'asc' }] },
        _count: { select: { inventory: true, leads: true, quotations: true } },
      },
    });
    if (!project) throw new AppError('Project not found', 404);
    res.json(project);
  } catch (error) { next(error); }
});

projectRouter.post('/', authorize(Role.ADMIN, Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const project = await prisma.project.create({ data: req.body });
    res.status(201).json(project);
  } catch (error) { next(error); }
});

projectRouter.put('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
    res.json(project);
  } catch (error) { next(error); }
});

projectRouter.delete('/:id', authorize(Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    await prisma.project.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Project deactivated' });
  } catch (error) { next(error); }
});

// =================== INVENTORY ROUTES ===================
export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

inventoryRouter.get('/', async (req, res, next) => {
  try {
    const { projectId, status, type, minArea, maxArea, minRate, maxRate } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (minArea || maxArea) {
      where.area = {};
      if (minArea) (where.area as Record<string, unknown>).gte = parseFloat(minArea as string);
      if (maxArea) (where.area as Record<string, unknown>).lte = parseFloat(maxArea as string);
    }
    const inventory = await prisma.inventory.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: [{ block: 'asc' }, { floor: 'asc' }, { unitNumber: 'asc' }],
    });
    res.json(inventory);
  } catch (error) { next(error); }
});

inventoryRouter.get('/grid/:projectId', async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ block: 'asc' }, { floor: 'desc' }, { unitNumber: 'asc' }],
    });
    // Group by block and floor
    const grid: Record<string, Record<string, typeof inventory>> = {};
    inventory.forEach((unit) => {
      const block = unit.block || 'Main';
      const floor = String(unit.floor || 0);
      if (!grid[block]) grid[block] = {};
      if (!grid[block][floor]) grid[block][floor] = [];
      grid[block][floor].push(unit);
    });
    res.json({ inventory, grid });
  } catch (error) { next(error); }
});

inventoryRouter.post('/', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER), async (req, res, next) => {
  try {
    const unit = await prisma.inventory.create({ data: req.body });
    res.status(201).json(unit);
  } catch (error) { next(error); }
});

inventoryRouter.post('/bulk', authorize(Role.ADMIN, Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { units } = req.body as { units: object[] };
    const created = await prisma.inventory.createMany({ data: units as Parameters<typeof prisma.inventory.createMany>[0]['data'], skipDuplicates: true });
    res.status(201).json({ created: created.count });
  } catch (error) { next(error); }
});

inventoryRouter.put('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER), async (req, res, next) => {
  try {
    const unit = await prisma.inventory.update({ where: { id: req.params.id }, data: req.body });
    res.json(unit);
  } catch (error) { next(error); }
});

inventoryRouter.patch('/:id/status', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER), async (req, res, next) => {
  try {
    const { status } = req.body as { status: InventoryStatus };
    const unit = await prisma.inventory.update({ where: { id: req.params.id }, data: { status } });
    res.json(unit);
  } catch (error) { next(error); }
});

// =================== QUOTATION ROUTES ===================
export const quotationRouter = Router();
quotationRouter.use(authenticate);
quotationRouter.get('/', getQuotations);
quotationRouter.post('/', createQuotation);
quotationRouter.get('/:id/pdf', generateQuotationPDF);
quotationRouter.patch('/:id/approve', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER), approveQuotation);
quotationRouter.get('/:id', async (req, res, next) => {
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { lead: true, project: true, inventory: true, milestones: true, createdBy: { select: { name: true } } },
    });
    if (!q) throw new AppError('Quotation not found', 404);
    res.json(q);
  } catch (error) { next(error); }
});

// =================== BOOKING ROUTES ===================
export const bookingRouter = Router();
bookingRouter.use(authenticate);
bookingRouter.get('/', getBookings);
bookingRouter.post('/', createBooking);
bookingRouter.get('/:id', getBooking);
bookingRouter.patch('/:id/stage', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.POST_SALES_EXECUTIVE), updateBookingStage);
bookingRouter.get('/:id/receipt', generateBookingReceipt);
