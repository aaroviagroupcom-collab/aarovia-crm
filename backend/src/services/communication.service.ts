import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path?: string; content?: Buffer; contentType?: string }[];
  from?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; messageId?: string }> => {
  try {
    const info = await transporter.sendMail({
      from: options.from || `"Aarovia Properties" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    logger.info(`Email sent: ${info.messageId} to ${options.to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email send error:', error);
    return { success: false };
  }
};

export const sendWhatsAppMessage = async (
  phone: string,
  templateName: string,
  components: object[] = []
): Promise<{ success: boolean; messageId?: string }> => {
  try {
    const phoneNumber = phone.startsWith('+') ? phone : `+91${phone}`;
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components,
          },
        }),
      }
    );

    const data = await response.json() as { messages?: { id: string }[]; error?: object };
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    logger.error('WhatsApp API error:', data.error);
    return { success: false };
  } catch (error) {
    logger.error('WhatsApp send error:', error);
    return { success: false };
  }
};

export const sendWhatsAppText = async (
  phone: string,
  message: string
): Promise<{ success: boolean }> => {
  try {
    const phoneNumber = phone.startsWith('+') ? phone : `+91${phone}`;
    await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    return { success: true };
  } catch (error) {
    logger.error('WhatsApp text error:', error);
    return { success: false };
  }
};

export const EMAIL_TEMPLATES = {
  introduction: (name: string, projectName: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center;">
        <h1 style="color: #gold; color: #FFD700; margin: 0;">AAROVIA PROPERTIES</h1>
      </div>
      <div style="padding: 30px; background: #fff;">
        <p>Dear <strong>${name}</strong>,</p>
        <p>Thank you for your interest in <strong>${projectName}</strong>. We are delighted to present you with an exclusive opportunity to be a part of this exceptional development.</p>
        <p>Our team will get in touch with you shortly to provide more details and arrange a personalized consultation.</p>
        <p>Best Regards,<br><strong>Aarovia Properties Team</strong></p>
      </div>
    </div>
  `,

  siteVisitInvitation: (name: string, projectName: string, date: string, time: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0;">AAROVIA PROPERTIES</h1>
      </div>
      <div style="padding: 30px; background: #fff;">
        <p>Dear <strong>${name}</strong>,</p>
        <p>We are pleased to invite you for a <strong>Site Visit</strong> at <strong>${projectName}</strong>.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>Our representative will be available to guide you through the project. We look forward to seeing you!</p>
        <p>Best Regards,<br><strong>Aarovia Properties Team</strong></p>
      </div>
    </div>
  `,

  paymentReminder: (name: string, amount: number, dueDate: string, receiptNo: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0;">AAROVIA PROPERTIES</h1>
      </div>
      <div style="padding: 30px; background: #fff;">
        <p>Dear <strong>${name}</strong>,</p>
        <p>This is a friendly reminder about your pending payment.</p>
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> ₹ ${amount.toLocaleString('en-IN')}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          <p><strong>Reference:</strong> ${receiptNo}</p>
        </div>
        <p>Please make the payment at your earliest convenience. For any queries, contact us.</p>
        <p>Best Regards,<br><strong>Aarovia Properties Accounts Team</strong></p>
      </div>
    </div>
  `,
};
