import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type TenantUserRecord = {
  id: string;
  clerkUserId: string;
  email: string;
  tenantId: string;
};

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

async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      tenantId: true,
    },
  });
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function getUniqueConstraintTarget(error: unknown) {
  if (!isUniqueConstraintError(error)) return "";
  const target = error.meta?.target;
  return Array.isArray(target) ? target.join(",") : String(target || "");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findUserAfterCreateConflict(userId: string, email: string) {
  for (const delay of [0, 25, 75]) {
    if (delay > 0) await wait(delay);

    const userByClerkUserId = await findUserByClerkUserId(userId);
    if (userByClerkUserId) return userByClerkUserId;

    const userById = await findUserById(userId);
    if (userById && userById.clerkUserId === userId) return userById;

    const userByEmail = await findUserByEmail(email);
    if (userByEmail) return userByEmail;
  }

  return null;
}

function logTenantResolution(
  step: string,
  payload: Record<string, string | boolean | null | undefined>
) {
  console.log("[auth:tenant]", step, payload);
}

export function logTenantLifecycle(
  event: "tenant_created" | "tenant_found" | "tenant_updated",
  payload: Record<string, string | boolean | null | undefined>
) {
  console.log("[tenant:lifecycle]", event, payload);
}

function createTenantId() {
  return `tenant_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function createBusinessSettingsId() {
  return `biz_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
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
    logTenantLifecycle("tenant_found", {
      source: "getCurrentUserRecord",
      reason: "user_found_by_clerk_user_id",
      clerkUserId: userId,
      databaseUserId: existingUser.id,
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
    logTenantLifecycle("tenant_found", {
      source: "getCurrentUserRecord",
      reason: "user_found_by_email",
      clerkUserId: userId,
      databaseUserId: userWithSameEmail.id,
      tenantId: userWithSameEmail.tenantId,
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

  const tenantId = createTenantId();
  const now = new Date();

  let createdUser: TenantUserRecord;

  try {
    createdUser = await prisma.user.create({
      data: {
        id: userId,
        clerkUserId: userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        fullName,
        role: "OWNER",
        updatedAt: now,
        Tenant: {
          create: {
            id: tenantId,
            name: `Espace de ${fullName}`,
            subscriptionPlan: "PRO",
            subscriptionStatus: "TRIALING",
            trialEndsAt: getTrialEndsAt(),
            updatedAt: now,
            BusinessSettings: {
              create: {
                id: createBusinessSettingsId(),
                smsRemindersEnabled: false,
                smsReminderDelayHours: 24,
                updatedAt: now,
              },
            },
          },
        },
      },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        tenantId: true,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const resolvedUser = await findUserAfterCreateConflict(userId, email);
    if (!resolvedUser) throw error;

    logTenantLifecycle("tenant_found", {
      source: "getCurrentUserRecord",
      reason: "user_create_unique_conflict_resolved",
      conflictTarget: getUniqueConstraintTarget(error),
      clerkUserId: userId,
      databaseUserId: resolvedUser.id,
      email: resolvedUser.email,
      tenantId: resolvedUser.tenantId,
    });

    return resolvedUser;
  }

  logTenantLifecycle("tenant_created", {
    source: "getCurrentUserRecord",
    reason: "new_owner_user",
    clerkUserId: userId,
    databaseUserId: createdUser.id,
    email: createdUser.email,
    tenantId,
  });

  logTenantResolution("new_user_resolved", {
    clerkUserId: userId,
    databaseUserId: createdUser.id,
    email: createdUser.email,
    tenantId: createdUser.tenantId,
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

export async function getExistingTenantId(source = "getExistingTenantId") {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const existingUser = await findUserByClerkUserId(userId);
  if (existingUser) {
    logTenantLifecycle("tenant_found", {
      source,
      reason: "user_found_by_clerk_user_id",
      clerkUserId: userId,
      databaseUserId: existingUser.id,
      tenantId: existingUser.tenantId,
    });
    return existingUser.tenantId;
  }

  const user = await currentUser();
  const email = normalizeEmail(user?.emailAddresses[0]?.emailAddress);
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Utilisateur";
  const userWithSameEmail = await findUserByEmail(email);

  if (userWithSameEmail) {
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
          tenantId: true,
        },
      });

      logTenantLifecycle("tenant_found", {
        source,
        reason: "user_clerk_user_id_updated_from_email_match",
        clerkUserId: userId,
        databaseUserId: updatedUser.id,
        tenantId: updatedUser.tenantId,
      });

      return updatedUser.tenantId;
    }

    logTenantLifecycle("tenant_found", {
      source,
      reason: "user_found_by_email",
      clerkUserId: userId,
      databaseUserId: userWithSameEmail.id,
      tenantId: userWithSameEmail.tenantId,
    });
    return userWithSameEmail.tenantId;
  }

  logTenantResolution("tenant_missing_without_creation", {
    source,
    clerkUserId: userId,
    email,
  });

  throw new Error("Tenant not found for current user");
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
