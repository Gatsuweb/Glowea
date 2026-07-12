import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { REMINDER_ELIGIBLE_APPOINTMENT_STATUSES } from "../../../../lib/appointmentStatus";
import { formatBookingTimeLabel } from "../../../../lib/bookingTimezone";
import { getSubscriptionAccessFromTenant } from "../../../../lib/subscription";
import { getSmsProvider, getTwilioDiagnostics, sendSms } from "../../../../lib/twilio";

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

function logSmsReminder(
  step: string,
  payload: Record<string, string | number | boolean | null | undefined>
) {
  console.log(`[sms-reminder] ${step}`, payload);
}

function formatSmsMessage(params: {
  firstName?: string | null;
  scheduledAt: Date;
  serviceName?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
}) {
  const firstName = params.firstName?.trim() || "Madame";
  const serviceName = params.serviceName?.trim() || "votre prestation";
  const businessName = params.businessName?.trim() || "votre prestataire";
  const businessAddress = params.businessAddress?.trim();
  const businessPhone = params.businessPhone?.trim();
  const time = formatBookingTimeLabel(params.scheduledAt);

  const messageLines = [
    `Bonjour ${firstName}`,
    `Rappel : votre rendez-vous ${serviceName} est prévu demain à ${time} chez ${businessName}.`,
    businessAddress ? `📍 ${businessAddress}` : "",
    "Besoin d'annuler ou déplacer votre rendez-vous ?",
    businessPhone ? `📞 ${businessPhone}` : "",
    "À bientôt 💖",
    businessName,
  ].filter(Boolean);

  return messageLines.join("\n\n");
}

function getBusinessName(params: {
  publicBusinessName?: string | null;
  settingsDisplayName?: string | null;
  tenantName?: string | null;
}) {
  return (
    params.publicBusinessName?.trim() ||
    params.settingsDisplayName?.trim() ||
    params.tenantName?.trim() ||
    "votre prestataire"
  );
}

function getBusinessAddress(profile: {
  address?: string | null;
  city?: string | null;
} | null | undefined) {
  const parts = [profile?.address, profile?.city]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.join(", ");
}

function getAppointmentServiceName(appointment: {
  Service?: { name: string | null } | null;
  AppointmentService?: Array<{ nameSnapshot: string; position: number }>;
}) {
  const snapshots = appointment.AppointmentService
    ?.slice()
    .sort((a, b) => a.position - b.position)
    .map((service) => service.nameSnapshot.trim())
    .filter(Boolean);

  if (snapshots?.length) return snapshots.join(" + ");
  return appointment.Service?.name || null;
}

async function claimReminder(params: {
  tenantId: string;
  appointmentId: string;
  clientId: string;
}) {
  const existingSent = await prisma.appointmentReminderLog.findFirst({
    where: {
      tenantId: params.tenantId,
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
      tenantId: params.tenantId,
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
  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_BEFORE_MS);
  const windowEnd = new Date(now.getTime() + WINDOW_AFTER_MS);

  logSmsReminder("cron_started", {
    now: now.toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    provider: getSmsProvider(),
  });

  if (!isAuthorized(request)) {
    logSmsReminder("cron_unauthorized", {
      hasCronSecret: Boolean(process.env.CRON_SECRET),
      hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
    });
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

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
    const twilioDiagnostics = getTwilioDiagnostics();
    logSmsReminder("twilio_credentials_present", {
      provider: twilioDiagnostics.resolvedProvider,
      smsProviderEnvSet: Boolean(twilioDiagnostics.smsProvider),
      hasAccountSid: twilioDiagnostics.hasAccountSid,
      hasAuthToken: twilioDiagnostics.hasAuthToken,
      hasFromNumber: twilioDiagnostics.hasFromNumber,
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: windowStart, lte: windowEnd },
        status: { in: [...REMINDER_ELIGIBLE_APPOINTMENT_STATUSES] },
        isDraft: false,
        Client: {
          is: {
            archivedAt: null,
          },
        },
      },
      include: {
        Client: true,
        Service: true,
        AppointmentService: {
          select: {
            nameSnapshot: true,
            position: true,
          },
        },
        Tenant: {
          include: {
            BusinessSettings: true,
            PublicProfile: true,
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
    logSmsReminder("appointments_found", {
      count: appointments.length,
    });

    for (const appointment of appointments) {
      const tenant = appointment.Tenant;
      const settings = tenant?.BusinessSettings;
      const phone = formatPhone(appointment.Client?.phone);
      const alreadySent = appointment.AppointmentReminderLog.some(
        (log) => log.status === "SENT"
      );
      const subscriptionAccess = tenant ? getSubscriptionAccessFromTenant(tenant) : null;
      const baseDebug = {
        appointmentId: appointment.id,
        tenantPlan: tenant?.subscriptionPlan || null,
        smsRemindersEnabled: Boolean(settings?.smsRemindersEnabled),
        hasClientPhone: Boolean(phone),
        phonePreview: phone ? maskPhone(phone) : undefined,
        alreadySent,
      };

      logSmsReminder("appointment_found", {
        appointmentId: appointment.id,
        tenantId: appointment.tenantId,
        clientId: appointment.clientId,
        scheduledAt: appointment.scheduledAt.toISOString(),
        status: appointment.status,
        alreadySent,
      });

      if (!tenant) {
        summary.skipped += 1;
        logSmsReminder("skip_missing_tenant", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
        });
        addDebug({ ...baseDebug, reason: "MISSING_TENANT" });
        continue;
      }

      if (!appointment.Client) {
        summary.skipped += 1;
        logSmsReminder("skip_missing_client", {
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          tenantId: appointment.tenantId,
        });
        addDebug({ ...baseDebug, reason: "MISSING_CLIENT" });
        continue;
      }

      logSmsReminder("client_found", {
        appointmentId: appointment.id,
        clientId: appointment.Client.id,
        tenantId: appointment.tenantId,
      });
      logSmsReminder("client_phone", {
        appointmentId: appointment.id,
        clientId: appointment.Client.id,
        hasPhone: Boolean(phone),
        phonePreview: phone ? maskPhone(phone) : null,
      });
      logSmsReminder("sms_enabled", {
        appointmentId: appointment.id,
        tenantId: appointment.tenantId,
        smsRemindersEnabled: Boolean(settings?.smsRemindersEnabled),
        tenantPlan: tenant.subscriptionPlan,
        tenantStatus: tenant.subscriptionStatus,
        canUseSms: Boolean(subscriptionAccess?.canUseSms),
      });

      if (!settings?.smsRemindersEnabled) {
        summary.skipped += 1;
        logSmsReminder("skip_sms_disabled", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
        });
        addDebug({ ...baseDebug, reason: "SMS_REMINDERS_DISABLED" });
        continue;
      }

      if (!subscriptionAccess?.canUseSms) {
        summary.skipped += 1;
        logSmsReminder("skip_plan_not_allowed", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
          tenantPlan: tenant.subscriptionPlan,
          tenantStatus: tenant.subscriptionStatus,
        });
        addDebug({ ...baseDebug, reason: "PLAN_NOT_ALLOWED" });
        continue;
      }

      if (!phone) {
        summary.skipped += 1;
        logSmsReminder("skip_missing_client_phone", {
          appointmentId: appointment.id,
          clientId: appointment.Client.id,
        });
        addDebug({ ...baseDebug, reason: "MISSING_CLIENT_PHONE" });
        continue;
      }

      if (alreadySent) {
        summary.skipped += 1;
        logSmsReminder("skip_already_sent", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
        });
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
        logSmsReminder("skip_claim_failed_or_already_claimed", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
        });
        addDebug({ ...baseDebug, reason: "ALREADY_SENT" });
        continue;
      }

      try {
        logSmsReminder("sending_sms", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
          clientId: appointment.Client.id,
          phonePreview: maskPhone(phone),
          provider: getSmsProvider(),
        });

        const sms = await sendSms({
          to: phone,
          body: formatSmsMessage({
            firstName: appointment.Client?.firstName,
            scheduledAt: appointment.scheduledAt,
            serviceName: getAppointmentServiceName(appointment),
            businessName: getBusinessName({
              publicBusinessName: tenant.PublicProfile?.businessName,
              settingsDisplayName: settings?.displayName,
              tenantName: tenant.name,
            }),
            businessAddress: getBusinessAddress(tenant.PublicProfile),
            businessPhone: tenant.PublicProfile?.phone,
          }),
        });

        logSmsReminder("twilio_success", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
          sid: sms.sid,
          provider: sms.provider,
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
        const smsError = error as { code?: string; userMessage?: string; message?: string };
        logSmsReminder("twilio_error", {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
          code: smsError.code,
          userMessage: smsError.userMessage,
          message: smsError.message,
        });

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
