import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listClusterFiles, addClusterFile } from "@/app/lib/database-store";

export const dynamic = "force-dynamic";

// GET /api/database/clusters/[clusterId]/files
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> },
) {
  const { clusterId } = await params;
  const files = listClusterFiles(clusterId);
  return NextResponse.json({ files });
}

const AddFileSchema = z.object({
  name: z.string().trim().min(1, "文件名不能为空"),
  size: z.number().nonnegative("文件大小不能为负数"),
  mimeType: z.string().min(1, "MIME 类型不能为空"),
  localPath: z.string().optional(),
});

// POST /api/database/clusters/[clusterId]/files
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> },
) {
  const { clusterId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须为 JSON 格式" }, { status: 400 });
  }

  const result = AddFileSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "参数错误";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const file = addClusterFile(clusterId, result.data);
  return NextResponse.json({ file }, { status: 201 });
}
