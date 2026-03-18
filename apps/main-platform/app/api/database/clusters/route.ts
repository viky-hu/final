import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClusters, addCluster } from "@/app/lib/database-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const clusters = getClusters();
  return NextResponse.json({ clusters });
}

const CreateClusterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "聚类名称不能为空")
    .max(50, "名称不能超过 50 个字符"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须为 JSON 格式" }, { status: 400 });
  }

  const result = CreateClusterSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "参数错误";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const cluster = addCluster(result.data.name);
  return NextResponse.json({ cluster }, { status: 201 });
}
