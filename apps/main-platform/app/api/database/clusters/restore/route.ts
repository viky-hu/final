import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { restoreCluster } from "@/app/lib/database-store";

export const dynamic = "force-dynamic";

const RestoreSchema = z.object({
  clusterId: z.string().min(1, "聚类ID不能为空"),
  actor: z.string().trim().max(32, "节点名称不能超过 32 个字符").optional(),
});

// POST /api/database/clusters/restore
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须为 JSON 格式" }, { status: 400 });
  }

  const result = RestoreSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "参数错误";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { clusterId, actor } = result.data;
  const cluster = restoreCluster(clusterId, actor);

  if (!cluster) {
    return NextResponse.json(
      { error: "聚类已存在或ID无效" },
      { status: 409 }
    );
  }

  return NextResponse.json({ cluster }, { status: 201 });
}
