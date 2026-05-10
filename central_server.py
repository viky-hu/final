"""
中心服务器 - 支持跨机测试
用法：
  # 本地测试（默认）
  python central_server.py

  # 学弟的节点在 172.22.39.147，你的节点在本地
  python central_server.py --node nodea=http://172.22.39.147:8001 --node nodeb=http://172.22.39.147:8002 --node nodec=http://localhost:8003

  # 全部走远程
  python central_server.py --node nodea=http://172.22.39.147:8001 --node nodeb=http://172.22.39.147:8002
"""
import argparse, asyncio, json, base64, os, uuid, httpx
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# ---- 解析命令行参数 ----
parser = argparse.ArgumentParser()
parser.add_argument("--node", action="append", dest="node_args",
    help="节点配置，格式: nodeid=http://ip:port，可多次使用。默认: nodea=localhost:8001, nodeb=localhost:8002, nodec=localhost:8003")
parser.add_argument("--port", type=int, default=9000, help="中心服务器端口 (默认: 9000)")
args = parser.parse_args()

# 构建 NODES 配置
DEFAULT_NODES = {
    "nodea": {"url": "http://localhost:8001"},
    "nodeb": {"url": "http://localhost:8002"},
    "nodec": {"url": "http://localhost:8003"},
}

NODES = {}
if args.node_args:
    for item in args.node_args:
        if "=" not in item:
            print(f"[WARN] 跳过无效节点参数: {item}，格式应为 nodeid=http://ip:port")
            continue
        nid, url = item.split("=", 1)
        NODES[nid.strip()] = {"url": url.strip()}
    if not NODES:
        print("[WARN] 未解析到有效节点，使用默认配置")
        NODES = DEFAULT_NODES
else:
    NODES = DEFAULT_NODES

print(f"[INFO] 中心服务器启动，节点列表:")
for nid, info in NODES.items():
    print(f"       {nid} -> {info['url']}")

# ---- SM4 加解密 ----
from sm4 import SM4Key


def load_sm4_key() -> bytes:
    raw = os.getenv("FEDERATION_SM4_KEY", "").strip()
    if not raw:
        raise RuntimeError("缺少环境变量 FEDERATION_SM4_KEY")
    return raw.encode("utf-8")[:16].ljust(16, b'\x00')


def resolve_node_timeout_seconds() -> float:
    raw = os.getenv("FEDERATION_NODE_TIMEOUT_MS", "8000").strip()
    try:
        timeout_ms = int(raw)
    except ValueError:
        timeout_ms = 8000
    if timeout_ms <= 0:
        timeout_ms = 8000
    return timeout_ms / 1000.0


SM4_KEY = load_sm4_key()
_sm4 = SM4Key(SM4_KEY)

def simple_encrypt(text: str) -> str:
    encrypted_bytes = _sm4.encrypt(text.encode('utf-8'), padding=True)
    return base64.b64encode(encrypted_bytes).decode()

def simple_decrypt(encrypted: str) -> str:
    encrypted_bytes = base64.b64decode(encrypted.encode())
    return _sm4.decrypt(encrypted_bytes, padding=True).decode('utf-8')

# ---- 法官模型（硬编码版，后续替换为 LLM 调用） ----
def judge_model(candidates: list[dict]) -> str:
    """按置信度排序，选最高的答案"""
    if not candidates:
        return "无节点返回有效结果"
    candidates.sort(key=lambda x: x.get("confidence", 0), reverse=True)
    best = candidates[0]
    return best.get("answer", "")

# ---- FastAPI ----
app = FastAPI(title="Central Aggregation Server")

class AskRequest(BaseModel):
    question: str

class AskResponse(BaseModel):
    answer: str
    details: list[dict]
    status: str
    request_id: str


def resolve_status(details: list[dict]) -> str:
    if not details:
        return "error"
    ok_count = sum(1 for item in details if item.get("status") == "ok")
    if ok_count == 0:
        return "error"
    if ok_count < len(details):
        return "partial"
    return "ok"

@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest, request: Request):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    encrypted = simple_encrypt(req.question)
    node_timeout_seconds = resolve_node_timeout_seconds()
    async with httpx.AsyncClient(timeout=node_timeout_seconds) as client:
        tasks = []
        for nid, info in NODES.items():
            tasks.append(
                client.post(
                    f"{info['url']}/query",
                    json={"encrypted_query": encrypted},
                    headers={"x-request-id": request_id},
                )
            )
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    candidates = []
    details = []
    for nid, resp in zip(NODES.keys(), responses):
        if isinstance(resp, Exception):
            details.append({"node": nid, "status": "error", "detail": str(resp)})
            continue
        try:
            data = resp.json()
            result = json.loads(simple_decrypt(data["encrypted_result"]))
            candidates.append(result)
            details.append({"node": nid, "status": "ok", "confidence": result.get("confidence"), "answer_preview": result.get("answer", "")[:50]})
        except Exception as e:
            details.append({"node": nid, "status": "parse_error", "detail": str(e)})

    answer = judge_model(candidates)
    status = resolve_status(details)
    print(f"[CENTRAL] request_id={request_id} status={status} details={len(details)}")
    return AskResponse(answer=answer, details=details, status=status, request_id=request_id)


@app.get("/health")
async def health(request: Request):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    node_timeout_seconds = resolve_node_timeout_seconds()
    results = []

    async with httpx.AsyncClient(timeout=node_timeout_seconds) as client:
        tasks = []
        node_ids = []
        for nid, info in NODES.items():
            node_ids.append(nid)
            tasks.append(client.get(f"{info['url']}/health", headers={"x-request-id": request_id}))
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    for nid, info, resp in zip(node_ids, NODES.values(), responses):
        if isinstance(resp, Exception):
            results.append({
                "node": nid,
                "url": info["url"],
                "status": "error",
                "detail": str(resp),
            })
            continue

        try:
            body = resp.json()
        except Exception:
            body = None

        if resp.status_code >= 400:
            results.append({
                "node": nid,
                "url": info["url"],
                "status": "error",
                "http_status": resp.status_code,
                "body": body,
            })
            continue

        results.append({
            "node": nid,
            "url": info["url"],
            "status": "ok",
            "http_status": resp.status_code,
            "body": body,
        })

    overall_status = resolve_status(results)
    print(f"[CENTRAL] request_id={request_id} health_status={overall_status}")
    return {
        "request_id": request_id,
        "status": overall_status,
        "nodes": results,
    }

@app.get("/")
async def root():
    nodes_html = " · ".join([f"{nid}({info['url']})" for nid, info in NODES.items()])
    return HTMLResponse(f"""<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><title>联邦知识图谱检索 - 测试台</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;justify-content:center;min-height:100vh;padding:40px 20px}}
.card{{max-width:700px;width:100%}}
h1{{font-size:22px;margin-bottom:6px;color:#f1f5f9}}
.sub{{color:#94a3b8;font-size:14px;margin-bottom:24px}}
form{{display:flex;gap:10px;margin-bottom:24px}}
input{{flex:1;padding:12px 16px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:15px;outline:none}}
input:focus{{border-color:#6366f1}}
button{{padding:12px 24px;border-radius:10px;border:none;background:#6366f1;color:#fff;font-size:15px;cursor:pointer;font-weight:600;white-space:nowrap}}
button:hover{{background:#4f46e5}}
button:disabled{{opacity:.5;cursor:not-allowed}}
.result {{display:none}}
.result.show{{display:block}}
.box{{background:#1e293b;border-radius:10px;padding:20px;margin-bottom:12px}}
.box h3{{font-size:13px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}}
.answer{{font-size:16px;line-height:1.6;color:#f1f5f9}}
.nodes{{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}}
.node{{padding:6px 12px;border-radius:6px;font-size:13px;background:#334155;color:#cbd5e1}}
.node .conf{{color:#6366f1;font-weight:600}}
pre{{font-size:12px;overflow-x:auto;max-height:200px;margin-top:8px;padding:8px;background:#0f172a;border-radius:6px;color:#94a3b8}}
.hidden{{display:none}}
.spinner{{display:inline-block;width:16px;height:16px;border:2px solid #6366f1;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
.error{{background:#7f1d1d;color:#fecaca;padding:12px;border-radius:8px;margin-bottom:12px}}
</style></head>
<body>
<div class="card">
<h1>🔐 联邦知识图谱协同检索</h1>
<p class="sub">{nodes_html} &nbsp;|&nbsp; SM4加密</p>
<form id="form">
<input id="q" placeholder="输入查询问题，例如：联邦学习在数据安全中的应用" required>
<button type="submit" id="btn">查询</button>
</form>
<div id="error" class="error hidden"></div>
<div id="result" class="result">
<div class="box"><h3>聚合答案</h3><div class="answer" id="answer"></div></div>
<div class="box"><h3>各节点响应</h3><div class="nodes" id="nodes"></div></div>
<div class="box"><h3>原始返回</h3><pre id="raw"></pre></div>
</div>
</div>
<script>
const form=document.getElementById('form'),q=document.getElementById('q'),btn=document.getElementById('btn'),
      result=document.getElementById('result'),answer=document.getElementById('answer'),
      nodes=document.getElementById('nodes'),raw=document.getElementById('raw'),
      errDiv=document.getElementById('error');
form.onsubmit=async e=>{{
    e.preventDefault();btn.disabled=true;btn.innerHTML='<span class="spinner"></span>查询中...';
    errDiv.classList.add('hidden');result.classList.remove('show');
    try{{
        const r=await fetch('/ask',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{question:q.value}})}});
        const d=await r.json();
        if(!r.ok)throw new Error(JSON.stringify(d));
        answer.textContent=d.answer;
        nodes.innerHTML=d.details.map(x=>{{
            const c=x.confidence?'<span class="conf">'+x.confidence+'</span>':'<span style="color:#ef4444">失败</span>';
            const s=x.status==='ok'?'✅':'❌';
            return '<div class="node">'+s+' '+x.node+' conf='+c+'</div>';
        }}).join('');
        raw.textContent=JSON.stringify(d,null,2);
        result.classList.add('show');
    }}catch(e){{
        errDiv.textContent='请求失败: '+e.message;errDiv.classList.remove('hidden');
    }}finally{{btn.disabled=false;btn.innerHTML='查询'}}
}};
</script>
</body></html>""", media_type="text/html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port)
