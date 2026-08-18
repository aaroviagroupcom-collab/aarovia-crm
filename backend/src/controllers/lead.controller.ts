import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LeadStatus, LeadSource, Role } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activity.service';
import { sendFollowupReminder } from '../services/notification.service';
import { hasMinRole } from '../middleware/auth';

const leadSchema = z.object({
  customerName: z.string().min(1),
  mobile: z.string().min(10).max(15),
  alternateMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
  source: z.nativeEnum(LeadSource),
  projectId: z.string().optional(),
  budget: z.number().optional(),
  configuration: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  followupDate: z.string().datetime().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  notes: z.string().optional(),
});

export const getLeads = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1', limit = '20', status, source, assignedTo,
      search, projectId, fromDate, toDate, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const where: Record<string, unknown> = {};

    // Role-based data scoping
    const user = req.user!;
    if (user.role === Role.SALES_EXECUTIVE || user.role === Role.CHANNEL_PARTNER) {
      where.assignedTo = user.id;
    } else if (user.role === Role.TEAM_LEADER) {
      const teamMembers = await prisma.user.findMany({
        where: { teamLeaderId: user.id },
        select: { id: true },
      });
      where.assignedTo = { in: [user.id, ...teamMembers.map((m) => m.id)] };
    }

    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedTo && hasMinRole(user.role, Role.TEAM_LEADER)) where.assignedTo = assignedTo;
    if (projectId) where.projectId = projectId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as Record<string, unknown>).gte = new Date(fromDate as string);
      if (toDate) (where.createdAt as Record<string, unknown>).lte = new Date(toDate as string);
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search as string } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          executive: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { communications: true, callLogs: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        executive: { select: { id: true, name: true, email: true, phone: true } },
        project: true,
        documents: true,
        communications: { orderBy: { sentAt: 'desc' }, take: 20 },
        callLogs: { orderBy: { calledAt: 'desc' }, take: 20, include: { user: { select: { name: true } } } },
        timeline: { orderBy: { createdAt: 'desc' } },
        reminders: { where: { isDone: false }, orderBy: { dueDate: 'asc' } },
        quotations: { orderBy: { createdAt: 'desc' }, include: { inventory: true } },
        bookings: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) throw new AppError('Lead not found', 404);
    res.json(lead);
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = leadSchema.parse(req.body);
    const user = req.user!;

    // Duplicate detection
    const duplicate = await prisma.lead.findFirst({
      where: { mobile: data.mobile, isDuplicate: false },
    });

    const assignedTo = data.assignedTo || (
      user.role === Role.SALES_EXECUTIVE ? user.id : await autoAssignLead()
    );

    const lead = await prisma.lead.create({
      data: {
        ...data,
        budget: data.budget ? data.budget : undefined,
        followupDate: data.followupDate ? new Date(data.followupDate) : undefined,
        assignedTo,
        createdById: user.id,
        isDuplicate: !!duplicate,
      },
      include: {
        executive: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Timeline entry
    await prisma.leadTimeline.create({
      data: {
        leadId: lead.id,
        action: 'LEAD_CREATED',
        description: `Lead created from ${data.source}`,
        newStatus: LeadStatus.NEW,
        createdById: user.id,
      },
    });

    await logActivity(user.id, 'CREATE_LEAD', 'LEAD', lead.id, { source: data.source });

    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = leadSchema.partial().parse(req.body);
    const user = req.user!;

    const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Lead not found', 404);

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...data,
        budget: data.budget !== undefined ? data.budget : undefined,
        followupDate: data.followupDate ? new Date(data.followupDate) : undefined,
      },
      include: {
        executive: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await logActivity(user.id, 'UPDATE_LEAD', 'LEAD', lead.id, { changes: data });
    res.json(lead);
  } catch (error) {
    next(error);
  }
};

export const updateLeadStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, notes } = updateStatusSchema.parse(req.body);
    const user = req.user!;

    const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Lead not found', 404);

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status, notes: notes || existing.notes },
    });

    // Timeline
    await prisma.leadTimeline.create({
      data: {
        leadId: lead.id,
        action: 'STATUS_CHANGED',
        description: notes || `Status changed to ${status}`,
        previousStatus: existing.status,
        newStatus: status,
        createdById: user.id,
      },
    });

    await logActivity(user.id, 'UPDATE_STATUS', 'LEAD', lead.id, { from: existing.status, to: status });
    res.json(lead);
  } catch (error) {
    next(error);
  }
};

export const assignLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.body;

    const executive = await prisma.user.findUnique({ where: { id: assignedTo } });
    if (!executive) throw new AppError('Executive not found', 404);

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { assignedTo },
    });

    await prisma.leadTimeline.create({
      data: {
        leadId: lead.id,
        action: 'REASSIGNED',
        description: `Lead assigned to ${executive.name}`,
        createdById: req.user!.id,
      },
    });

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    await logActivity(req.user!.id, 'DELETE_LEAD', 'LEAD', req.params.id, {});
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    next(error);
  }
};

export const getLeadTimeline = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const timeline = await prisma.leadTimeline.findMany({
      where: { leadId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(timeline);
  } catch (error) {
    next(error);
  }
};

export const mergeLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sourceLeadId, targetLeadId } = req.body;

    const [source, target] = await Promise.all([
      prisma.lead.findUnique({ where: { id: sourceLeadId } }),
      prisma.lead.findUnique({ where: { id: targetLeadId } }),
    ]);

    if (!source || !target) throw new AppError('Lead not found', 404);

    // Move all relations to target
    await prisma.$transaction([
      prisma.communication.updateMany({ where: { leadId: sourceLeadId }, data: { leadId: targetLeadId } }),
      prisma.callLog.updateMany({ where: { leadId: sourceLeadId }, data: { leadId: targetLeadId } }),
      prisma.document.updateMany({ where: { leadId: sourceLeadId }, data: { leadId: targetLeadId } }),
      prisma.leadTimeline.updateMany({ where: { leadId: sourceLeadId }, data: { leadId: targetLeadId } }),
      prisma.lead.update({ where: { id: sourceLeadId }, data: { mergedIntoId: targetLeadId, isDuplicate: true } }),
    ]);

    res.json({ message: 'Leads merged successfully', targetLead: target });
  } catch (error) {
    next(error);
  }
};

export const bulkImportLeads = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { leads } = req.body as { leads: z.infer<typeof leadSchema>[] };
    const user = req.user!;
    let imported = 0, duplicates = 0, errors: string[] = [];

    for (const leadData of leads) {
      try {
        const parsed = leadSchema.parse(leadData);
        const duplicate = await prisma.lead.findFirst({ where: { mobile: parsed.mobile } });

        await prisma.lead.create({
          data: {
            ...parsed,
            budget: parsed.budget ? parsed.budget : undefined,
            followupDate: parsed.followupDate ? new Date(parsed.followupDate) : undefined,
            assignedTo: parsed.assignedTo || user.id,
            createdById: user.id,
            isDuplicate: !!duplicate,
          },
        });
        if (duplicate) duplicates++;
        else imported++;
      } catch {
        errors.push(`Row error: ${leadData.customerName || 'Unknown'}`);
      }
    }

    res.json({ imported, duplicates, errors, total: leads.length });
  } catch (error) {
    next(error);
  }
};

export const createReminder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, dueDate } = req.body;
    const reminder = await prisma.reminder.create({
      data: {
        leadId: req.params.id,
        title,
        description,
        dueDate: new Date(dueDate),
        createdById: req.user!.id,
      },
    });
    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

async function autoAssignLead(): Promise<string | undefined> {
  // Round-robin assignment to active sales executives
  const executives = await prisma.user.findMany({
    where: { role: Role.SALES_EXECUTIVE, isActive: true },
    select: { id: true, _count: { select: { leads: true } } },
    orderBy: { leads: { _count: 'asc' } },
  });
  return executives[0]?.id;
}
