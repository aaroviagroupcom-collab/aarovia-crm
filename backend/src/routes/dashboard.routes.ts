import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';
import { LeadStatus, InventoryStatus } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', getDashboardStats);

// Sub-routes that return slices of the dashboard data
router.get('/booking-trend', async (req, res, next) => {
  try {
    const data = await prisma.$queryRaw<{ month: string; bookings: number; revenue: number }[]>`
      SELECT
        TO_CHAR(created_at, 'Mon YY') as month,
        COUNT(*)::int as bookings,
        COALESCE(SUM(booking_amount), 0)::float as revenue
      FROM bookings
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon YY')
      ORDER BY MIN(created_at) ASC
    `;
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/lead-sources', async (_req, res, next) => {
  try {
    const data = await prisma.lead.groupBy({ by: ['source'], _count: { id: true } });
    res.json(data.map((d) => ({ source: d.source, count: d._count.id })));
  } catch (error) { next(error); }
});

router.get('/sales-funnel', async (_req, res, next) => {
  try {
    const statuses = [
      LeadStatus.NEW, LeadStatus.FOLLOWUP, LeadStatus.INTERESTED, LeadStatus.QUALIFIED,
      LeadStatus.SITE_VISIT_FIXED, LeadStatus.SITE_VISIT_DONE, LeadStatus.OPPORTUNITY, LeadStatus.BOOKED,
    ];
    const data = await Promise.all(
      statuses.map(async (status) => ({ status, count: await prisma.lead.count({ where: { status } }) }))
    );
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/executive-performance', async (_req, res, next) => {
  try {
    const data = await prisma.user.findMany({
      where: { role: { in: ['SALES_EXECUTIVE', 'TEAM_LEADER'] }, isActive: true },
      select: {
        name: true,
        _count: { select: { leads: true } },
      },
    });
    // Get booking counts separately
    const result = await Promise.all(
      data.map(async (u) => {
        const bookingCount = await prisma.booking.count({
          where: { lead: { assignedToId: (await prisma.user.findFirst({ where: { name: u.name }, select: { id: true } }))?.id } },
        });
        return { name: u.name, leads: u._count.leads, bookings: bookingCount, revenue: 0 };
      })
    );
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/inventory-status', async (_req, res, next) => {
  try {
    const grouped = await prisma.inventory.groupBy({ by: ['status'], _count: { id: true } });
    const total = grouped.reduce((sum, g) => sum + g._count.id, 0);
    res.json(grouped.map((g) => ({
      status: g.status,
      count: g._count.id,
      percentage: total > 0 ? (g._count.id / total) * 100 : 0,
    })));
  } catch (error) { next(error); }
});

export default router;
