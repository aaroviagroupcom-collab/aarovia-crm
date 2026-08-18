import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuotationType, QuotationStatus, Role } from '@prisma/client';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activity.service';
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

const milestoneSchema = z.object({
  name: z.string(),
  percentage: z.number().min(0).max(100),
  amount: z.number(),
  dueDate: z.string().datetime().optional(),
});

const quotationSchema = z.object({
  leadId: z.string(),
  inventoryId: z.string().optional(),
  projectId: z.string(),
  type: z.nativeEnum(QuotationType),
  area: z.number().positive(),
  rate: z.number().positive(),
  plcAmount: z.number().optional(),
  gstPercent: z.number().optional(),
  discount: z.number().optional(),
  validUntil: z.string().datetime().optional(),
  milestones: z.array(milestoneSchema).optional(),
});

function calculateQuotation(data: z.infer<typeof quotationSchema>) {
  const basicCost = data.area * data.rate;
  const plcAmount = data.plcAmount || 0;
  const subtotal = basicCost + plcAmount;
  const gstAmount = data.gstPercent ? (subtotal * data.gstPercent) / 100 : 0;
  const discount = data.discount || 0;
  const finalCost = subtotal + gstAmount - discount;
  return { basicCost, plcAmount, gstAmount, discount, finalCost };
}

export const getQuotations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { leadId, status, projectId, page = '1', limit = '20' } = req.query;
    const where: Record<string, unknown> = {};
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { customerName: true, mobile: true } },
          inventory: { select: { unitNumber: true, block: true } },
          project: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({ quotations, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) {
    next(error);
  }
};

export const createQuotation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = quotationSchema.parse(req.body);
    const { basicCost, plcAmount, gstAmount, discount, finalCost } = calculateQuotation(data);

    const quotationNo = `QT-${Date.now()}`;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNo,
        leadId: data.leadId,
        inventoryId: data.inventoryId,
        projectId: data.projectId,
        type: data.type,
        area: data.area,
        rate: data.rate,
        basicCost,
        plcAmount,
        gstAmount,
        discount,
        finalCost,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        createdById: req.user!.id,
        milestones: data.milestones ? {
          create: data.milestones.map((m) => ({
            name: m.name,
            percentage: m.percentage,
            amount: m.amount,
            dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
          })),
        } : undefined,
      },
      include: { milestones: true, lead: { select: { customerName: true } }, project: { select: { name: true } } },
    });

    await logActivity(req.user!.id, 'CREATE_QUOTATION', 'QUOTATION', quotation.id, { quotationNo });
    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
};

export const approveQuotation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { action, notes } = req.body; // 'approve' or 'reject'

    const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!quotation) throw new AppError('Quotation not found', 404);

    let newStatus: QuotationStatus;
    if (action === 'approve') {
      if (user.role === Role.SALES_MANAGER && quotation.status === QuotationStatus.PENDING_MANAGER) {
        newStatus = QuotationStatus.PENDING_ADMIN;
      } else if ((user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) && quotation.status === QuotationStatus.PENDING_ADMIN) {
        newStatus = QuotationStatus.APPROVED;
      } else {
        throw new AppError('Cannot approve at this stage', 400);
      }
    } else {
      newStatus = QuotationStatus.REJECTED;
    }

    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        approvedById: action === 'approve' ? user.id : undefined,
        approvedAt: action === 'approve' ? new Date() : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const generateQuotationPDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        project: true,
        inventory: true,
        milestones: true,
        createdBy: { select: { name: true } },
      },
    });

    if (!quotation) throw new AppError('Quotation not found', 404);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('AAROVIA PROPERTIES', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Enterprise Real Estate', { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).font('Helvetica-Bold').text('QUOTATION', { align: 'center' });
      doc.moveDown();

      // Quotation details
      doc.fontSize(10).font('Helvetica');
      doc.text(`Quotation No: ${quotation.quotationNo}`);
      doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-IN')}`);
      doc.text(`Valid Until: ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-IN') : 'N/A'}`);
      doc.moveDown();

      // Customer details
      doc.font('Helvetica-Bold').text('CUSTOMER DETAILS');
      doc.font('Helvetica');
      doc.text(`Name: ${quotation.lead.customerName}`);
      doc.text(`Mobile: ${quotation.lead.mobile}`);
      if (quotation.lead.email) doc.text(`Email: ${quotation.lead.email}`);
      doc.moveDown();

      // Property details
      doc.font('Helvetica-Bold').text('PROPERTY DETAILS');
      doc.font('Helvetica');
      doc.text(`Project: ${quotation.project.name}`);
      if (quotation.inventory) {
        doc.text(`Unit: ${quotation.inventory.unitNumber}`);
        if (quotation.inventory.block) doc.text(`Block/Tower: ${quotation.inventory.block}`);
        doc.text(`Floor: ${quotation.inventory.floor || 'N/A'}`);
      }
      doc.text(`Type: ${quotation.type}`);
      doc.text(`Area: ${quotation.area} sq.ft.`);
      doc.moveDown();

      // Cost breakup
      doc.font('Helvetica-Bold').text('COST BREAKUP');
      const tableY = doc.y;
      const col1 = 50, col2 = 350;
      doc.font('Helvetica');
      const rows = [
        ['Rate per sq.ft.', `₹ ${Number(quotation.rate).toLocaleString('en-IN')}`],
        ['Basic Cost', `₹ ${Number(quotation.basicCost).toLocaleString('en-IN')}`],
        ['PLC', `₹ ${Number(quotation.plcAmount || 0).toLocaleString('en-IN')}`],
        ['GST', `₹ ${Number(quotation.gstAmount || 0).toLocaleString('en-IN')}`],
        ['Discount', `- ₹ ${Number(quotation.discount || 0).toLocaleString('en-IN')}`],
      ];
      rows.forEach(([label, value], i) => {
        doc.text(label, col1, tableY + i * 20);
        doc.text(value, col2, tableY + i * 20, { width: 150, align: 'right' });
      });
      doc.moveDown(rows.length + 1);
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('TOTAL AMOUNT', col1);
      doc.text(`₹ ${Number(quotation.finalCost).toLocaleString('en-IN')}`, col2, doc.y - 15, { width: 150, align: 'right' });
      doc.moveDown();

      // Payment milestones
      if (quotation.milestones.length > 0) {
        doc.font('Helvetica-Bold').fontSize(10).text('PAYMENT SCHEDULE');
        doc.font('Helvetica');
        quotation.milestones.forEach((m) => {
          doc.text(`${m.name}: ${m.percentage}% = ₹ ${Number(m.amount).toLocaleString('en-IN')}`);
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').text('This quotation is subject to terms and conditions. Prices are subject to change without notice.', { align: 'center' });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(buffers);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=quotation-${quotation.quotationNo}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
