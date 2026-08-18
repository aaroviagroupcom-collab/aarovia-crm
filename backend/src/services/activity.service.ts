import prisma from '../config/database';
import { NotificationType } from '@prisma/client';
import { logger } from '../config/logger';

export const logActivity = async (
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details: object,
  ip?: string
) => {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entity, entityId, details, ip },
    });
  } catch (error) {
    logger.error('Activity log error:', error);
  }
};

export const sendNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: object
) => {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, metadata },
    });
  } catch (error) {
    logger.error('Notification error:', error);
  }
};

export const sendFollowupReminder = async (leadId: string) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { executive: { select: { id: true } } },
    });
    if (!lead?.executive) return;

    await sendNotification(
      lead.executive.id,
      NotificationType.IN_APP,
      'Followup Reminder',
      `Followup due for ${lead.customerName}`,
      { leadId }
    );
  } catch (error) {
    logger.error('Followup reminder error:', error);
  }
};
