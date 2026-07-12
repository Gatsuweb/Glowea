import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "../../../../../lib/prisma";
import { getTenantSubscriptionAccess } from "../../../../../lib/subscription";
import { getStoragePathFromPublicUrl, getSupabaseAdminClient, publicStorageBucket } from "../../../../../lib/supabaseAdmin";
import { getTenantId } from "../../../../../lib/tenant";

const PUBLIC_PAGE_REQUIRED_ERROR = "La page publique est disponible avec Glowea Presence ou Pro.";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const access = await getTenantSubscriptionAccess(tenantId);

    if (!access.canEditPublicPage) {
      return NextResponse.json(
        { success: false, error: PUBLIC_PAGE_REQUIRED_ERROR },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Image introuvable." },
        { status: 400 }
      );
    }

    const image = await prisma.galleryImage.findFirst({
      where: { id, tenantId },
      select: { id: true, imageUrl: true },
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Image introuvable." },
        { status: 404 }
      );
    }

    const storagePath = getStoragePathFromPublicUrl(image.imageUrl);
    const supabase = getSupabaseAdminClient();

    await prisma.galleryImage.delete({
      where: { id: image.id, tenantId },
    });

    if (storagePath) {
      await supabase.storage.from(publicStorageBucket).remove([storagePath]).catch(() => undefined);
    }

    const profile = await prisma.publicProfile.findUnique({
      where: { tenantId },
      select: { slug: true },
    });

    if (profile) revalidatePath(`/pro/${profile.slug}`);
    revalidatePath("/dashboard/page-publique");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur.",
      },
      { status: 500 }
    );
  }
}
