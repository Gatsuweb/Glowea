"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";

export type OnboardingStepId = "profile" | "publicPage" | "firstService" | "firstAppointment";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  completed: boolean;
};

export type OnboardingState = {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isCompleted: boolean;
  shouldShow: boolean;
  nextStep: OnboardingStep | null;
  dismissedAt: string | null;
  completedAt: string | null;
};

function wasDismissedToday(value: Date | null | undefined) {
  if (!value) return false;
  const now = new Date();
  return value.toDateString() === now.toDateString();
}

export async function getTenantOnboardingState(knownTenantId?: string): Promise<OnboardingState> {
  const tenantId = knownTenantId || await getTenantId();

  const [tenant, publicProfile, publicServiceCount, appointmentCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        onboardingDismissedAt: true,
        onboardingCompletedAt: true,
        BusinessSettings: { select: { displayName: true } },
      },
    }),
    prisma.publicProfile.findUnique({
      where: { tenantId },
      select: {
        businessName: true,
        ownerName: true,
        phone: true,
        city: true,
        isPublished: true,
      },
    }),
    prisma.service.count({
      where: { tenantId, isActive: true, isPublic: true },
    }),
    prisma.appointment.count({
      where: { tenantId },
    }),
  ]);

  const profileCompleted = Boolean(
    publicProfile?.businessName?.trim() &&
    publicProfile?.ownerName?.trim() &&
    (publicProfile.phone?.trim() || publicProfile.city?.trim())
  );
  const publicPageCompleted = Boolean(publicProfile?.isPublished);
  const firstServiceCompleted = publicServiceCount > 0;
  const firstAppointmentCompleted = appointmentCount > 0;

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "Compléter mon profil",
      description: "Ajoutez vos informations principales pour personnaliser votre espace.",
      href: "/dashboard/profil",
      completed: profileCompleted,
    },
    {
      id: "publicPage",
      title: "Configurer ma page publique",
      description: "Publiez votre mini-site pour présenter votre activité.",
      href: "/dashboard/page-publique",
      completed: publicPageCompleted,
    },
    {
      id: "firstService",
      title: "Ajouter une première prestation",
      description: "Créez votre première prestation visible à la réservation.",
      href: "/dashboard/page-publique?tab=prestations",
      completed: firstServiceCompleted,
    },
    {
      id: "firstAppointment",
      title: "Créer mon premier rendez-vous",
      description: "Ajoutez un rendez-vous pour commencer à piloter votre planning.",
      href: "/dashboard/agenda",
      completed: firstAppointmentCompleted,
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const isCompleted = completedCount === steps.length;
  const wasCompletedBefore = Boolean(tenant?.onboardingCompletedAt);
  const shouldShow = isCompleted
    ? !wasCompletedBefore
    : !wasDismissedToday(tenant?.onboardingDismissedAt);

  if (isCompleted && !tenant?.onboardingCompletedAt) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingCompletedAt: new Date(), updatedAt: new Date() },
    });
  }

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isCompleted,
    shouldShow,
    nextStep: steps.find((step) => !step.completed) || null,
    dismissedAt: tenant?.onboardingDismissedAt?.toISOString() || null,
    completedAt: tenant?.onboardingCompletedAt?.toISOString() || null,
  };
}

export async function dismissOnboardingChecklist() {
  const tenantId = await getTenantId();

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      onboardingDismissedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  return { success: true as const };
}
