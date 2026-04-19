"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { LINE_DRAW_EASE } from "../../shared/animation";
import { ModelConfigCanvasLines } from "./ModelConfigCanvasLines";

gsap.registerPlugin(Flip);

// ─── BotBubble ────────────────────────────────────────────────────────────────
interface BotBubbleProps {
  msgId: string;
  content: string;
  showTrace: boolean;
  onTrace: (msgId: string, content: string) => void;
}

function BotBubble({ msgId, content, showTrace, onTrace }: BotBubbleProps) {
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

    const tl = gsap.timeline({ paused: true });

    tl.to(btnOuter, {
      width: TRACE_BUTTON_WIDTH,
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
          onClick={() => onTrace(msgId, content)}
          onKeyDown={(e) => e.key === "Enter" && onTrace(msgId, content)}
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
const BOT_REPLY = "这是模拟回答，后续将接入实际代码。";
const TYPING_STAGE_STATIC_DELAY_MS = 550;
const THINKING_TOTAL_DELAY_MS_BY_MODE: Record<Mode, number> = {
  local: 5000,
  global: 15000,
};
const TRACE_BUTTON_WIDTH = 80;

interface MockQAPair {
  matchers: string[];
  answer: string;
}

const MOCK_QA_PAIRS: MockQAPair[] = [
  {
    matchers: ["中国法制史配套测试", "动产担保权公示及优先顺位规则研究", "法学教育中的定位"],
    answer:
      "《中国法制史配套测试》旨在帮助法学院校学生掌握法律专业知识和培养法律思维能力，属于《高校法学专业核心课程配套测试丛书》系列，考点全面、题量充足、解答详尽且应试性强；《动产担保权公示及优先顺位规则研究》则基于我国动产担保实践，深入探讨动产担保的公示制度与优先顺位规则，并提出相关法律对策，以期为完善我国动产担保制度提供立法建议和法理支持。",
  },
  {
    matchers: ["秭归县茅坪镇九里村", "故意杀人案", "江苏南通", "山东临沂", "孟某"],
    answer:
      "在秭归县茅坪镇九里村的案件中，唐某某因矛盾纠纷持刀将郭某某当场杀死，具有明显的故意杀人动机和直接的致死结果，因此被采取刑事强制措施；而在江苏南通和山东临沂的案件中，孟某的具体犯罪行为尚未完全明确，且没有直接导致人员死亡的结果，因此案件仍在进一步侦办中，未明确具体的法律定性。",
  },
];

function normalizeForMockQa(input: string): string {
  return input.replace(/\s+/g, "").replace(/[“”"'‘’]/g, "");
}

function resolveMockReply(question: string): string {
  const normalized = normalizeForMockQa(question);
  const hit = MOCK_QA_PAIRS.find((pair) =>
    pair.matchers.every((matcher) => normalized.includes(normalizeForMockQa(matcher))),
  );
  return hit?.answer ?? BOT_REPLY;
}

export interface ChatInteractionPanelProps {
  menuOpen?: boolean;
  canvasReady?: boolean;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
  onOpenTrace?: (msgId: string, content: string) => void;
  initialJudgeModelConfigured?: boolean;
  onJudgeModelConfiguredChange?: (configured: boolean) => void;
}

export function ChatInteractionPanel({
  menuOpen = false,
  canvasReady = false,
  mode = "local",
  onModeChange,
  onOpenTrace,
  initialJudgeModelConfigured = false,
  onJudgeModelConfiguredChange,
}: ChatInteractionPanelProps) {

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSemicircle, setShowSemicircle] = useState(true);
  const [mcToast, setMCToast] = useState("");

  // ── Model config state ──────────────────────────────────────────────────────
  const [mcPhase, setMCPhase] = useState<MCPhase>("closed");
  const [mcGroups, setMCGroups] = useState<MCGroupStateMap>(
    () => createDefaultMCGroupStateMap(initialJudgeModelConfigured),
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
  const pendingFlipRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const pendingEntryIdsRef = useRef<Set<string>>(new Set());
  const bubbleTweensRef = useRef<Map<string, gsap.core.Tween>>(new Map());
  const scrollHandledByFlipRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  const botReplyTimerRef = useRef<number | null>(null);

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
  const fileInputRefs = useRef<Record<MCGroupId, HTMLInputElement | null>>({
    local_query: null,
    judge: null,
    embedding: null,
    rerank: null,
  });

  // ─── Chat: FLIP helper ─────────────────────────────────────────────────────
  const captureFlip = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const nodes = list.querySelectorAll<HTMLElement>(".chat-bubble-wrapper");
    const settled = Array.from(nodes).filter((el) => {
      const id = el.getAttribute("data-msg-id");
      return !id || !bubbleTweensRef.current.has(id);
    });
    if (settled.length > 0) {
      pendingFlipRef.current = Flip.getState(settled);
    }
  }, []);

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
        gsap.to(list, { scrollTop: list.scrollHeight, duration: 0.6, ease: "power3.out" });
      });
    });
  }, []);

  // ─── Chat: apply pending FLIP ──────────────────────────────────────────────
  useLayoutEffect(() => {
    scrollHandledByFlipRef.current = false;
    if (pendingFlipRef.current) {
      scrollHandledByFlipRef.current = true;
      Flip.from(pendingFlipRef.current, {
        targets: ".chat-bubble-wrapper",
        duration: 0.35,
        ease: "power3.out",
        stagger: 0.01,
        onComplete: () => {
          pendingFlipRef.current = null;
          scrollToBottom();
        },
      });
      pendingFlipRef.current = null;
    }
  }, [messages, scrollToBottom]);

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
    if (!scrollHandledByFlipRef.current) scrollToBottom();
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
    };
  }, []);

  // ─── Chat: panel x position with menu ─────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    gsap.to(panel, { x: menuOpen ? "-15vw" : "0vw", duration: 0.45, ease: "power3.inOut" });
  }, [menuOpen]);

  // ─── Model config: set initial mc-panel-layer position when mounted ────────
  // 若菜单已展开时才挂载模型配置层，立即对齐到 -15vw（照搬 panelRef 逻辑）
  useLayoutEffect(() => {
    if (!mcMounted) return;
    const layer = mcPanelLayerRef.current;
    if (!layer) return;
    if (menuOpen) gsap.set(layer, { x: "-15vw" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcMounted]);

  // ─── Model config: mc-panel-layer follows menu （照搬 panelRef 逻辑）────────
  useEffect(() => {
    if (!mcMounted) return;
    const layer = mcPanelLayerRef.current;
    if (!layer) return;
    gsap.to(layer, { x: menuOpen ? "-15vw" : "0vw", duration: 0.45, ease: "power3.inOut" });
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
    onJudgeModelConfiguredChange?.(mcGroups.judge.isConfigured);
  }, [mcGroups.judge.isConfigured, onJudgeModelConfiguredChange]);

  const pushValidationReply = useCallback((question: string, validationMessage: string) => {
    const now = Date.now();
    const userId = `msg-${now}-user`;
    const botId = `msg-${now + 1}-bot`;

    captureFlip();
    pendingEntryIdsRef.current.add(userId);
    pendingEntryIdsRef.current.add(botId);
    setInputValue("");
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: question },
      { id: botId, role: "bot", content: validationMessage },
    ]);
  }, [captureFlip]);

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

    const validationMessage = getRetrieveValidationMessage(mode);
    if (validationMessage) {
      pushValidationReply(text, validationMessage);
      return;
    }

    const replyText = resolveMockReply(text);
    const thinkingTotalDelayMs = THINKING_TOTAL_DELAY_MS_BY_MODE[mode];
    const typingDelayMs = Math.max(0, thinkingTotalDelayMs - TYPING_STAGE_STATIC_DELAY_MS);

    isSendingRef.current = true;
    setIsSending(true);
    setInputValue("");

    const now = Date.now();
    const userId = `msg-${now}-user`;
    const typingId = `msg-${now + 1}-typing`;
    const botId = `msg-${now + 2}-bot`;

    captureFlip();
    pendingEntryIdsRef.current.add(userId);
    setMessages((prev) => [...prev, { id: userId, role: "user", content: text }]);

    typingTimerRef.current = window.setTimeout(() => {
      typingTimerRef.current = null;
      captureFlip();
      pendingEntryIdsRef.current.add(typingId);
      setMessages((prev) => [...prev, { id: typingId, role: "typing", content: "" }]);

      botReplyTimerRef.current = window.setTimeout(() => {
        botReplyTimerRef.current = null;
        captureFlip();
        pendingEntryIdsRef.current.add(botId);
        setMessages((prev) =>
          prev.filter((m) => m.id !== typingId).concat({ id: botId, role: "bot", content: replyText })
        );
        isSendingRef.current = false;
        setIsSending(false);
      }, typingDelayMs);
    }, TYPING_STAGE_STATIC_DELAY_MS);
  }, [inputValue, captureFlip, getRetrieveValidationMessage, mode, pushValidationReply]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

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
    let successCount = 0;
    let failedCount = 0;

    setMCSaveSummary("");
    setMCSaveSummaryTone("");

    for (const { id } of MC_GROUP_DEFS) {
      const group = snapshot[id];
      const validationError = validateMCGroup(group);

      if (validationError) {
        failedCount += 1;
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
          updateMCGroup(id, {
            isConnecting: false,
            connectError: data.error ?? "连接失败，请检查 API Key 和网络设置",
            connectSuccess: false,
            isConfigured: false,
          });
        } else {
          successCount += 1;
          updateMCGroup(id, {
            isConnecting: false,
            connectError: "",
            connectSuccess: true,
            isConfigured: true,
          });
        }
      } catch {
        failedCount += 1;
        updateMCGroup(id, {
          isConnecting: false,
          connectError: "连接失败，请检查 API Key 和网络设置",
          connectSuccess: false,
          isConfigured: false,
        });
      }
    }

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
  }, [mcGroups, updateMCGroup]);

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
    <div className="chat-interaction-layer" data-menu-open={menuOpen} data-mode={mode}>

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
          <div ref={msgMaskRef} className="chat-messages-mask">
            <div
              ref={listRef}
              className={`chat-messages-list${messages.length > 0 ? " chat-messages-list--has-messages" : ""}`}
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
                        showTrace={mode === "local"}
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
