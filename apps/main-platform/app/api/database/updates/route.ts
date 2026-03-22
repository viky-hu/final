import { NextResponse } from "next/server";
import { getUpdateLog } from "@/app/lib/database-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const updates = getUpdateLog();
  return NextResponse.json({ updates });
}
