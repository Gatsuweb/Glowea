import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "./prisma";

export async function getTenantId() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: userId },
  });

  if (!tenant) {
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress || `${userId}@example.com`;
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Utilisateur";

    await prisma.tenant.create({
      data: {
        id: userId,
        name: `Espace de ${fullName}`,
        subscriptionPlan: "FREE",
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
    });

    try {
      await prisma.user.create({
        data: {
          id: userId,
          clerkUserId: userId,
          email: email,
          firstName: firstName || null,
          lastName: lastName || null,
          fullName: fullName,
          role: "OWNER",
          tenantId: userId,
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      console.error("User creation failed, might already exist", e);
    }
  }

  return userId;
}
