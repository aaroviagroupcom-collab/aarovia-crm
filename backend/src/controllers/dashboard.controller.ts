import { Response, NextFunction } from 'express';
import { Role, LeadStatus, InventoryStatus } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { hasMinRole } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { fromDate, toDate } = req.query;

    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.gte = new Date(fromDate as string);
    if (toDate) dateFilter.lte = new Date(toDate as string);

    const leadWhere: Record<string, unknown> = {};
    if (fromDate || toDate) leadWhere.createdAt = dateFilter;

    // Scope by role
    if (user.role === Role.SALES_EXECUTIVE) {
      leadWhere.assignedTo = user.id;
    } else if (user.role === Role.TEAM_LEADER) {
      const members = await prisma.user.findMany({ where: { teamLeaderId: user.id }, select: { id: true } });
      leadWhere.assignedTo = { in: [user.id, ...members.map((m) => m.id)] };
    }

    const [
      totalLeads, newLeads, followupLeads, qualifiedLeads,
      siteVisitFixed, siteVisitDone, opportunities, bookings,
      inventoryStats, collections, dueAmount, recentBookings,
      leadsBySource, executivePerformance,
    ] = await Promise.all([
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.FOLLOWUP } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.QUALIFIED } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.SITE_VISIT_FIXED } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.SITE_VISIT_DONE } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.OPPORTUNITY } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.BOOKED } }),
      prisma.inventory.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.collection.aggregate({ _sum: { amount: true } }),
      prisma.booking.aggregate({ _sum: { dueAmount: true } }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { customerName: true } }, inventory: { select: { unitNumber: true } } },
      }),
      prisma.lead.groupBy({ by: ['source'], _count: { id: true }, where: leadWhere }),
      hasMinRole(user.role, Role.SALES_MANAGER)
        ? prisma.user.findMany({
            where: { role: { in: [Role.SALES_EXECUTIVE, Role.CHANNEL_PARTNER] }, isActive: true },
            select: {
              id: true, name: true,
              _count: { select: { leads: { where: { status: LeadStatus.BOOKED } } } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Funnel data
    const funnelStatuses = [
      LeadStatus.NEW, LeadStatus.FOLLOWUP, LeadStatus.INTERESTED, LeadStatus.QUALIFIED,
      LeadStatus.SITE_VISIT_FIXED, LeadStatus.SITE_VISIT_DONE, LeadStatus.OPPORTUNITY, LeadStatus.BOOKED,
    ];
    const funnelData = await Promise.all(
      funnelStatuses.map(async (status) => ({
        status,
        count: await prisma.lead.count({ where: { ...leadWhere, status } }),
      }))
    );

    // Monthly booking trend (last 12 months)
    const bookingTrend = await prisma.$queryRaw<{ month: string; count: number; revenue: number }[]>`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count,
        SUM(booking_amount) as revenue
      FROM bookings
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;

    const inventoryMap = inventoryStats.reduce((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      widgets: {
        totalLeads,
        newLeads,
        followupLeads,
        qualifiedLeads,
        siteVisitFixed,
        siteVisitDone,
        opportunities,
        bookings,
        collections: collections._sum.amount || 0,
        duePayments: dueAmount._sum.dueAmount || 0,
        inventoryAvailable: inventoryMap[InventoryStatus.AVAILABLE] || 0,
        inventoryBlocked: inventoryMap[InventoryStatus.BLOCKED] || 0,
        inventorySold: inventoryMap[InventoryStatus.SOLD] || 0,
      },
      charts: {
        leadsBySource,
        salesFunnel: funnelData,
        bookingTrend,
        executivePerformance,
        inventoryStatus: inventoryMap,
      },
      recentBookings,
    });
  } catch (error) {
    next(error);
  }
};
