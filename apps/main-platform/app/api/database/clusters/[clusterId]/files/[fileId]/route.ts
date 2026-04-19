import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteClusterFile } from "@/app/lib/database-store";

export const dynamic = "force-dynamic";

const DeleteFileSchema = z.object({
  actor: z.string().trim().max(32, "节点名称不能超过 32 个字符").optional(),
});

// DELETE /api/database/clusters/[clusterId]/files/[fileId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string; fileId: string }> },
) {
  const { clusterId, fileId } = await params;

  let body: unknown = {};
  try {
    const raw = await request.text();
    if (raw.trim()) {
      body = JSON.parse(raw) as unknown;
    }
  } catch {
    return NextResponse.json({ error: "请求体必须为 JSON 格式" }, { status: 400 });
  }

  const result = DeleteFileSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "参数错误";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const deleted = deleteClusterFile(clusterId, fileId, result.data.actor);
  if (!deleted) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
