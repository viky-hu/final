"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VIS_SCRIPT_SRC = "/trace/lib/vis-9.1.2/vis-network.min.js";
const VIS_STYLE_HREF = "/trace/lib/vis-9.1.2/vis-network.css";
const TRACE_GRAPH_DATA_URL = "/trace/trace-knowledge-graph-reduced.json";

type GraphStatus = "loading" | "ready" | "error";

interface TraceGraphNode {
  id: string;
  label: string;
  title: string;
  group: string;
  color: string;
  shape: string;
  size: number;
}

interface TraceGraphEdge {
  from: string;
  to: string;
  width: number;
  title: string;
  smooth: boolean;
  color: string;
}

interface TraceGraphMeta {
  generatedAt: string;
  sourceNodeCount: number;
  sourceEdgeCount: number;
  keptNodeCount: number;
  keptEdgeCount: number;
  targetRatio: number;
  sourceGraphBytes: number;
  centerRoots: string[];
}

interface TraceGraphPayload {
  meta: TraceGraphMeta;
  nodes: TraceGraphNode[];
  edges: TraceGraphEdge[];
}

interface VisNetworkInstance {
  destroy: () => void;
  fit: (options?: unknown) => void;
  on: (event: string, handler: (params: { nodes: string[] }) => void) => void;
  once: (event: string, handler: () => void) => void;
  setOptions: (options: unknown) => void;
}

interface VisNamespace {
  Network: new (
    container: HTMLElement,
    data: { nodes: TraceGraphNode[]; edges: TraceGraphEdge[] },
    options: Record<string, unknown>,
  ) => VisNetworkInstance;
}

declare global {
  interface Window {
    vis?: VisNamespace;
  }
}

let visScriptPromise: Promise<void> | null = null;

function ensureVisStylesheet(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[data-trace-vis="${VIS_STYLE_HREF}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = VIS_STYLE_HREF;
  link.dataset.traceVis = VIS_STYLE_HREF;
  document.head.appendChild(link);
}

function loadVisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is not available"));
  }
  if (window.vis?.Network) {
    return Promise.resolve();
  }
  if (visScriptPromise) return visScriptPromise;

  visScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-trace-vis="${VIS_SCRIPT_SRC}"]`);
    if (existing) {
      if (window.vis?.Network) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("vis-network 脚本加载失败")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = VIS_SCRIPT_SRC;
    script.async = true;
    script.dataset.traceVis = VIS_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("vis-network 脚本加载失败"));
    document.body.appendChild(script);
  });

  return visScriptPromise;
}

export interface TraceKnowledgeGraphProps {
  onExit?: () => void;
}

export function TraceKnowledgeGraph({ onExit }: TraceKnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<VisNetworkInstance | null>(null);

  const [status, setStatus] = useState<GraphStatus>("loading");
  const [errorText, setErrorText] = useState<string>("");
  const [meta, setMeta] = useState<TraceGraphMeta | null>(null);

  const summaryText = "可放大图谱查看详细内容";

  const bottomNodeCountText = useMemo(() => {
    if (!meta) return "节点数：读取中";
    return `节点数：${meta.keptNodeCount}`;
  }, [meta]);

  const bottomEdgeCountText = useMemo(() => {
    if (!meta) return "边数：读取中";
    return `边数：${meta.keptEdgeCount}`;
  }, [meta]);

  const bottomKeywordsText = useMemo(() => {
    const centerRoots = meta?.centerRoots ?? [];
    if (!centerRoots.length) return "中心关键词：读取中";
    return `中心关键词：${centerRoots.join("、")}`;
  }, [meta]);

  const handleFit = useCallback(() => {
    networkRef.current?.fit({
      animation: {
        duration: 420,
        easingFunction: "easeInOutQuad",
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function mountGraph() {
      try {
        setStatus("loading");
        setErrorText("");

        ensureVisStylesheet();
        await loadVisScript();

        const response = await fetch(TRACE_GRAPH_DATA_URL, { cache: "force-cache" });
        if (!response.ok) {
          throw new Error(`图谱数据加载失败（HTTP ${response.status}）`);
        }

        const payload = (await response.json()) as TraceGraphPayload;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) {
          throw new Error("图谱容器不存在");
        }

        const vis = window.vis;
        if (!vis?.Network) {
          throw new Error("vis-network 初始化失败");
        }

        const options: Record<string, unknown> = {
          autoResize: true,
          layout: {
            improvedLayout: true,
            randomSeed: 23,
          },
          interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            hover: true,
            hideEdgesOnDrag: false,
            hideNodesOnDrag: false,
            navigationButtons: false,
            keyboard: false,
          },
          nodes: {
            borderWidth: 1,
            borderWidthSelected: 2,
            font: {
              face: "DingTalk JinBuTi, sans-serif",
              color: "#0f172a",
              size: 12,
            },
            scaling: {
              min: 9,
              max: 34,
            },
          },
          edges: {
            color: {
              color: "rgba(0,71,255,0.32)",
              highlight: "rgba(0,71,255,0.78)",
              hover: "rgba(0,71,255,0.62)",
            },
            smooth: {
              enabled: true,
              type: "dynamic",
            },
          },
          physics: {
            enabled: true,
            solver: "barnesHut",
            barnesHut: {
              gravitationalConstant: -2200,
              centralGravity: 0.38,
              springLength: 130,
              springConstant: 0.05,
              damping: 0.16,
              avoidOverlap: 0.18,
            },
            stabilization: {
              enabled: true,
              iterations: 380,
              fit: true,
              updateInterval: 32,
            },
          },
        };

        networkRef.current?.destroy();
        const network = new vis.Network(
          container,
          {
            nodes: payload.nodes,
            edges: payload.edges,
          },
          options,
        );
        networkRef.current = network;

        network.once("stabilizationIterationsDone", () => {
          network.setOptions({
            physics: {
              stabilization: false,
            },
          });
        });

        setMeta(payload.meta);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "图谱初始化失败";
        setErrorText(message);
        setStatus("error");
      }
    }

    mountGraph();

    return () => {
      cancelled = true;
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, []);

  return (
    <div className="trace-graph-shell" aria-label="知识图谱视图">
      <header className="trace-graph-header">
        <div className="trace-graph-title-group">
          <h2 className="trace-graph-title">知识图谱</h2>
          <p className="trace-graph-summary">{summaryText}</p>
        </div>
        <button
          type="button"
          className="trace-graph-reset-btn"
          onClick={handleFit}
          disabled={status !== "ready"}
        >
          重置视图
        </button>
      </header>

      <div className="trace-graph-stage-wrap">
        <div ref={containerRef} className="trace-graph-stage" />

        {status === "loading" && (
          <div className="trace-graph-mask" role="status" aria-live="polite">
            图谱加载中…
          </div>
        )}

        {status === "error" && (
          <div className="trace-graph-mask trace-graph-mask--error" role="alert">
            {errorText || "图谱加载失败"}
          </div>
        )}
      </div>

      <footer className="trace-graph-footer">
        <p className="trace-graph-center-roots">{bottomNodeCountText}</p>
        <p className="trace-graph-center-roots">{bottomEdgeCountText}</p>
        <p className="trace-graph-center-roots">{bottomKeywordsText}</p>
      </footer>

      <div className="trace-graph-exit-wrap">
        <button
          type="button"
          className="trace-graph-exit-btn"
          onClick={onExit}
          aria-label="退出知识溯源页面"
        >
          退出页面
        </button>
      </div>
    </div>
  );
}
