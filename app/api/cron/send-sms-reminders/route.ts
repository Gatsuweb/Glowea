import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { REMINDER_ELIGIBLE_APPOINTMENT_STATUSES } from "../../../../lib/appointmentStatus";
import { getSubscriptionAccessFromTenant } from "../../../../lib/subscription";
import { sendSms } from "../../../../lib/twilio";

const REMINDER_TYPE = "SMS_24H_REMINDER";
const WINDOW_BEFORE_MS = 23.5 * 60 * 60 * 1000;
const WINDOW_AFTER_MS = 24.5 * 60 * 60 * 1000;

export const runtime = "nodejs";

type SkipReason =
  | "PLAN_NOT_ALLOWED"
  | "SMS_REMINDERS_DISABLED"
  | "MISSING_CLIENT_PHONE"
  | "INVALID_PHONE_FORMAT"
  | "ALREADY_SENT"
  | "MISSING_CLIENT"
  | "MISSING_TENANT"
  | "OUTSIDE_WINDOW"
  | "UNKNOWN_REASON";

type DebugEntry = {
  appointmentId: string;
  reason: SkipReason;
  tenantPlan: string | null;
  smsRemindersEnabled: boolean;
  hasClientPhone: boolean;
  phonePreview?: string;
  alreadySent: boolean;
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function formatPhone(phone: string | null | undefined) {
  return phone?.trim() || "";
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

function formatSmsMessage(params: {
  firstName?: string | null;
  scheduledAt: Date;
  serviceName?: string | null;
}) {
  const firstName = params.firstName?.trim() || "Madame";
  const serviceName = params.serviceName?.trim() || "votre prestation";
  const time = params.scheduledAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

  return `Bonjour ${firstName}, petit rappel pour votre rendez-vous demain à ${time} pour ${serviceName}. À bientôt`;
}

async function claimReminder(params: {
  tenantId: string;
  appointmentId: string;
  clientId: string;
}) {
  const existingSent = await prisma.appointmentReminderLog.findFirst({
    where: {
      appointmentId: params.appointmentId,
      type: REMINDER_TYPE,
      channel: "SMS",
      status: "SENT",
      sentAt: {
        not: null,
      },
    },
    select: { id: true },
  });

  if (existingSent) {
    return null;
  }

  const existingRetryable = await prisma.appointmentReminderLog.findFirst({
    where: {
      appointmentId: params.appointmentId,
      type: REMINDER_TYPE,
      channel: "SMS",
      status: {
        in: ["FAILED", "PENDING"],
      },
    },
    select: { id: true },
  });

  if (existingRetryable) {
    return prisma.appointmentReminderLog.update({
      where: { id: existingRetryable.id },
      data: {
        status: "PENDING",
        errorMessage: null,
        sentAt: null,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
  }

  try {
    return await prisma.appointmentReminderLog.create({
      data: {
        id: `sms24_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId: params.tenantId,
        appointmentId: params.appointmentId,
        clientId: params.clientId,
        type: REMINDER_TYPE,
        channel: "SMS",
        status: "PENDING",
        updatedAt: new Date(),
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_BEFORE_MS);
  const windowEnd = new Date(now.getTime() + WINDOW_AFTER_MS);
  const summary = {
    checked: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };
  const shouldDebug = process.env.NODE_ENV !== "production";
  const debug: DebugEntry[] = [];

  const addDebug = (entry: DebugEntry) => {
    if (shouldDebug) debug.push(entry);
  };

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: windowStart, lte: windowEnd },
        status: { in: [...REMINDER_ELIGIBLE_APPOINTMENT_STATUSES] },
        isDraft: false,
      },
      include: {
        Client: true,
        Service: true,
        Tenant: {
          include: {
            BusinessSettings: true,
          },
        },
       AppointmentReminderLog: {
        where: {
          type: REMINDER_TYPE,
          channel: "SMS",
          status: "SENT",
          sentAt: {
            not: null,
          },
        },
        select: { id: true, status: true, sentAt: true },
        take: 1,
      },
      },
      orderBy: { scheduledAt: "asc" },
      take: 200,
    });

    summary.checked = appointments.length;

    for (const appointment of appointments) {
      const tenant = appointment.Tenant;
      const settings = tenant?.BusinessSettings;
      const phone = formatPhone(appointment.Client?.phone);
      const alreadySent = appointment.AppointmentReminderLog.some(
      (log) => log.status === "SENT"
    );
      const baseDebug = {
        appointmentId: appointment.id,
        tenantPlan: tenant?.subscriptionPlan || null,
        smsRemindersEnabled: Boolean(settings?.smsRemindersEnabled),
        hasClientPhone: Boolean(phone),
        phonePreview: phone ? maskPhone(phone) : undefined,
        alreadySent,
      };

      if (!tenant) {
        summary.skipped += 1;
        addDebug({ ...baseDebug, reason: "MISSING_TENANT" });
        continue;
      }

      if (!appointment.Client) {
        summary.skipped += 1;
        addDebug({ ...baseDebug, reason: "MISSING_CLIENT" });
        continue;
      }

      if (!settings?.smsRemindersEnabled) {
        summary.skipped += 1;
        addDebug({ ...baseDebug, reason: "SMS_REMINDERS_DISABLED" });
        continue;
      }

      if (!getSubscriptionAccessFromTenant(tenant).canUseSms) {
        summary.skipped += 1;
        addDebug({ ...baseDebug, reason: "PLAN_NOT_ALLOWED" });
        continue;
      }

      if (!phone) {
        summary.skipped += 1;
        addDebug({ ...baseDebug, reason: "MISSING_CLIENT_PHONE" });
        continue;
      }

      if (alreadySent) {
        summary.skipped += 1;
        addDebug({ ...baseDebug, reason: "ALREADY_SENT" });
        continue;
      }

      const claimed = await claimReminder({
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        clientId: appointment.clientId,
      });

      if (!claimed) {
        summary.skipped += 1;
        addDebug({ ...baseDebug, reason: "ALREADY_SENT" });
        continue;
      }

      try {
        const sms = await sendSms({
          to: phone,
          body: formatSmsMessage({
            firstName: appointment.Client?.firstName,
            scheduledAt: appointment.scheduledAt,
            serviceName: appointment.Service?.name,
          }),
        });

        await prisma.appointmentReminderLog.update({
          where: { id: claimed.id },
          data: {
            status: "SENT",
            twilioMessageSid: sms.sid,
            sentAt: new Date(),
            updatedAt: new Date(),
          },
        });

        summary.sent += 1;
      } catch (error) {
        await prisma.appointmentReminderLog.update({
          where: { id: claimed.id },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Erreur Twilio inconnue",
            updatedAt: new Date(),
          },
        });

        summary.failed += 1;
      }
    }

    return NextResponse.json({ success: true, ...summary, ...(shouldDebug ? { debug } : {}) });
  } catch (error) {
    console.error("Error sending SMS reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Impossible de traiter les rappels SMS",
        ...summary,
        ...(shouldDebug ? { debug } : {}),
      },
      { status: 500 }
    );
  }
}
