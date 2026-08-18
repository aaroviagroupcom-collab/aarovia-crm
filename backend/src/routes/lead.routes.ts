import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import {
  getLeads, getLead, createLead, updateLead, updateLeadStatus,
  assignLead, deleteLead, getLeadTimeline, mergeLead,
  bulkImportLeads, createReminder,
} from '../controllers/lead.controller';

const router = Router();

router.use(authenticate);

router.get('/', getLeads);
router.post('/', createLead);
router.post('/import', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER), bulkImportLeads);
router.post('/merge', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER), mergeLead);
router.get('/:id', getLead);
router.put('/:id', updateLead);
router.patch('/:id/status', updateLeadStatus);
router.patch('/:id/assign', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.SALES_MANAGER, Role.TEAM_LEADER), assignLead);
router.delete('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN), deleteLead);
router.get('/:id/timeline', getLeadTimeline);
router.post('/:id/reminders', createReminder);

export default router;
