import { NextResponse } from "next/server";
import { getMetrics } from "@/app/lib/database-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = getMetrics();
  return NextResponse.json(metrics);
}
