import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { getSupabaseAdminClient, publicStorageBucket } from "../../../../../lib/supabaseAdmin";
import { getTenantId } from "../../../../../lib/tenant";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const clientId = typeof formData.get("clientId") === "string" ? String(formData.get("clientId")) : "";
    const appointmentId = typeof formData.get("appointmentId") === "string" ? String(formData.get("appointmentId")) : "";
    const scope = typeof formData.get("scope") === "string" ? String(formData.get("scope")) : "";
    const isClientGalleryUpload = scope === "client-gallery";

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier image recu." },
        { status: 400 }
      );
    }

    if (!clientId || (!appointmentId && !isClientGalleryUpload)) {
      return NextResponse.json(
        { success: false, error: "Client ou rendez-vous manquant." },
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

    if (isClientGalleryUpload) {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          tenantId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!client) {
        return NextResponse.json(
          { success: false, error: "Cliente introuvable." },
          { status: 404 }
        );
      }
    } else {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          tenantId,
          clientId,
        },
        select: { id: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { success: false, error: "Rendez-vous introuvable." },
          { status: 404 }
        );
      }
    }

    const extension = getFileExtension(fileEntry);
    const safeName = `${crypto.randomUUID()}.${extension}`;
    const storagePath = isClientGalleryUpload
      ? `${tenantId}/clients/${clientId}/gallery/${safeName}`
      : `${tenantId}/clients/${clientId}/sessions/${appointmentId}/${safeName}`;
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

    return NextResponse.json({
      success: true,
      photo: {
        url: publicUrlData.publicUrl,
        storageKey: storagePath,
        mimeType: fileEntry.type,
        sizeBytes: fileEntry.size,
      },
    });
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
