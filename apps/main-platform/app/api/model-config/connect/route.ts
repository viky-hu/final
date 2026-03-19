import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const APIProviderSchema = z.object({
  provider: z.enum(["OpenAI", "Ollama"]),
  model:    z.string().trim().min(1, "请选择模型"),
  baseUrl:  z.string().url("接口地址格式不正确，请输入完整 URL"),
  apiKey:   z.string().trim().min(1, "API Key 不能为空"),
});

const LocalProviderSchema = z.object({
  provider:   z.literal("Local"),
  model:      z.string().trim().min(1, "请选择模型"),
  modelPath:  z.string().trim().min(1, "模型路径不能为空"),
  localUrl:   z.string().url("服务端口格式不正确，请输入完整 URL").optional()
               .or(z.literal("")),
});

const ConnectSchema = z.discriminatedUnion("provider", [
  APIProviderSchema,
  LocalProviderSchema,
]);

// ─── POST /api/model-config/connect ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须为 JSON 格式" }, { status: 400 });
  }

  const result = ConnectSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "参数错误";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const data = result.data;

  // TODO: 后续接入真实连接逻辑 ──────────────────────────────────────────────
  // OpenAI:  new OpenAI({ apiKey: data.apiKey, baseURL: data.baseUrl })
  //          await client.models.list()
  // Ollama:  fetch(`${data.baseUrl}/api/tags`, { headers: { Authorization: ... } })
  // Local:   spawn local inference server, check port http://localhost:8000/health
  // ─────────────────────────────────────────────────────────────────────────

  const mockLatencyMs = 420 + Math.floor(Math.random() * 300);

  return NextResponse.json(
    {
      connected:    true,
      provider:     data.provider,
      model:        data.model,
      message:      "模拟连接成功",
      mockLatencyMs,
    },
    { status: 200 },
  );
}
