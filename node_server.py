"""
节点服务 - Mock 版，不依赖实际项目代码，纯测通信层
用法（开三个终端）：
  python node_server.py --port 8001 --node-id node_a
  python node_server.py --port 8002 --node-id node_b
  python node_server.py --port 8003 --node-id node_c
"""
import argparse, json, base64, uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

# ---- 硬编码单节点检索（替换成你的 query_single_node） ----
NODE_KNOWLEDGE = {
    "nodea": {
        "keywords": ["数据安全", "联邦学习", "隐私保护"],
        "default_answer": "节点A认为：数据安全法的核心要求是'数据不出域、可用不可见'，联邦学习范式为分布式场景下的合规检索提供了基础路径。"
    },
    "nodeb": {
        "keywords": ["知识图谱", "多模态", "GraphRAG"],
        "default_answer": "节点B认为：图结构检索增强生成能有效提升多跳推理的准确率，Leiden社区检测算法是本方案的核心技术支撑。"
    },
    "nodec": {
        "keywords": ["MiA-Emb", "嵌入模型", "双通道"],
        "default_answer": "节点C认为：双通道检索将查询解耦为显式实体词与隐式概念词，分别走向量通道和社区通道，兼顾细粒度与全局语义。"
    },
}

def query_single_node(question: str, node_id: str) -> dict:
    kw = NODE_KNOWLEDGE.get(node_id, {})
    # 模拟根据问题关键词匹配不同答案
    for keyword in kw.get("keywords", []):
        if keyword in question:
            return {
                "answer": f"[{node_id}][匹配关键词:{keyword}] " + kw["default_answer"],
                "confidence": 0.88,
                "sources": [f"{node_id}_doc1.pdf"]
            }
    # 默认返回
    return {
        "answer": f"[{node_id}] " + kw.get("default_answer", "未找到相关结果"),
        "confidence": 0.65,
        "sources": []
    }

# ---- SM4 加解密 ----
from sm4 import SM4Key
SM4_KEY = b'ness-python-key!'[:16].ljust(16, b'\x00')
_sm4 = SM4Key(SM4_KEY)

def simple_encrypt(text: str) -> str:
    encrypted_bytes = _sm4.encrypt(text.encode('utf-8'), padding=True)
    return base64.b64encode(encrypted_bytes).decode()

def simple_decrypt(encrypted: str) -> str:
    encrypted_bytes = base64.b64decode(encrypted.encode())
    return _sm4.decrypt(encrypted_bytes, padding=True).decode('utf-8')
# ---- FastAPI 服务 ----
app = FastAPI(title=f"Node Server")

class QueryRequest(BaseModel):
    encrypted_query: str

class QueryResponse(BaseModel):
    encrypted_result: str

@app.post("/query", response_model=QueryResponse)
async def handle_query(req: QueryRequest):
    question = simple_decrypt(req.encrypted_query)
    result = query_single_node(question, args.node_id)
    encrypted = simple_encrypt(json.dumps(result, ensure_ascii=False))
    return {"encrypted_result": encrypted}

@app.get("/health")
async def health():
    return {"status": "ok", "node_id": args.node_id}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--node-id", default="node_a")
    args = parser.parse_args()
    uvicorn.run(app, host="0.0.0.0", port=args.port)
