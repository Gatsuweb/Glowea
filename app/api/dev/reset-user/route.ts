import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createDevResetUserByEmail } from "../../../../lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const confirm = typeof body?.confirm === "string" ? body.confirm : "";

  if (confirm !== "RESET_DEV_USER") {
    return NextResponse.json(
      { success: false, error: "Confirmation RESET_DEV_USER requise" },
      { status: 400 }
    );
  }

  try {
    const { userId } = await auth();
    const result = await createDevResetUserByEmail(email, userId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Reset dev impossible",
      },
      { status: 400 }
    );
  }
}
