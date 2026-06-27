import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "./prisma";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || "";
}

function getTrialEndsAt() {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  return trialEndsAt;
}

async function findUserByEmail(email: string) {
  if (!email) return null;

  return prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      tenantId: true,
    },
  });
}

async function findUserByClerkUserId(userId: string) {
  return prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      tenantId: true,
    },
  });
}

function logTenantResolution(
  step: string,
  payload: Record<string, string | boolean | null | undefined>
) {
  console.log("[auth:tenant]", step, payload);
}

function createTenantId() {
  return `tenant_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

async function ensureTenant(fullName: string) {
  const tenantId = createTenantId();

  return prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: `Espace de ${fullName}`,
      subscriptionPlan: "PRO",
      subscriptionStatus: "TRIALING",
      trialEndsAt: getTrialEndsAt(),
      updatedAt: new Date(),
      BusinessSettings: {
        create: {
          id: `biz_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          smsRemindersEnabled: false,
          smsReminderDelayHours: 24,
          updatedAt: new Date(),
        },
      },
    },
    select: { id: true },
  });
}

export async function getCurrentUserRecord() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  logTenantResolution("clerk_user_received", { clerkUserId: userId });

  const existingUser = await findUserByClerkUserId(userId);
  if (existingUser) {
    logTenantResolution("user_found_by_clerk_user_id", {
      clerkUserId: userId,
      databaseUserId: existingUser.id,
      databaseClerkUserId: existingUser.clerkUserId,
      email: existingUser.email,
      tenantId: existingUser.tenantId,
    });
    return existingUser;
  }

  const user = await currentUser();
  const email = normalizeEmail(user?.emailAddresses[0]?.emailAddress) || `${userId}@example.com`;
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Utilisateur";

  logTenantResolution("clerk_email_received", {
    clerkUserId: userId,
    email,
  });

  const userWithSameEmail = await findUserByEmail(email);

  if (userWithSameEmail) {
    logTenantResolution("user_found_by_email", {
      clerkUserId: userId,
      databaseUserId: userWithSameEmail.id,
      previousClerkUserId: userWithSameEmail.clerkUserId,
      email: userWithSameEmail.email,
      tenantId: userWithSameEmail.tenantId,
      willUpdateClerkUserId: userWithSameEmail.clerkUserId !== userId,
    });

    if (userWithSameEmail.clerkUserId !== userId) {
      const updatedUser = await prisma.user.update({
        where: { id: userWithSameEmail.id },
        data: {
          clerkUserId: userId,
          firstName: firstName || null,
          lastName: lastName || null,
          fullName,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          clerkUserId: true,
          email: true,
          tenantId: true,
        },
      });

      logTenantResolution("user_clerk_user_id_updated_from_email_match", {
        clerkUserId: userId,
        databaseUserId: updatedUser.id,
        email: updatedUser.email,
        tenantId: updatedUser.tenantId,
      });

      return updatedUser;
    }

    return userWithSameEmail;
  }

  const tenant = await ensureTenant(fullName);

  const createdUser = await prisma.user.upsert({
    where: { clerkUserId: userId },
    update: {
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      fullName,
      tenantId: tenant.id,
      updatedAt: new Date(),
    },
    create: {
      id: userId,
      clerkUserId: userId,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      fullName,
      role: "OWNER",
      tenantId: tenant.id,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      tenantId: true,
    },
  });

  logTenantResolution("new_user_and_tenant_created", {
    clerkUserId: userId,
    databaseUserId: createdUser.id,
    email: createdUser.email,
    tenantId: tenant.id,
  });

  return createdUser;
}

export async function getTenantId() {
  const user = await getCurrentUserRecord();
  logTenantResolution("tenant_id_returned", {
    clerkUserId: user.clerkUserId,
    databaseUserId: user.id,
    email: user.email,
    tenantId: user.tenantId,
  });
  return user.tenantId;
}

export async function createDevResetUserByEmail(email: string, currentClerkUserId?: string | null) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dev reset is only available in development.");
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Email invalide.");
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      tenantId: true,
      email: true,
      clerkUserId: true,
    },
  });

  const tenantIds = new Set(users.map((user) => user.tenantId));
  if (currentClerkUserId) {
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: currentClerkUserId },
      select: { id: true },
    });

    if (currentTenant) {
      tenantIds.add(currentTenant.id);
    }
  }

  const userIds = users.map((user) => user.id);
  const result = await prisma.$transaction(async (tx) => {
    const deletedTenants = tenantIds.size > 0
      ? await tx.tenant.deleteMany({
          where: { id: { in: Array.from(tenantIds) } },
        })
      : { count: 0 };

    const deletedUsers = userIds.length > 0
      ? await tx.user.deleteMany({
          where: { id: { in: userIds } },
        })
      : { count: 0 };

    return {
      deletedTenants: deletedTenants.count,
      deletedUsers: deletedUsers.count,
    };
  });

  return {
    email: normalizedEmail,
    matchedUsers: users.map((user) => ({
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      tenantId: user.tenantId,
    })),
    ...result,
  };
}
