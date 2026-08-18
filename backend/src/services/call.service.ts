import twilio from 'twilio';
import { logger } from '../config/logger';
import prisma from '../config/database';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const initiateCall = async (
  userId: string,
  leadId: string,
  toPhone: string
): Promise<{ success: boolean; callSid?: string; error?: string }> => {
  try {
    const formattedPhone = toPhone.startsWith('+') ? toPhone : `+91${toPhone}`;
    const agentPhone = process.env.TWILIO_AGENT_PHONE || process.env.TWILIO_PHONE_NUMBER!;

    const call = await client.calls.create({
      to: formattedPhone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: `${process.env.BACKEND_URL}/api/calls/twiml`,
      record: true,
      recordingStatusCallback: `${process.env.BACKEND_URL}/api/calls/recording-callback`,
      statusCallback: `${process.env.BACKEND_URL}/api/calls/status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    // Create call log
    await prisma.callLog.create({
      data: {
        leadId,
        userId,
        callSid: call.sid,
        status: 'INITIATED',
      },
    });

    return { success: true, callSid: call.sid };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Twilio call error:', err);
    return { success: false, error: err.message };
  }
};

export const handleCallStatusCallback = async (callSid: string, status: string, duration?: string) => {
  try {
    const statusMap: Record<string, string> = {
      completed: 'ANSWERED',
      busy: 'BUSY',
      failed: 'MISSED',
      'no-answer': 'MISSED',
    };

    await prisma.callLog.updateMany({
      where: { callSid },
      data: {
        status: statusMap[status] || status.toUpperCase(),
        duration: duration ? parseInt(duration) : undefined,
      },
    });
  } catch (error) {
    logger.error('Call status callback error:', error);
  }
};

export const handleRecordingCallback = async (callSid: string, recordingUrl: string) => {
  try {
    await prisma.callLog.updateMany({
      where: { callSid },
      data: { recording: recordingUrl },
    });
  } catch (error) {
    logger.error('Recording callback error:', error);
  }
};

export const getTwiML = (): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Aarovia Properties. Please hold while we connect you.</Say>
  <Pause length="1"/>
</Response>`;
};
