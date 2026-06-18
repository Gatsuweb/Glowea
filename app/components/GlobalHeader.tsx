import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import styles from "./GlobalHeader.module.css";
import NotificationBell from "./NotificationBell";
import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";
import { REMINDER_ELIGIBLE_APPOINTMENT_STATUSES } from "../../lib/appointmentStatus";

async function processHeaderReminders(tenantId: string) {
  const now = new Date();
  const dueReminders = await prisma.appointmentReminder.findMany({
    where: {
      tenantId,
      status: "PENDING",
      scheduledFor: { lte: now },
      Appointment: {
        scheduledAt: { gte: now },
        status: { in: [...REMINDER_ELIGIBLE_APPOINTMENT_STATUSES] },
      },
    },
    include: {
      Appointment: {
        include: {
          Client: true,
          Service: true,
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
    take: 20,
  });

  for (const reminder of dueReminders) {
    const appointment = reminder.Appointment;
    const clientName = `${appointment.Client?.firstName || ""} ${appointment.Client?.lastName || ""}`.trim() || "Client";
    const timeStr = new Date(appointment.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const dateStr = new Date(appointment.scheduledAt).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
    const serviceName = appointment.Service?.name || "Prestation";

    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.appointmentReminder.updateMany({
          where: {
            id: reminder.id,
            tenantId,
            status: "PENDING",
          },
          data: {
            status: "SENT",
            sentAt: now,
            updatedAt: now,
          },
        });

        if (claimed.count === 0) return;

        await tx.notification.createMany({
          data: [{
            id: `not_${reminder.id}`,
            tenantId,
            clientId: appointment.clientId,
            appointmentId: appointment.id,
            type: "APPOINTMENT_REMINDER",
            title: "Rappel de rendez-vous (J-1)",
            body: `${clientName} - ${dateStr} a ${timeStr} - ${serviceName}`,
          }],
          skipDuplicates: true,
        });
      });
    } catch (error) {
      console.error("Error processing appointment reminder:", error);
    }
  }
}

export default async function GlobalHeader() {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";

  if (!DEV_BYPASS_AUTH) {
    try {
      await currentUser();
    } catch (e) {
      console.error("Erreur Clerk ignoree:", e);
    }
  }

  const tenantId = await getTenantId();
  await processHeaderReminders(tenantId);

  const [unreadCount, recentNotifications] = await Promise.all([
    prisma.notification.count({
      where: { tenantId, readAt: null },
    }),
    prisma.notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        readAt: true,
      },
    }),
  ]);

  return (
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.logoContainer} aria-label="Retour au dashboard">
        <Image src="/logo-glowea-fonce.png" alt="Glowea" width={185} height={55} priority />
      </Link>
      <div className={styles.userSection}>
        <Link href="/dashboard/page-publique" className={styles.iconBtn} title="Page publique" aria-label="Acceder a ma page publique">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M2 12h20"></path>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </Link>
        <Link href="/dashboard/profil" className={styles.iconBtn} title="Paramètres & Profil">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </Link>
        <NotificationBell
          initialUnreadCount={unreadCount}
          initialNotifications={recentNotifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
            readAt: n.readAt ? n.readAt.toISOString() : null,
          }))}
        />
        <div className={styles.avatarWrapper}>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
