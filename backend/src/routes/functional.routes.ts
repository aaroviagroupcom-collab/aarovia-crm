import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Role, PaymentMode } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendEmail, sendWhatsAppMessage, EMAIL_TEMPLATES } from '../services/communication.service';
import { initiateCall, handleCallStatusCallback, handleRecordingCallback, getTwiML } from '../services/call.service';
import { sendNotification } from '../services/activity.service';
import { NotificationType } from '@prisma/client';
import PDFDocument from 'pdfkit';

// =================== COLLECTION ROUTES ===================
export const collectionRouter = Router();
collectionRouter.use(authenticate);

collectionRouter.get('/', async (req, res, next) => {
  try {
    const { bookingId, page = '1', limit = '20' } = req.query;
    const where: Record<string, unknown> = {};
    if (bookingId) where.bookingId = bookingId;
    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy: { paymentDate: 'desc' },
        include: { booking: { include: { lead: { select: { customerName: true } } } } },
      }),
      prisma.collection.count({ where }),
    ]);
    res.json({ collections, total, pages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) { next(error); }
});

collectionRouter.post('/', async (req: any, res, next) => {
  try {
    const { bookingId, amount, paymentMode, transRef, chequeNo, bankName, paymentDate, notes } = req.body;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError('Booking not found', 404);

    const receiptNo = `RC-${Date.now()}`;
    const collection = await prisma.$transaction(async (tx) => {
      const c = await tx.collection.create({
        data: {
          receiptNo, bookingId, amount: parseFloat(amount),
          paymentMode: paymentMode as PaymentMode,
          transRef, chequeNo, bankName,
          paymentDate: new Date(paymentDate),
          notes, createdById: req.user.id,
        },
      });
      const newCollected = Number(booking.collectedAmount) + parseFloat(amount);
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          collectedAmount: newCollected,
          dueAmount: Number(booking.totalAmount) - newCollected,
        },
      });
      return c;
    });

    res.status(201).json(collection);
  } catch (error) { next(error); }
});

// =================== DEMAND ROUTES ===================
export const demandRouter = Router();
demandRouter.use(authenticate);

demandRouter.get('/', async (req, res, next) => {
  try {
    const { bookingId, isPaid } = req.query;
    const where: Record<string, unknown> = {};
    if (bookingId) where.bookingId = bookingId;
    if (isPaid !== undefined) where.isPaid = isPaid === 'true';
    const demands = await prisma.demand.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: { booking: { include: { lead: { select: { customerName: true, mobile: true } } } } },
    });
    res.json(demands);
  } catch (error) { next(error); }
});

demandRouter.post('/', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTS, Role.POST_SALES_EXECUTIVE), async (req, res, next) => {
  try {
    const { bookingId, milestoneName, amount, dueDate } = req.body;
    const demand = await prisma.demand.create({
      data: {
        demandNo: `DM-${Date.now()}`,
        bookingId, milestoneName,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
      },
    });
    res.status(201).json(demand);
  } catch (error) { next(error); }
});

demandRouter.post('/:id/send', async (req: any, res, next) => {
  try {
    const { via } = req.body as { via: string[] }; // ['EMAIL', 'WHATSAPP']
    const demand = await prisma.demand.findUnique({
      where: { id: req.params.id },
      include: { booking: { include: { lead: true } } },
    });
    if (!demand) throw new AppError('Demand not found', 404);

    const sentVia: string[] = [];
    if (via.includes('EMAIL') && demand.booking.lead.email) {
      const html = EMAIL_TEMPLATES.paymentReminder(
        demand.booking.lead.customerName,
        Number(demand.amount),
        new Date(demand.dueDate).toLocaleDateString('en-IN'),
        demand.demandNo
      );
      const result = await sendEmail({ to: demand.booking.lead.email, subject: `Payment Reminder - ${demand.demandNo}`, html });
      if (result.success) sentVia.push('EMAIL');
    }
    if (via.includes('WHATSAPP')) {
      const result = await sendWhatsAppMessage(demand.booking.lead.mobile, 'payment_reminder', [
        { type: 'body', parameters: [
          { type: 'text', text: demand.booking.lead.customerName },
          { type: 'text', text: `₹ ${Number(demand.amount).toLocaleString('en-IN')}` },
          { type: 'text', text: new Date(demand.dueDate).toLocaleDateString('en-IN') },
        ]},
      ]);
      if (result.success) sentVia.push('WHATSAPP');
    }

    await prisma.demand.update({ where: { id: req.params.id }, data: { sentVia } });
    res.json({ message: 'Demand sent', sentVia });
  } catch (error) { next(error); }
});

// =================== INVOICE ROUTES ===================
export const invoiceRouter = Router();
invoiceRouter.use(authenticate);

invoiceRouter.get('/', async (req, res, next) => {
  try {
    const { bookingId, type } = req.query;
    const where: Record<string, unknown> = {};
    if (bookingId) where.bookingId = bookingId;
    if (type) where.type = type;
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: { booking: { include: { lead: { select: { customerName: true } } } } },
    });
    res.json(invoices);
  } catch (error) { next(error); }
});

invoiceRouter.post('/', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTS), async (req, res, next) => {
  try {
    const { bookingId, type, amount, gstAmount } = req.body;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-${Date.now()}`,
        bookingId, type,
        amount: parseFloat(amount),
        gstAmount: gstAmount ? parseFloat(gstAmount) : undefined,
        totalAmount: parseFloat(amount) + (gstAmount ? parseFloat(gstAmount) : 0),
        invoiceDate: new Date(),
      },
    });
    res.status(201).json(invoice);
  } catch (error) { next(error); }
});

// =================== REPORT ROUTES ===================
export const reportRouter = Router();
reportRouter.use(authenticate);

reportRouter.get('/leads', async (req, res, next) => {
  try {
    const { fromDate, toDate, status, source, assignedTo } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedTo) where.assignedTo = assignedTo;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as any).gte = new Date(fromDate as string);
      if (toDate) (where.createdAt as any).lte = new Date(toDate as string);
    }
    const leads = await prisma.lead.findMany({
      where,
      include: {
        executive: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ leads, total: leads.length });
  } catch (error) { next(error); }
});

reportRouter.get('/collections', async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;
    const where: Record<string, unknown> = {};
    if (fromDate || toDate) {
      where.paymentDate = {};
      if (fromDate) (where.paymentDate as any).gte = new Date(fromDate as string);
      if (toDate) (where.paymentDate as any).lte = new Date(toDate as string);
    }
    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: { booking: { include: { lead: { select: { customerName: true } }, inventory: { include: { project: { select: { name: true } } } } } } },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.collection.aggregate({ where, _sum: { amount: true } }),
    ]);
    res.json({ collections, totalAmount: total._sum.amount || 0, count: collections.length });
  } catch (error) { next(error); }
});

reportRouter.get('/inventory', async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    const [inventory, grouped] = await Promise.all([
      prisma.inventory.findMany({ where, include: { project: { select: { name: true } } }, orderBy: { unitNumber: 'asc' } }),
      prisma.inventory.groupBy({ by: ['status', 'projectId'], _count: { id: true } }),
    ]);
    res.json({ inventory, grouped, total: inventory.length });
  } catch (error) { next(error); }
});

// =================== COMMUNICATION ROUTES ===================
export const communicationRouter = Router();
communicationRouter.use(authenticate);

communicationRouter.post('/email', async (req: any, res, next) => {
  try {
    const { leadId, to, subject, html, templateType, attachments } = req.body;
    const result = await sendEmail({ to, subject, html, attachments });
    if (result.success) {
      await prisma.communication.create({
        data: { leadId, type: 'EMAIL', subject, body: html, status: 'SENT', metadata: { messageId: result.messageId, templateType } },
      });
    }
    res.json(result);
  } catch (error) { next(error); }
});

communicationRouter.post('/whatsapp', async (req: any, res, next) => {
  try {
    const { leadId, phone, templateName, components } = req.body;
    const result = await sendWhatsAppMessage(phone, templateName, components);
    if (result.success) {
      await prisma.communication.create({
        data: { leadId, type: 'WHATSAPP', body: templateName, status: 'SENT', metadata: { messageId: result.messageId } },
      });
    }
    res.json(result);
  } catch (error) { next(error); }
});

communicationRouter.get('/lead/:leadId', async (req, res, next) => {
  try {
    const communications = await prisma.communication.findMany({
      where: { leadId: req.params.leadId },
      orderBy: { sentAt: 'desc' },
    });
    res.json(communications);
  } catch (error) { next(error); }
});

// =================== NOTIFICATION ROUTES ===================
export const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.get('/', async (req: any, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ notifications, unreadCount });
  } catch (error) { next(error); }
});

notificationRouter.patch('/read-all', async (req: any, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) { next(error); }
});

notificationRouter.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ message: 'Notification marked as read' });
  } catch (error) { next(error); }
});

// =================== CALL ROUTES ===================
export const callRouter = Router();
callRouter.use(authenticate);

callRouter.post('/initiate', async (req: any, res, next) => {
  try {
    const { leadId, phone } = req.body;
    const result = await initiateCall(req.user.id, leadId, phone);
    res.json(result);
  } catch (error) { next(error); }
});

callRouter.post('/status-callback', async (req, res, next) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    await handleCallStatusCallback(CallSid, CallStatus, CallDuration);
    res.sendStatus(200);
  } catch (error) { next(error); }
});

callRouter.post('/recording-callback', async (req, res, next) => {
  try {
    const { CallSid, RecordingUrl } = req.body;
    await handleRecordingCallback(CallSid, RecordingUrl);
    res.sendStatus(200);
  } catch (error) { next(error); }
});

callRouter.get('/twiml', (_req, res) => {
  res.set('Content-Type', 'text/xml');
  res.send(getTwiML());
});

callRouter.get('/lead/:leadId', async (req, res, next) => {
  try {
    const calls = await prisma.callLog.findMany({
      where: { leadId: req.params.leadId },
      orderBy: { calledAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    res.json(calls);
  } catch (error) { next(error); }
});

callRouter.patch('/:id/notes', async (req, res, next) => {
  try {
    const callLog = await prisma.callLog.update({
      where: { id: req.params.id },
      data: { notes: req.body.notes },
    });
    res.json(callLog);
  } catch (error) { next(error); }
});

// =================== TEMPLATE ROUTES ===================
export const templateRouter = Router();
templateRouter.use(authenticate);

templateRouter.get('/email', async (_req, res, next) => {
  try {
    const templates = await prisma.emailTemplate.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    res.json(templates);
  } catch (error) { next(error); }
});

templateRouter.post('/email', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.MARKETING), async (req, res, next) => {
  try {
    const template = await prisma.emailTemplate.create({ data: req.body });
    res.status(201).json(template);
  } catch (error) { next(error); }
});

templateRouter.put('/email/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.MARKETING), async (req, res, next) => {
  try {
    const template = await prisma.emailTemplate.update({ where: { id: req.params.id }, data: req.body });
    res.json(template);
  } catch (error) { next(error); }
});

templateRouter.get('/whatsapp', async (_req, res, next) => {
  try {
    const templates = await prisma.whatsAppTemplate.findMany({ where: { isActive: true } });
    res.json(templates);
  } catch (error) { next(error); }
});
