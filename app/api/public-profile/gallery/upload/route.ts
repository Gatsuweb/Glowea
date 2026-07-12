import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "../../../../../lib/prisma";
import { getTenantSubscriptionAccess } from "../../../../../lib/subscription";
import { getSupabaseAdminClient, publicStorageBucket } from "../../../../../lib/supabaseAdmin";
import { getTenantId } from "../../../../../lib/tenant";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PUBLIC_PAGE_REQUIRED_ERROR = "La page publique est disponible avec Glowea Presence ou Pro.";

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function getAltFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const access = await getTenantSubscriptionAccess(tenantId);

    if (!access.canEditPublicPage) {
      return NextResponse.json(
        { success: false, error: PUBLIC_PAGE_REQUIRED_ERROR },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const altEntry = formData.get("alt");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier image recu." },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(fileEntry.type)) {
      return NextResponse.json(
        { success: false, error: "Format invalide. Utilisez JPEG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Image trop lourde. Taille maximale: 5 Mo." },
        { status: 400 }
      );
    }

    const extension = getFileExtension(fileEntry);
    const safeName = `${crypto.randomUUID()}.${extension}`;
    const storagePath = `${tenantId}/gallery/${safeName}`;
    const alt = typeof altEntry === "string" && altEntry.trim()
      ? altEntry.trim().slice(0, 180)
      : getAltFromFileName(fileEntry.name).slice(0, 180);

    const maxSortOrder = await prisma.galleryImage.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });

    const supabase = getSupabaseAdminClient();
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(publicStorageBucket)
      .upload(storagePath, fileBuffer, {
        contentType: fileEntry.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: "Upload impossible." },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(publicStorageBucket)
      .getPublicUrl(storagePath);

    try {
      const image = await prisma.galleryImage.create({
        data: {
          id: `gal_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId,
          imageUrl: publicUrlData.publicUrl,
          alt: alt || null,
          sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
          isPublic: true,
        },
      });

      const profile = await prisma.publicProfile.findUnique({
        where: { tenantId },
        select: { slug: true },
      });

      if (profile) revalidatePath(`/pro/${profile.slug}`);
      revalidatePath("/dashboard/page-publique");

      return NextResponse.json({
        success: true,
        image: {
          id: image.id,
          imageUrl: image.imageUrl,
          alt: image.alt || "",
          sortOrder: image.sortOrder,
          isPublic: image.isPublic,
        },
      });
    } catch {
      await supabase.storage.from(publicStorageBucket).remove([storagePath]).catch(() => undefined);
      return NextResponse.json(
        { success: false, error: "Image uploadée mais enregistrement impossible." },
        { status: 500 }
      );
    }
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
