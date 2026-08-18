import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentMode, BookingStage, InventoryStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activity.service';
import { sendNotification } from '../services/notification.service';

const bookingSchema = z.object({
  leadId: z.string(),
  inventoryId: z.string(),
  quotationId: z.string().optional(),
  bookingAmount: z.number().positive(),
  totalAmount: z.number().positive(),
  paymentMode: z.nativeEnum(PaymentMode),
  bookingDate: z.string().datetime(),
});

export const getBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { stage, projectId, page = '1', limit = '20', search } = req.query;
    const where: Record<string, unknown> = {};
    if (stage) where.stage = stage;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { customerName: true, mobile: true, email: true } },
          inventory: {
            select: { unitNumber: true, block: true, tower: true, area: true, type: true },
            include: { project: { select: { name: true } } },
          },
          _count: { select: { collections: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ bookings, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        inventory: { include: { project: true } },
        quotation: { include: { milestones: true } },
        collections: { orderBy: { paymentDate: 'desc' } },
        demands: { orderBy: { dueDate: 'asc' } },
        invoices: { orderBy: { invoiceDate: 'desc' } },
        documents: true,
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = bookingSchema.parse(req.body);

    // Check inventory availability
    const inventory = await prisma.inventory.findUnique({ where: { id: data.inventoryId } });
    if (!inventory) throw new AppError('Inventory not found', 404);
    if (inventory.status !== InventoryStatus.AVAILABLE && inventory.status !== InventoryStatus.BLOCKED) {
      throw new AppError('Unit is not available for booking', 400);
    }

    const bookingNo = `BK-${Date.now()}`;

    const booking = await prisma.$transaction(async (tx) => {
      // Create booking
      const b = await tx.booking.create({
        data: {
          bookingNo,
          leadId: data.leadId,
          inventoryId: data.inventoryId,
          quotationId: data.quotationId,
          bookingAmount: data.bookingAmount,
          totalAmount: data.totalAmount,
          dueAmount: data.totalAmount - data.bookingAmount,
          paymentMode: data.paymentMode,
          bookingDate: new Date(data.bookingDate),
          collectedAmount: data.bookingAmount,
        },
        include: {
          lead: { select: { customerName: true, mobile: true } },
          inventory: { include: { project: { select: { name: true } } } },
        },
      });

      // Update inventory status
      await tx.inventory.update({
        where: { id: data.inventoryId },
        data: { status: InventoryStatus.SOLD },
      });

      // Update lead status
      await tx.lead.update({
        where: { id: data.leadId },
        data: { status: 'BOOKED' },
      });

      // Record initial collection
      await tx.collection.create({
        data: {
          receiptNo: `RC-${Date.now()}`,
          bookingId: b.id,
          amount: data.bookingAmount,
          paymentMode: data.paymentMode,
          paymentDate: new Date(data.bookingDate),
          notes: 'Booking amount',
          createdById: req.user!.id,
        },
      });

      return b;
    });

    await logActivity(req.user!.id, 'CREATE_BOOKING', 'BOOKING', booking.id, { bookingNo });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

export const updateBookingStage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { stage } = req.body as { stage: BookingStage };

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { stage },
    });

    await logActivity(req.user!.id, 'UPDATE_BOOKING_STAGE', 'BOOKING', booking.id, { stage });
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const generateBookingReceipt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        inventory: { include: { project: true } },
        collections: { orderBy: { paymentDate: 'desc' }, take: 1 },
      },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      doc.fontSize(22).font('Helvetica-Bold').text('AAROVIA PROPERTIES', { align: 'center' });
      doc.fontSize(14).font('Helvetica-Bold').text('BOOKING RECEIPT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica');
      doc.text(`Receipt No: ${booking.bookingNo}`);
      doc.text(`Date: ${new Date(booking.bookingDate).toLocaleDateString('en-IN')}`);
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Customer:');
      doc.font('Helvetica').text(booking.lead.customerName);
      doc.text(booking.lead.mobile);
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Property:');
      doc.font('Helvetica');
      doc.text(`Project: ${booking.inventory.project.name}`);
      doc.text(`Unit: ${booking.inventory.unitNumber}`);
      if (booking.inventory.block) doc.text(`Block: ${booking.inventory.block}`);
      doc.text(`Area: ${booking.inventory.area} sq.ft.`);
      doc.text(`Type: ${booking.inventory.type}`);
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Payment Details:');
      doc.font('Helvetica');
      doc.text(`Booking Amount: ₹ ${Number(booking.bookingAmount).toLocaleString('en-IN')}`);
      doc.text(`Total Amount: ₹ ${Number(booking.totalAmount).toLocaleString('en-IN')}`);
      doc.text(`Collected: ₹ ${Number(booking.collectedAmount).toLocaleString('en-IN')}`);
      doc.text(`Balance Due: ₹ ${Number(booking.dueAmount).toLocaleString('en-IN')}`);
      doc.text(`Payment Mode: ${booking.paymentMode}`);
      doc.moveDown(2);
      doc.text('Authorized Signatory: ___________________');
      doc.moveDown();
      doc.fontSize(8).text('This is a computer generated receipt.', { align: 'center' });
      doc.end();
    });

    const pdfBuffer = Buffer.concat(buffers);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=receipt-${booking.bookingNo}.pdf`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
