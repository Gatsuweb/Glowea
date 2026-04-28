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
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Utilisateur';

    await prisma.tenant.create({
      data: {
        id: userId,
        name: `Espace de ${fullName}`,
        updatedAt: new Date(),
      },
    });

    try {
      await prisma.user.create({
        data: {
          id: userId,
          clerkUserId: userId,
          email: email,
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