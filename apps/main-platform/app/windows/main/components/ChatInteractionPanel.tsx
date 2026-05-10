"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { LINE_DRAW_EASE } from "../../shared/animation";
import {
  MAIN_CANVAS_EXPANDED,
  MAIN_CANVAS_MENU_OPEN,
  svgToCssPx,
  svgShiftPx,
} from "../../shared/coords";
import { ModelConfigCanvasLines } from "./ModelConfigCanvasLines";
import type { RuntimeModelConfigState } from "@/app/components/runtime/AppRuntimeProvider";
import { findMockQAPair, type TraceCaseId } from "@/app/lib/mock-qa-trace-data";
import { askFederationChat, FederationChatError } from "../services/federation-chat-api";


// ─── BotBubble ────────────────────────────────────────────────────────────────
interface BotBubbleProps {
  msgId: string;
  content: string;
  traceCaseId: TraceCaseId | null;
  showTrace: boolean;
  onTrace: (msgId: string, content: string, traceCaseId: TraceCaseId) => void;
}

function buildMCGroupStateMapFromRuntime(
  state: RuntimeModelConfigState | undefined,
  initialJudgeConfigured: boolean,
): MCGroupStateMap {
  const fallback = createDefaultMCGroupStateMap(initialJudgeConfigured);
  if (!state) return fallback;

  const groupIds: MCGroupId[] = ["local_query", "embedding", "rerank", "judge"];
  return groupIds.reduce((acc, groupId) => {
    const group = state[groupId];
    const fallbackGroup = fallback[groupId];
    acc[groupId] = {
      ...fallbackGroup,
      provider: group.provider,
      model: group.model,
      baseUrl: group.baseUrl,
      apiKey: group.apiKey,
      modelPath: group.modelPath,
      localUrl: group.localUrl,
      isConfigured: group.isConfigured,
      connectError: "",
      connectSuccess: group.isConfigured,
      isConnecting: false,
    };
    return acc;
  }, {} as MCGroupStateMap);
}

function BotBubble({ msgId, content, traceCaseId, showTrace, onTrace }: BotBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const btnOuterRef = useRef<HTMLDivElement>(null);
  const btnInnerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    if (!showTrace) return;

    const bubble = bubbleRef.current;
    const btnOuter = btnOuterRef.current;
    const btnInner = btnInnerRef.current;
    if (!bubble || !btnOuter || !btnInner) return;

    gsap.set(btnOuter, { width: 0 });
    gsap.set(btnInner, { opacity: 0 });

    const targetTraceWidth = TRACE_BUTTON_FIXED_WIDTH;

    const tl = gsap.timeline({ paused: true });

    tl.to(btnOuter, {
      width: targetTraceWidth,
      duration: 0.38,
      ease: LINE_DRAW_EASE,
    }, 0.14);

    tl.to(btnInner, {
      opacity: 1,
      duration: 0.18,
      ease: "power2.out",
    }, 0.38);

    tlRef.current = tl;

    const onEnter = () => tlRef.current?.play(0);
    const onLeave = () => tlRef.current?.reverse();
    bubble.addEventListener("mouseenter", onEnter);
    bubble.addEventListener("mouseleave", onLeave);

    return () => {
      bubble.removeEventListener("mouseenter", onEnter);
      bubble.removeEventListener("mouseleave", onLeave);
      tl.kill();
      tlRef.current = null;
    };
  }, [showTrace]);

  if (!showTrace) {
    return <div className="chat-bubble chat-bubble--bot">{content}</div>;
  }

  return (
    <div ref={bubbleRef} className="chat-bubble chat-bubble--bot chat-bubble--bot-traceable">
      {content}
      <div ref={btnOuterRef} className="trace-btn-outer" aria-hidden="true">
        <div
          ref={btnInnerRef}
          className="trace-btn-inner"
          role="button"
          tabIndex={0}
          aria-label="查看回答溯源"
          onClick={() => {
            if (!traceCaseId) return;
            onTrace(msgId, content, traceCaseId);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !traceCaseId) return;
            onTrace(msgId, content, traceCaseId);
          }}
        >
          溯源
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = "local" | "global";
type MessageRole = "user" | "bot" | "typing";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  traceCaseId?: TraceCaseId;
}

// 模型配置状态机
type MCPhase = "closed" | "opening" | "opened" | "fading_out" | "closing_canvas";
type MCProvider = "OpenAI" | "Ollama" | "Local";
type MCGroupId = "local_query" | "judge" | "embedding" | "rerank";

const MC_MODEL_OPTIONS: Record<MCProvider, string[]> = {
  OpenAI: ["gpt", "qwen", "deepseek"],
  Ollama: ["llama", "deepseek", "gemma", "qwen"],
  Local: ["Auto", "llama", "gemma", "qwen"],
};

interface MCGroupState {
  provider: MCProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  modelPath: string;
  localUrl: string;
  connectError: string;
  connectSuccess: boolean;
  isConnecting: boolean;
  isConfigured: boolean;
}

type MCGroupStateMap = Record<MCGroupId, MCGroupState>;

const MC_GROUP_DEFS: ReadonlyArray<{ id: MCGroupId; title: string }> = [
  { id: "local_query", title: "本地查询模型" },
  { id: "embedding", title: "嵌入模型" },
  { id: "rerank", title: "重排模型" },
  { id: "judge", title: "法官模型" },
];

function createDefaultMCGroupState(): MCGroupState {
  return {
    provider: "OpenAI",
    model: MC_MODEL_OPTIONS.OpenAI[0],
    baseUrl: "",
    apiKey: "",
    modelPath: "",
    localUrl: "",
    connectError: "",
    connectSuccess: false,
    isConnecting: false,
    isConfigured: false,
  };
}

function isSameMCGroupStateMap(prev: MCGroupStateMap, next: MCGroupStateMap): boolean {
  const groupIds: MCGroupId[] = ["local_query", "embedding", "rerank", "judge"];
  return groupIds.every((id) => {
    const prevGroup = prev[id];
    const nextGroup = next[id];
    return (
      prevGroup.provider === nextGroup.provider &&
      prevGroup.model === nextGroup.model &&
      prevGroup.baseUrl === nextGroup.baseUrl &&
      prevGroup.apiKey === nextGroup.apiKey &&
      prevGroup.modelPath === nextGroup.modelPath &&
      prevGroup.localUrl === nextGroup.localUrl &&
      prevGroup.isConfigured === nextGroup.isConfigured &&
      prevGroup.connectError === nextGroup.connectError &&
      prevGroup.connectSuccess === nextGroup.connectSuccess &&
      prevGroup.isConnecting === nextGroup.isConnecting
    );
  });
}

function createDefaultMCGroupStateMap(initialJudgeConfigured = false): MCGroupStateMap {
  return {
    local_query: createDefaultMCGroupState(),
    judge: {
      ...createDefaultMCGroupState(),
      isConfigured: initialJudgeConfigured,
      connectSuccess: initialJudgeConfigured,
    },
    embedding: createDefaultMCGroupState(),
    rerank: createDefaultMCGroupState(),
  };
}

function validateMCGroup(group: MCGroupState): string | null {
  if (group.provider !== "Local") {
    if (!group.baseUrl.trim()) return "接口地址不能为空";
    if (!group.apiKey.trim()) return "API Key 不能为空";
    try { new URL(group.baseUrl); } catch {
      return "接口地址格式不正确，请输入完整 URL";
    }
    return null;
  }

  if (!group.modelPath.trim()) return "请指定模型路径";
  if (group.localUrl.trim()) {
    try { new URL(group.localUrl); } catch {
      return "服务端口格式不正确，请输入完整 URL";
    }
  }
  return null;
}

function buildMCPayload(group: MCGroupState) {
  if (group.provider !== "Local") {
    return {
      provider: group.provider,
      model: group.model,
      baseUrl: group.baseUrl,
      apiKey: group.apiKey,
    };
  }

  return {
    provider: group.provider,
    model: group.model,
    modelPath: group.modelPath,
    localUrl: group.localUrl || "http://localhost:8000/v1",
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BOT_REPLY = "未命中当前预设问答，请使用 README 指定的四组问题之一。";
const TYPING_STAGE_STATIC_DELAY_MS = 550;
const THINKING_TOTAL_DELAY_MS_BY_MODE: Record<Mode, number> = {
  local: 5000,
  global: 15000,
};
const TRACE_BUTTON_FIXED_WIDTH = 96;
const BOT_STREAM_INTERVAL_MS = 26;
const BOT_STREAM_CHUNK_SIZE = 2;

function buildModeMismatchReply(expectedMode: Mode): string {
  if (expectedMode === "global") {
    return "我无法回答你的问题。";
  }
  return "我无法回答你的问题。";
}

function resolveMockReply(question: string, currentMode: Mode): { answer: string; traceCaseId: TraceCaseId | null } {
  const hit = findMockQAPair(question);
  if (!hit) {
    return { answer: BOT_REPLY, traceCaseId: null };
  }

  if (hit.mode !== currentMode) {
    return {
      answer: buildModeMismatchReply(hit.mode),
      traceCaseId: null,
    };
  }

  return {
    answer: hit.answer,
    traceCaseId: hit.traceCaseId,
  };
}

function buildFederationReplyText(result: Awaited<ReturnType<typeof askFederationChat>>): string {
  const statusPrefix =
    result.status === "partial"
      ? "[部分节点失败，已返回可用结果]"
      : result.status === "error"
        ? "[链路异常]"
        : "";

  const detailsText = result.details
    .map((item) => {
      const parts: string[] = [`节点:${item.node}`, `状态:${item.status}`];
      if (typeof item.confidence === "number") {
        parts.push(`置信度:${item.confidence.toFixed(2)}`);
      }
      if (item.answer_preview) {
        parts.push(`摘要:${item.answer_preview}`);
      }
      if (item.detail) {
        parts.push(`错误:${item.detail}`);
      }
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");

  const sections = [
    statusPrefix,
    result.answer,
    detailsText ? `节点明细:\n${detailsText}` : "",
    `请求ID: ${result.requestId}`,
  ].filter(Boolean);

  return sections.join("\n\n");
}

function buildFederationErrorReply(error: unknown): string {
  if (error instanceof FederationChatError) {
    const req = error.requestId ? `\n请求ID: ${error.requestId}` : "";
    return `检索失败：${error.message}${req}`;
  }

  if (error instanceof Error) {
    return `检索失败：${error.message}`;
  }

  return "检索失败：未知异常";
}

export interface ChatInteractionPanelProps {
  menuOpen?: boolean;
  canvasReady?: boolean;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
  onOpenTrace?: (msgId: string, content: string, traceCaseId: TraceCaseId) => void;
  initialJudgeModelConfigured?: boolean;
  onJudgeModelConfiguredChange?: (configured: boolean) => void;
  initialModelConfigState?: RuntimeModelConfigState;
  onModelConfigStateChange?: (state: RuntimeModelConfigState) => void;
}

export function ChatInteractionPanel({
  menuOpen = false,
  canvasReady = false,
  mode = "local",
  onModeChange,
  onOpenTrace,
  initialJudgeModelConfigured = false,
  onJudgeModelConfiguredChange,
  initialModelConfigState,
  onModelConfigStateChange,
}: ChatInteractionPanelProps) {

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSemicircle, setShowSemicircle] = useState(true);
  const [mcToast, setMCToast] = useState("");

  // ── Model config state ──────────────────────────────────────────────────────
  const [mcPhase, setMCPhase] = useState<MCPhase>("closed");
  const [mcGroups, setMCGroups] = useState<MCGroupStateMap>(() =>
    buildMCGroupStateMapFromRuntime(initialModelConfigState, initialJudgeModelConfigured),
  );
  const [mcSaveSummary, setMCSaveSummary] = useState("");
  const [mcSaveSummaryTone, setMCSaveSummaryTone] = useState<"" | "success" | "warning">("");

  // Derived
  const mcMounted = mcPhase !== "closed";
  const mcCanvasOpen = mcPhase === "opening" || mcPhase === "opened" || mcPhase === "fading_out";
  const mcCloseVisible = mcPhase === "opened" || mcPhase === "fading_out";
  const mcAnyConnecting = MC_GROUP_DEFS.some(({ id }) => mcGroups[id].isConnecting);

  // ── Chat refs ───────────────────────────────────────────────────────────────
  const listRef = useRef<HTMLDivElement>(null);
  const semicircleOverlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef(false);
  const pendingEntryIdsRef = useRef<Set<string>>(new Set());
  const bubbleTweensRef = useRef<Map<string, gsap.core.Tween>>(new Map());
  const typingTimerRef = useRef<number | null>(null);
  const botReplyTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  const modeRowRef = useRef<HTMLDivElement>(null);
  const msgMaskRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const revealTlRef = useRef<gsap.core.Timeline | null>(null);

  // ── Model config refs ───────────────────────────────────────────────────────
  const mcPanelLayerRef = useRef<HTMLDivElement>(null);
  const mcPanelRef = useRef<HTMLDivElement>(null);
  const mcHeaderRef = useRef<HTMLDivElement>(null);
  const mcFieldsRef = useRef<HTMLDivElement>(null);
  const mcFooterRef = useRef<HTMLDivElement>(null);
  const mcRevealTlRef = useRef<gsap.core.Timeline | null>(null);

  // ── Layout sync: 坐标驱动定位 ─────────────────────────────────────────────
  // 根层引用（用于写入 CSS 变量 --w4-canvas-left / --w4-canvas-right）
  const layerRef = useRef<HTMLDivElement>(null);
  // 容器实际 CSS 尺寸缓存（ResizeObserver 更新）
  const containerSizeRef = useRef({ w: 0, h: 0 });
  const fileInputRefs = useRef<Record<MCGroupId, HTMLInputElement | null>>({
    local_query: null,
    judge: null,
    embedding: null,
    rerank: null,
  });
  const prevModeRef = useRef<Mode>(mode);

  const toRuntimeModelConfigState = useCallback((groups: MCGroupStateMap): RuntimeModelConfigState => ({
    local_query: {
      provider: groups.local_query.provider,
      model: groups.local_query.model,
      baseUrl: groups.local_query.baseUrl,
      apiKey: groups.local_query.apiKey,
      modelPath: groups.local_query.modelPath,
      localUrl: groups.local_query.localUrl,
      isConfigured: groups.local_query.isConfigured,
    },
    embedding: {
      provider: groups.embedding.provider,
      model: groups.embedding.model,
      baseUrl: groups.embedding.baseUrl,
      apiKey: groups.embedding.apiKey,
      modelPath: groups.embedding.modelPath,
      localUrl: groups.embedding.localUrl,
      isConfigured: groups.embedding.isConfigured,
    },
    rerank: {
      provider: groups.rerank.provider,
      model: groups.rerank.model,
      baseUrl: groups.rerank.baseUrl,
      apiKey: groups.rerank.apiKey,
      modelPath: groups.rerank.modelPath,
      localUrl: groups.rerank.localUrl,
      isConfigured: groups.rerank.isConfigured,
    },
    judge: {
      provider: groups.judge.provider,
      model: groups.judge.model,
      baseUrl: groups.judge.baseUrl,
      apiKey: groups.judge.apiKey,
      modelPath: groups.judge.modelPath,
      localUrl: groups.judge.localUrl,
      isConfigured: groups.judge.isConfigured,
    },
  }), []);

  // ─── Layout sync: CSS 变量更新 ────────────────────────────────────────────
  // 从 MAIN_CANVAS_EXPANDED 坐标推算并写入 CSS 变量，供子元素消费
  const updateLayoutVars = useCallback((w: number, h: number) => {
    const layer = layerRef.current;
    if (!layer || w <= 0 || h <= 0) return;
    const pos = svgToCssPx(w, h, MAIN_CANVAS_EXPANDED);
    layer.style.setProperty("--w4-canvas-left",  `${pos.left}px`);
    layer.style.setProperty("--w4-canvas-right", `${pos.right}px`);
  }, []);

  // ResizeObserver：容器尺寸变化时刷新 CSS 变量
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const sync = () => {
      const { width, height } = layer.getBoundingClientRect();
      containerSizeRef.current = { w: width, h: height };
      updateLayoutVars(width, height);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(layer);
    return () => ro.disconnect();
  }, [updateLayoutVars]);

  // ─── Chat: bubble entry animation ──────────────────────────────────────────
  const animateBubble = useCallback((el: HTMLElement, msgId: string) => {
    bubbleTweensRef.current.get(msgId)?.kill();
    const tween = gsap.fromTo(
      el,
      { opacity: 0, scale: 0.85, y: 24, transformOrigin: "bottom center", force3D: true },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 0.5, ease: "power3.out",
        clearProps: "transform,opacity",
        onKill: () => { bubbleTweensRef.current.delete(msgId); },
        onComplete: () => { bubbleTweensRef.current.delete(msgId); },
      }
    );
    bubbleTweensRef.current.set(msgId, tween);
  }, []);

  // ─── Chat: smooth scroll ───────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        gsap.killTweensOf(list);
        gsap.to(list, {
          scrollTop: list.scrollHeight,
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    });
  }, []);

  // ─── Chat: entry animation for new bubbles ─────────────────────────────────
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || pendingEntryIdsRef.current.size === 0) return;
    const ids = pendingEntryIdsRef.current;
    list
      .querySelectorAll<HTMLElement>(".chat-bubble-wrapper[data-msg-id]")
      .forEach((el) => {
        const id = el.getAttribute("data-msg-id");
        if (id && ids.has(id)) animateBubble(el, id);
      });
    pendingEntryIdsRef.current.clear();
    scrollToBottom();
  }, [messages, animateBubble, scrollToBottom]);

  // ─── Chat: semicircle fade ─────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) { setShowSemicircle(true); return; }
    if (!showSemicircle) return;
    const overlay = semicircleOverlayRef.current;
    if (!overlay) return;
    gsap.to(overlay, {
      opacity: 0, duration: 0.6, ease: "power2.out",
      onComplete: () => setShowSemicircle(false),
    });
  }, [messages.length, showSemicircle]);

  // ─── Chat: kill orphaned tweens ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      bubbleTweensRef.current.forEach((t) => t.kill());
      bubbleTweensRef.current.clear();
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
      if (botReplyTimerRef.current !== null) {
        window.clearTimeout(botReplyTimerRef.current);
      }
      if (streamTimerRef.current !== null) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  // ─── Chat: panel x position with menu ─────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const { w, h } = containerSizeRef.current;
    const shiftPx = w > 0
      ? svgShiftPx(w, h, MAIN_CANVAS_EXPANDED, MAIN_CANVAS_MENU_OPEN).dx
      : -0.15 * (typeof window !== "undefined" ? window.innerWidth : 1440);
    gsap.to(panel, { x: menuOpen ? shiftPx : 0, duration: 0.45, ease: "power3.inOut" });
  }, [menuOpen]);

  // ─── Model config: set initial mc-panel-layer position when mounted ────────
  // 若菜单已展开时才挂载模型配置层，立即对齐到坐标计算值（替代 -15vw 魔法值）
  useLayoutEffect(() => {
    if (!mcMounted) return;
    const layer = mcPanelLayerRef.current;
    if (!layer) return;
    if (menuOpen) {
      const { w, h } = containerSizeRef.current;
      const shiftPx = w > 0
        ? svgShiftPx(w, h, MAIN_CANVAS_EXPANDED, MAIN_CANVAS_MENU_OPEN).dx
        : -0.15 * (typeof window !== "undefined" ? window.innerWidth : 1440);
      gsap.set(layer, { x: shiftPx });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcMounted]);

  // ─── Model config: mc-panel-layer follows menu（坐标驱动，替代 -15vw 魔法值）
  useEffect(() => {
    if (!mcMounted) return;
    const layer = mcPanelLayerRef.current;
    if (!layer) return;
    const { w, h } = containerSizeRef.current;
    const shiftPx = w > 0
      ? svgShiftPx(w, h, MAIN_CANVAS_EXPANDED, MAIN_CANVAS_MENU_OPEN).dx
      : -0.15 * (typeof window !== "undefined" ? window.innerWidth : 1440);
    gsap.to(layer, { x: menuOpen ? shiftPx : 0, duration: 0.45, ease: "power3.inOut" });
  }, [menuOpen, mcMounted]);

  // ─── Chat: initial hide + reveal on canvasReady ────────────────────────────
  useLayoutEffect(() => {
    const targets = [modeRowRef.current, msgMaskRef.current, inputAreaRef.current]
      .filter((el): el is HTMLDivElement => el !== null);
    if (targets.length === 0) return;
    gsap.set(targets, { opacity: 0, y: 24, visibility: "hidden" });
  }, []);

  useEffect(() => {
    if (!canvasReady) return;
    revealTlRef.current?.kill();
    const tl = gsap.timeline();
    revealTlRef.current = tl;

    const sections = [
      { el: modeRowRef.current, at: 0.12, fromY: 16, fromBlur: 5, duration: 0.50, ease: "power3.out" },
      { el: msgMaskRef.current, at: 0.30, fromY: 28, fromBlur: 3, duration: 0.62, ease: "power3.out" },
      { el: inputAreaRef.current, at: 0.50, fromY: 38, fromBlur: 8, duration: 0.68, ease: "back.out(1.4)" },
    ];

    for (const { el, at, fromY, fromBlur, duration, ease } of sections) {
      if (!el) continue;
      gsap.set(el, { visibility: "visible" });
      tl.fromTo(
        el,
        { opacity: 0, y: fromY, filter: `blur(${fromBlur}px)` },
        { opacity: 1, y: 0, filter: "blur(0px)", duration, ease, clearProps: "filter" },
        at,
      );
    }

    return () => { tl.kill(); revealTlRef.current = null; };
  }, [canvasReady]);

  useEffect(() => {
    if (!mcToast) return;
    const timer = setTimeout(() => setMCToast(""), 2200);
    return () => clearTimeout(timer);
  }, [mcToast]);

  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (botReplyTimerRef.current !== null) {
      window.clearTimeout(botReplyTimerRef.current);
      botReplyTimerRef.current = null;
    }
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    isSendingRef.current = false;
    setIsSending(false);
    setMessages([]);
    setShowSemicircle(true);
  }, [mode]);

  const pushValidationReply = useCallback((question: string, validationMessage: string) => {
    const now = Date.now();
    const userId = `msg-${now}-user`;
    const botId = `msg-${now + 1}-bot`;

    pendingEntryIdsRef.current.add(userId);
    pendingEntryIdsRef.current.add(botId);
    setInputValue("");
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: question },
      { id: botId, role: "bot", content: validationMessage },
    ]);
  }, []);

  const getRetrieveValidationMessage = useCallback((currentMode: Mode): string | null => {
    if (!mcGroups.local_query.isConfigured) {
      return "未配置本地查询模型，无法进行本地检索";
    }

    const missingEmbedding = !mcGroups.embedding.isConfigured;
    const missingRerank = !mcGroups.rerank.isConfigured;

    if (missingEmbedding && missingRerank) {
      return "未配置嵌入和重排模型，无法生成回复";
    }
    if (missingRerank) {
      return "未配置重排模型，无法生成回复";
    }
    if (missingEmbedding) {
      return "未配置嵌入模型，无法生成回复";
    }

    if (currentMode === "global" && !mcGroups.judge.isConfigured) {
      return "未配置法官模型，无法进行全局检索";
    }

    return null;
  }, [mcGroups]);

  // ─── Chat: send message ────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isSendingRef.current) return;

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (botReplyTimerRef.current !== null) {
      window.clearTimeout(botReplyTimerRef.current);
      botReplyTimerRef.current = null;
    }
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    const validationMessage = getRetrieveValidationMessage(mode);
    if (validationMessage) {
      pushValidationReply(text, validationMessage);
      return;
    }

    const replyPromise: Promise<{ answer: string; traceCaseId: TraceCaseId | null }> =
      mode === "global"
        ? askFederationChat(text)
            .then((result) => ({ answer: buildFederationReplyText(result), traceCaseId: null }))
            .catch((error: unknown) => ({ answer: buildFederationErrorReply(error), traceCaseId: null }))
        : Promise.resolve(resolveMockReply(text, mode));

    const thinkingTotalDelayMs = THINKING_TOTAL_DELAY_MS_BY_MODE[mode];
    const typingDelayMs = Math.max(0, thinkingTotalDelayMs - TYPING_STAGE_STATIC_DELAY_MS);

    isSendingRef.current = true;
    setIsSending(true);
    setInputValue("");

    const now = Date.now();
    const userId = `msg-${now}-user`;
    const typingId = `msg-${now + 1}-typing`;
    const botId = `msg-${now + 2}-bot`;

    pendingEntryIdsRef.current.add(userId);
    setMessages((prev) => [...prev, { id: userId, role: "user", content: text }]);

    typingTimerRef.current = window.setTimeout(() => {
      typingTimerRef.current = null;
      pendingEntryIdsRef.current.add(typingId);
      setMessages((prev) => [...prev, { id: typingId, role: "typing", content: "" }]);

      botReplyTimerRef.current = window.setTimeout(() => {
        botReplyTimerRef.current = null;
        void (async () => {
          const resolvedReply = await replyPromise;
          if (!isSendingRef.current) {
            return;
          }

          const replyText = resolvedReply.answer;
          const traceCaseId = resolvedReply.traceCaseId;

          pendingEntryIdsRef.current.add(botId);
          setMessages((prev) =>
            prev.filter((m) => m.id !== typingId).concat({
              id: botId,
              role: "bot",
              content: "",
              traceCaseId: traceCaseId ?? undefined,
            })
          );

          let renderedLength = 0;
          streamTimerRef.current = window.setInterval(() => {
            renderedLength = Math.min(replyText.length, renderedLength + BOT_STREAM_CHUNK_SIZE);
            const streamedText = replyText.slice(0, renderedLength);
            setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, content: streamedText } : m)));
            scrollToBottom();

            if (renderedLength >= replyText.length) {
              if (streamTimerRef.current !== null) {
                window.clearInterval(streamTimerRef.current);
                streamTimerRef.current = null;
              }
              isSendingRef.current = false;
              setIsSending(false);
            }
          }, BOT_STREAM_INTERVAL_MS);
        })();
      }, typingDelayMs);
    }, TYPING_STAGE_STATIC_DELAY_MS);
  }, [inputValue, getRetrieveValidationMessage, mode, pushValidationReply, scrollToBottom]);

  const syncInputHeight = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    syncInputHeight(e.target);
  };

  useEffect(() => {
    syncInputHeight(inputRef.current);
  }, [inputValue, syncInputHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const updateMCGroup = useCallback((groupId: MCGroupId, patch: Partial<MCGroupState>) => {
    setMCGroups((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        ...patch,
      },
    }));
  }, []);

  const handleMCProviderChange = useCallback((groupId: MCGroupId, provider: MCProvider) => {
    updateMCGroup(groupId, {
      provider,
      model: MC_MODEL_OPTIONS[provider][0],
      connectError: "",
      connectSuccess: false,
      isConfigured: false,
    });
    setMCSaveSummary("");
    setMCSaveSummaryTone("");
  }, [updateMCGroup]);

  const handleMCFieldDraftChange = useCallback((groupId: MCGroupId, patch: Partial<MCGroupState>) => {
    updateMCGroup(groupId, {
      ...patch,
      connectError: "",
      connectSuccess: false,
      isConfigured: false,
    });
    setMCSaveSummary("");
    setMCSaveSummaryTone("");
  }, [updateMCGroup]);

  // ─── Model config: hide form sections on mount ────────────────────────────
  useLayoutEffect(() => {
    if (!mcMounted) return;
    const targets = [
      mcHeaderRef.current,
      mcFieldsRef.current,
      mcFooterRef.current,
    ].filter((el): el is HTMLDivElement => el !== null);
    const panel = mcPanelRef.current;

    if (panel) {
      gsap.set(panel, {
        "--mc-scrollbar-thumb-alpha": 0,
        "--mc-scrollbar-track-alpha": 0,
      });
    }

    if (targets.length > 0) {
      gsap.set(targets, { visibility: "hidden", opacity: 0, y: 20 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcMounted]);

  // ─── Model config: reveal form when opened ────────────────────────────────
  useEffect(() => {
    if (mcPhase !== "opened") return;

    const targets = [
      mcHeaderRef.current,
      mcFieldsRef.current,
      mcFooterRef.current,
    ].filter((el): el is HTMLDivElement => el !== null);
    const panel = mcPanelRef.current;
    if (targets.length === 0) return;

    mcRevealTlRef.current?.kill();
    const tl = gsap.timeline();
    mcRevealTlRef.current = tl;

    if (panel) {
      gsap.set(panel, {
        "--mc-scrollbar-thumb-alpha": 0,
        "--mc-scrollbar-track-alpha": 0,
      });
      tl.to(panel, {
        "--mc-scrollbar-thumb-alpha": 0.92,
        "--mc-scrollbar-track-alpha": 0.22,
        duration: 0.3,
        ease: "power2.out",
      }, 0.08);
    }

    targets.forEach((el, i) => {
      gsap.set(el, { visibility: "visible" });
      tl.to(el,
        { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" },
        i * 0.06,
      );
    });

    return () => { tl.kill(); };
  }, [mcPhase]);

  // ─── Model config: fade out form then trigger canvas close ────────────────
  useEffect(() => {
    if (mcPhase !== "fading_out") return;

    const targets = [
      mcFooterRef.current,
      mcFieldsRef.current,
      mcHeaderRef.current,
    ].filter((el): el is HTMLDivElement => el !== null);
    const panel = mcPanelRef.current;

    mcRevealTlRef.current?.kill();
    const tl = gsap.timeline({
      onComplete: () => setMCPhase("closing_canvas"),
    });
    mcRevealTlRef.current = tl;

    if (panel) {
      tl.to(panel, {
        "--mc-scrollbar-thumb-alpha": 0,
        "--mc-scrollbar-track-alpha": 0,
        duration: 0.16,
        ease: "power2.in",
      }, 0);
    }

    targets.forEach((el, i) => {
      tl.to(el,
        { opacity: 0, y: -15, duration: 0.18, ease: "power2.in" },
        i * 0.035,
      );
    });

    return () => { tl.kill(); };
  }, [mcPhase]);

  // ─── Model config: open / close handlers ──────────────────────────────────
  const handleMCOpen = useCallback(() => {
    if (mcPhase !== "closed") return;
    setMCSaveSummary("");
    setMCSaveSummaryTone("");
    setMCPhase("opening");
  }, [mcPhase]);

  const handleMCClose = useCallback(() => {
    if (mcPhase === "opened") {
      setMCPhase("fading_out");
      return;
    }
    if (mcPhase === "opening") {
      setMCPhase("closing_canvas");
    }
  }, [mcPhase]);

  useEffect(() => {
    if (mcPhase !== "opened") return;

    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleMCClose();
    };

    window.addEventListener("keydown", handleEscClose);
    return () => {
      window.removeEventListener("keydown", handleEscClose);
    };
  }, [mcPhase, handleMCClose]);

  const handleModeSwitch = useCallback((checked: boolean) => {
    if (!checked) {
      onModeChange?.("local");
      return;
    }
    if (!mcGroups.judge.isConfigured) {
      setMCToast("未配置法官模型，无法进行全局检索");
      onModeChange?.("local");
      return;
    }
    onModeChange?.("global");
  }, [mcGroups.judge.isConfigured, onModeChange]);

  // ─── Model config: connect ─────────────────────────────────────────────────
  const handleMCConnect = useCallback(async () => {
    const snapshot = mcGroups;
    const nextGroups: MCGroupStateMap = {
      local_query: { ...snapshot.local_query },
      embedding: { ...snapshot.embedding },
      rerank: { ...snapshot.rerank },
      judge: { ...snapshot.judge },
    };
    let successCount = 0;
    let failedCount = 0;

    setMCSaveSummary("");
    setMCSaveSummaryTone("");

    for (const { id } of MC_GROUP_DEFS) {
      const group = snapshot[id];
      const validationError = validateMCGroup(group);

      if (validationError) {
        failedCount += 1;
        nextGroups[id] = {
          ...nextGroups[id],
          isConnecting: false,
          connectError: validationError,
          connectSuccess: false,
          isConfigured: false,
        };
        updateMCGroup(id, {
          isConnecting: false,
          connectError: validationError,
          connectSuccess: false,
          isConfigured: false,
        });
        continue;
      }

      updateMCGroup(id, {
        isConnecting: true,
        connectError: "",
        connectSuccess: false,
      });

      try {
        const res = await fetch("/api/model-config/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildMCPayload(group)),
        });
        const data = await res.json() as { error?: string };

        if (!res.ok) {
          failedCount += 1;
          nextGroups[id] = {
            ...nextGroups[id],
            isConnecting: false,
            connectError: data.error ?? "连接失败，请检查 API Key 和网络设置",
            connectSuccess: false,
            isConfigured: false,
          };
          updateMCGroup(id, {
            isConnecting: false,
            connectError: data.error ?? "连接失败，请检查 API Key 和网络设置",
            connectSuccess: false,
            isConfigured: false,
          });
        } else {
          successCount += 1;
          nextGroups[id] = {
            ...nextGroups[id],
            isConnecting: false,
            connectError: "",
            connectSuccess: true,
            isConfigured: true,
          };
          updateMCGroup(id, {
            isConnecting: false,
            connectError: "",
            connectSuccess: true,
            isConfigured: true,
          });
        }
      } catch {
        failedCount += 1;
        nextGroups[id] = {
          ...nextGroups[id],
          isConnecting: false,
          connectError: "连接失败，请检查 API Key 和网络设置",
          connectSuccess: false,
          isConfigured: false,
        };
        updateMCGroup(id, {
          isConnecting: false,
          connectError: "连接失败，请检查 API Key 和网络设置",
          connectSuccess: false,
          isConfigured: false,
        });
      }
    }

    const persistedState = toRuntimeModelConfigState(nextGroups);
    onModelConfigStateChange?.(persistedState);

    if (successCount === MC_GROUP_DEFS.length) {
      setMCSaveSummary("全部模型连接成功");
      setMCSaveSummaryTone("success");
      return;
    }

    if (successCount > 0 && failedCount > 0) {
      setMCSaveSummary("部分模型连接成功，请检查未通过项");
      setMCSaveSummaryTone("warning");
      return;
    }

    if (failedCount > 0) {
      setMCSaveSummary("连接未完成，请检查配置项");
      setMCSaveSummaryTone("warning");
    }
  }, [
    mcGroups,
    onModelConfigStateChange,
    toRuntimeModelConfigState,
    updateMCGroup,
  ]);

  const handleMCBrowse = useCallback((groupId: MCGroupId) => {
    fileInputRefs.current[groupId]?.click();
  }, []);

  const handleMCFileSelect = useCallback((groupId: MCGroupId, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleMCFieldDraftChange(groupId, { modelPath: file.name });
  }, [handleMCFieldDraftChange]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div ref={layerRef} className="chat-interaction-layer" data-menu-open={menuOpen} data-mode={mode}>

      {mcToast && (
        <div className="chat-toast" role="status" aria-live="polite">
          {mcToast}
        </div>
      )}

      {/* ── Model Config Overlay ─────────────────────────────────────────── */}
      {mcMounted && (
        <>
          {/* Canvas SVG layer */}
          <div className="mc-canvas-layer">
            <ModelConfigCanvasLines
              open={mcCanvasOpen}
              menuOpen={menuOpen}
              onOpenComplete={() => setMCPhase("opened")}
              onCloseComplete={() => setMCPhase("closed")}
            />
          </div>

          <div
            className={`mc-canvas-close-anchor${mcCloseVisible ? " mc-canvas-close-anchor--visible" : ""}`}
            aria-hidden={!mcCloseVisible}
          >
            <button
              className="mc-close-btn"
              onClick={handleMCClose}
              aria-label="关闭模型配置"
              type="button"
            >
              <span className="mc-close-x" aria-hidden="true" />
            </button>
          </div>

          {/* Form panel layer — 跟随菜单同步左移（照搬 panelRef 逻辑） */}
          <div ref={mcPanelLayerRef} className="mc-panel-layer">
            <div ref={mcPanelRef} className="mc-panel">

              {/* Header */}
              <div ref={mcHeaderRef} className="mc-panel-header">
                <div className="mc-panel-title-group">
                  <span className="mc-eyebrow">MODEL CONFIG</span>
                  <h2 className="mc-panel-title">模型配置</h2>
                </div>
              </div>

              <div ref={mcFieldsRef} className="mc-groups">
                {MC_GROUP_DEFS.map(({ id, title }) => {
                  const group = mcGroups[id];
                  const baseId = `mc-${id}`;

                  return (
                    <section key={id} className="mc-group">
                      <h3 className="mc-group-title">{title}</h3>

                      <div className="mc-provider-row">
                        {(["OpenAI", "Ollama", "Local"] as MCProvider[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={`mc-provider-item${group.provider === p ? " mc-provider-item--active" : ""}`}
                            onClick={() => handleMCProviderChange(id, p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <div className="mc-model-row">
                        <span className="mc-model-label">模型</span>
                        <div className="mc-model-options">
                          {MC_MODEL_OPTIONS[group.provider].map((m, i, arr) => (
                            <span key={`${id}-${m}`} className="mc-model-slot">
                              <button
                                type="button"
                                className={`mc-model-item${group.model === m ? " mc-model-item--active" : ""}`}
                                onClick={() => handleMCFieldDraftChange(id, { model: m })}
                              >
                                {m}
                              </button>
                              {i < arr.length - 1 && (
                                <span className="mc-model-divider" aria-hidden="true">/</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mc-fields">
                        {group.provider !== "Local" ? (
                          <>
                            <div className="mc-field">
                              <label className="mc-field-label" htmlFor={`${baseId}-base-url`}>
                                接口地址 (Base URL)
                              </label>
                              <input
                                id={`${baseId}-base-url`}
                                className="mc-field-input"
                                type="url"
                                value={group.baseUrl}
                                onChange={(e) => handleMCFieldDraftChange(id, { baseUrl: e.target.value })}
                                placeholder="https://api.openai.com/v1"
                                autoComplete="off"
                              />
                            </div>
                            <div className="mc-field">
                              <label className="mc-field-label" htmlFor={`${baseId}-api-key`}>
                                API Key
                              </label>
                              <input
                                id={`${baseId}-api-key`}
                                className="mc-field-input"
                                type="password"
                                value={group.apiKey}
                                onChange={(e) => handleMCFieldDraftChange(id, { apiKey: e.target.value })}
                                placeholder="sk-…"
                                autoComplete="new-password"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mc-field">
                              <label className="mc-field-label" htmlFor={`${baseId}-model-path`}>
                                模型路径 (Model Path)
                              </label>
                              <div className="mc-field-path-row">
                                <input
                                  id={`${baseId}-model-path`}
                                  className="mc-field-input"
                                  type="text"
                                  value={group.modelPath}
                                  onChange={(e) => handleMCFieldDraftChange(id, { modelPath: e.target.value })}
                                  placeholder="/path/to/model.gguf"
                                  autoComplete="off"
                                />
                                <button
                                  type="button"
                                  className="mc-browse-btn"
                                  onClick={() => handleMCBrowse(id)}
                                >
                                  浏览
                                </button>
                              </div>
                              <span className="mc-field-hint">
                                请选择本地模型文件 (.gguf, .bin) 或项目环境路径
                              </span>
                              <input
                                ref={(el) => { fileInputRefs.current[id] = el; }}
                                type="file"
                                accept=".gguf,.bin"
                                style={{ display: "none" }}
                                onChange={(e) => handleMCFileSelect(id, e)}
                              />
                            </div>
                            <div className="mc-field">
                              <label className="mc-field-label" htmlFor={`${baseId}-local-url`}>
                                服务端口 (Localhost URL)
                              </label>
                              <input
                                id={`${baseId}-local-url`}
                                className="mc-field-input"
                                type="url"
                                value={group.localUrl}
                                onChange={(e) => handleMCFieldDraftChange(id, { localUrl: e.target.value })}
                                placeholder="http://localhost:8000/v1"
                                autoComplete="off"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {group.connectError && (
                        <p className="mc-group-error" role="alert">{group.connectError}</p>
                      )}
                      {group.connectSuccess && !group.connectError && (
                        <p className="mc-group-success">连接成功</p>
                      )}
                    </section>
                  );
                })}
              </div>

              {/* Footer */}
              <div ref={mcFooterRef} className="mc-footer">
                {mcSaveSummary && (
                  <p className={`mc-save-summary${mcSaveSummaryTone ? ` mc-save-summary--${mcSaveSummaryTone}` : ""}`}>
                    {mcSaveSummary}
                  </p>
                )}
                <button
                  type="button"
                  className="mc-save-btn"
                  onClick={handleMCConnect}
                  disabled={mcAnyConnecting}
                  aria-busy={mcAnyConnecting}
                >
                  {mcAnyConnecting ? "连接中…" : "保存并连接"}
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ── Chat Panel ───────────────────────────────────────────────────── */}
      <div ref={panelRef} className="chat-interaction-panel">
        <div className="chat-content-wrap">

          {/* ── Mode Toggle + Model Config Trigger ── */}
          <div ref={modeRowRef} className="chat-mode-row">
            <label htmlFor="mode-switch" className="switch" aria-label="切换模式">
              <input
                id="mode-switch"
                type="checkbox"
                checked={mode === "global"}
                onChange={(e) => handleModeSwitch(e.target.checked)}
              />
              <span>本地</span>
              <span>全局</span>
            </label>

            {/* 按钮结构完全照搬 README animated-button，文案改为"模型配置" */}
            <button
              type="button"
              className="animated-button"
              onClick={handleMCOpen}
              disabled={mcPhase !== "closed"}
              aria-label="打开模型配置"
            >
              <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
              <span className="text">模型配置</span>
              <span className="circle" />
              <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
              </svg>
            </button>
          </div>

          {/* ── Messages Area ── */}
          <div
            ref={msgMaskRef}
            className="chat-messages-mask"
          >
            <div
              ref={listRef}
              className="chat-messages-list"
            >
              <div className="chat-messages-inner">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    data-msg-id={msg.id}
                    data-flip-id={msg.id}
                    className={`chat-bubble-wrapper chat-bubble-wrapper--${msg.role}`}
                  >
                    {msg.role === "typing" ? (
                      <div className="chat-bubble chat-bubble--bot chat-bubble--typing">
                        <span className="chat-typing-dot" />
                        <span className="chat-typing-dot" />
                        <span className="chat-typing-dot" />
                      </div>
                    ) : msg.role === "bot" ? (
                      <BotBubble
                        msgId={msg.id}
                        content={msg.content}
                        traceCaseId={msg.traceCaseId ?? null}
                        showTrace={Boolean(msg.traceCaseId)}
                        onTrace={onOpenTrace ?? (() => { })}
                      />
                    ) : (
                      <div className={`chat-bubble chat-bubble--${msg.role}`}>{msg.content}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {showSemicircle && (
              <div ref={semicircleOverlayRef} className="chat-semicircle-overlay" aria-hidden="true">
                <div className="semicircle">
                  <div><div><div><div><div><div><div><div></div></div></div></div></div></div></div></div>
                </div>
              </div>
            )}
          </div>

          {/* ── Input Area ── */}
          <div ref={inputAreaRef} className="chat-input-area">
            <div className="chat-input-wrap">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="输入问题，按 Enter 发送…"
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isSending}
                aria-label="消息输入框"
              />
              <button
                type="button"
                className="button"
                onClick={handleSend}
                disabled={isSending || !inputValue.trim()}
                aria-label="发送消息"
              >
                <div className="button-box">
                  <span className="button-elem">
                    <svg viewBox="0 0 46 40" xmlns="http://www.w3.org/2000/svg">
                      <path d="M46 20.038c0-.7-.3-1.5-.8-2.1l-16-17c-1.1-1-3.2-1.4-4.4-.3-1.2 1.1-1.2 3.3 0 4.4l11.3 11.9H3c-1.7 0-3 1.3-3 3s1.3 3 3 3h33.1l-11.3 11.9c-1 1-1.2 3.3 0 4.4 1.2 1.1 3.3.8 4.4-.3l16-17c.5-.5.8-1.1.8-1.9z" />
                    </svg>
                  </span>
                  <span className="button-elem">
                    <svg viewBox="0 0 46 40" xmlns="http://www.w3.org/2000/svg">
                      <path d="M46 20.038c0-.7-.3-1.5-.8-2.1l-16-17c-1.1-1-3.2-1.4-4.4-.3-1.2 1.1-1.2 3.3 0 4.4l11.3 11.9H3c-1.7 0-3 1.3-3 3s1.3 3 3 3h33.1l-11.3 11.9c-1 1-1.2 3.3 0 4.4 1.2 1.1 3.3.8 4.4-.3l16-17c.5-.5.8-1.1.8-1.9z" />
                    </svg>
                  </span>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
