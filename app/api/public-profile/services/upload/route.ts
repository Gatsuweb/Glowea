import { NextResponse } from "next/server";
import { getTenantSubscriptionAccess } from "../../../../../lib/subscription";
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
    const access = await getTenantSubscriptionAccess(tenantId);

    if (!access.canUsePublicPage) {
      return NextResponse.json(
        { success: false, error: "La page publique est disponible avec Glowea Pro." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

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
    const storagePath = `${tenantId}/services/${safeName}`;

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
      imageUrl: publicUrlData.publicUrl,
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
