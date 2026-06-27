import { createHash } from "node:crypto";

import prisma from "./prisma";
import { sendPushToTenant } from "./push";

export type AppointmentPaymentPushType = "deposit" | "full" | "remaining";

function getAppointmentPaymentNotification(paymentType: AppointmentPaymentPushType, appointmentId: string) {
  if (paymentType === "deposit") {
    return {
      title: "Arrhes encaissées",
      body: "Un paiement d'arrhes vient d'être reçu.",
      tag: `payment-deposit-${appointmentId}`,
      sentLog: "[push] deposit sent",
    };
  }

  if (paymentType === "full") {
    return {
      title: "Paiement reçu",
      body: "Un paiement complet vient d'être reçu.",
      tag: `payment-full-${appointmentId}`,
      sentLog: "[push] full payment sent",
    };
  }

  return {
    title: "Paiement reçu",
    body: "Un paiement restant vient d'être reçu.",
    tag: `payment-remaining-${appointmentId}`,
    sentLog: "[push] remaining payment sent",
  };
}

function getPaymentNotificationId(sessionId: string, paymentType: string) {
  const hash = createHash("sha256").update(`${sessionId}:${paymentType}`).digest("hex").slice(0, 16);
  return `not_pay_${hash}`;
}

export async function sendAppointmentPaymentPushOnce(params: {
  tenantId: string;
  appointmentId: string;
  paymentType: AppointmentPaymentPushType;
  checkoutSessionId: string;
}) {
  const notification = getAppointmentPaymentNotification(params.paymentType, params.appointmentId);
  const notificationId = getPaymentNotificationId(params.checkoutSessionId, params.paymentType);

  const created = await prisma.notification.createMany({
    data: [{
      id: notificationId,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      type: "OTHER",
      title: notification.title,
      body: notification.body,
    }],
    skipDuplicates: true,
  });

  if (created.count === 0) {
    console.log("[push] payment notification already sent", {
      appointmentId: params.appointmentId,
      paymentType: params.paymentType,
      tenantId: params.tenantId,
    });
    return { sent: false as const, reason: "already_sent" as const };
  }

  const result = await sendPushToTenant(params.tenantId, {
    title: notification.title,
    body: notification.body,
    tag: notification.tag,
    url: "/dashboard/agenda",
    data: {
      appointmentId: params.appointmentId,
      paymentType: params.paymentType,
    },
  }, { preferenceKey: "paymentReceivedEnabled" });

  console.log(notification.sentLog);
  return { sent: true as const, result };
}
