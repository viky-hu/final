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
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { LINE_DRAW_EASE } from "../../shared/animation";
import { ModelConfigCanvasLines } from "./ModelConfigCanvasLines";

gsap.registerPlugin(Flip);

// ─── BotBubble ────────────────────────────────────────────────────────────────
interface BotBubbleProps {
  msgId: string;
  content: string;
  onTrace: (msgId: string) => void;
}

function BotBubble({ msgId, content, onTrace }: BotBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const btnOuterRef = useRef<HTMLDivElement>(null);
  const btnInnerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    const btnOuter = btnOuterRef.current;
    const btnInner = btnInnerRef.current;
    if (!bubble || !btnOuter || !btnInner) return;

    gsap.set(btnOuter, { width: 0 });
    gsap.set(btnInner, { opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(btnOuter, {
      width: 80,
      duration: 0.38,
      ease: LINE_DRAW_EASE,
    }, 0.14);

    tl.to(btnInner, {
      opacity: 1,
      duration: 0.18,
      ease: "power2.out",
    }, 0.38);

    tlRef.current = tl;

    const onEnter = () => tlRef.current?.play();
    const onLeave = () => tlRef.current?.reverse();
    bubble.addEventListener("mouseenter", onEnter);
    bubble.addEventListener("mouseleave", onLeave);

    return () => {
      bubble.removeEventListener("mouseenter", onEnter);
      bubble.removeEventListener("mouseleave", onLeave);
      tl.kill();
      tlRef.current = null;
    };
  }, []);

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
          onClick={() => onTrace(msgId)}
          onKeyDown={(e) => e.key === "Enter" && onTrace(msgId)}
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

const MC_MODEL_OPTIONS: Record<MCProvider, string[]> = {
  OpenAI: ["gpt", "qwen", "deepseek"],
  Ollama: ["llama", "deepseek", "gemma", "qwen"],
  Local: ["Auto", "llama", "gemma", "qwen"],
};

// ─── Constants ────────────────────────────────────────────────────────────────
const BOT_REPLY = "这是模拟回答，后续将接入实际代码。";
const TYPING_DELAY_MS = 700;

export interface ChatInteractionPanelProps {
  menuOpen?: boolean;
  canvasReady?: boolean;
  onOpenTrace?: (msgId: string) => void;
}

export function ChatInteractionPanel({
  menuOpen = false,
  canvasReady = false,
  onOpenTrace,
}: ChatInteractionPanelProps) {

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("local");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSemicircle, setShowSemicircle] = useState(true);

  // ── Model config state ──────────────────────────────────────────────────────
  const [mcPhase, setMCPhase] = useState<MCPhase>("closed");
  const [mcProvider, setMCProvider] = useState<MCProvider>("OpenAI");
  const [mcModel, setMCModel] = useState("gpt");
  const [mcBaseUrl, setMCBaseUrl] = useState("");
  const [mcApiKey, setMCApiKey] = useState("");
  const [mcModelPath, setMCModelPath] = useState("");
  const [mcLocalUrl, setMCLocalUrl] = useState("");
  const [mcConnectError, setMCConnectError] = useState("");
  const [mcConnectSuccess, setMCConnectSuccess] = useState(false);
  const [mcIsConnecting, setMCIsConnecting] = useState(false);

  // Derived
  const mcMounted = mcPhase !== "closed";
  const mcCanvasOpen = mcPhase === "opening" || mcPhase === "opened" || mcPhase === "fading_out";

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

  const modeRowRef = useRef<HTMLDivElement>(null);
  const msgMaskRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const revealTlRef = useRef<gsap.core.Timeline | null>(null);

  // ── Model config refs ───────────────────────────────────────────────────────
  const mcPanelLayerRef = useRef<HTMLDivElement>(null);
  const mcHeaderRef = useRef<HTMLDivElement>(null);
  const mcProviderRef = useRef<HTMLDivElement>(null);
  const mcModelRef = useRef<HTMLDivElement>(null);
  const mcFieldsRef = useRef<HTMLDivElement>(null);
  const mcFooterRef = useRef<HTMLDivElement>(null);
  const mcRevealTlRef = useRef<gsap.core.Timeline | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ─── Chat: send message ────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isSendingRef.current) return;

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

    const typingTimer = setTimeout(() => {
      captureFlip();
      pendingEntryIdsRef.current.add(typingId);
      setMessages((prev) => [...prev, { id: typingId, role: "typing", content: "" }]);

      const botTimer = setTimeout(() => {
        captureFlip();
        pendingEntryIdsRef.current.add(botId);
        setMessages((prev) =>
          prev.filter((m) => m.id !== typingId).concat({ id: botId, role: "bot", content: BOT_REPLY })
        );
        isSendingRef.current = false;
        setIsSending(false);
      }, TYPING_DELAY_MS);

      return () => clearTimeout(botTimer);
    }, 550);

    return () => clearTimeout(typingTimer);
  }, [inputValue, captureFlip]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Model config: provider → model reset ─────────────────────────────────
  useEffect(() => {
    setMCModel(MC_MODEL_OPTIONS[mcProvider][0]);
    setMCConnectError("");
    setMCConnectSuccess(false);
  }, [mcProvider]);

  // ─── Model config: hide form sections on mount ────────────────────────────
  useLayoutEffect(() => {
    if (!mcMounted) return;
    const targets = [
      mcHeaderRef.current,
      mcProviderRef.current,
      mcModelRef.current,
      mcFieldsRef.current,
      mcFooterRef.current,
    ].filter((el): el is HTMLDivElement => el !== null);
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
      mcProviderRef.current,
      mcModelRef.current,
      mcFieldsRef.current,
      mcFooterRef.current,
    ].filter((el): el is HTMLDivElement => el !== null);
    if (targets.length === 0) return;

    mcRevealTlRef.current?.kill();
    const tl = gsap.timeline();
    mcRevealTlRef.current = tl;

    targets.forEach((el, i) => {
      gsap.set(el, { visibility: "visible" });
      tl.to(el,
        { opacity: 1, y: 0, duration: 0.38, ease: "power3.out" },
        i * 0.08,
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
      mcModelRef.current,
      mcProviderRef.current,
      mcHeaderRef.current,
    ].filter((el): el is HTMLDivElement => el !== null);

    mcRevealTlRef.current?.kill();
    const tl = gsap.timeline({
      onComplete: () => setMCPhase("closing_canvas"),
    });
    mcRevealTlRef.current = tl;

    targets.forEach((el, i) => {
      tl.to(el,
        { opacity: 0, y: -15, duration: 0.24, ease: "power2.in" },
        i * 0.05,
      );
    });

    return () => { tl.kill(); };
  }, [mcPhase]);

  // ─── Model config: open / close handlers ──────────────────────────────────
  const handleMCOpen = useCallback(() => {
    if (mcPhase !== "closed") return;
    setMCConnectError("");
    setMCConnectSuccess(false);
    setMCPhase("opening");
  }, [mcPhase]);

  const handleMCClose = useCallback(() => {
    if (mcPhase === "opened") setMCPhase("fading_out");
  }, [mcPhase]);

  // ─── Model config: connect ─────────────────────────────────────────────────
  const handleMCConnect = useCallback(async () => {
    // Front-end validation
    if (mcProvider !== "Local") {
      if (!mcBaseUrl.trim()) { setMCConnectError("接口地址不能为空"); return; }
      if (!mcApiKey.trim()) { setMCConnectError("API Key 不能为空"); return; }
      try { new URL(mcBaseUrl); } catch {
        setMCConnectError("接口地址格式不正确，请输入完整 URL");
        return;
      }
    } else {
      if (!mcModelPath.trim()) { setMCConnectError("请指定模型路径"); return; }
    }

    setMCConnectError("");
    setMCConnectSuccess(false);
    setMCIsConnecting(true);

    try {
      const payload =
        mcProvider !== "Local"
          ? { provider: mcProvider, model: mcModel, baseUrl: mcBaseUrl, apiKey: mcApiKey }
          : {
            provider: mcProvider, model: mcModel, modelPath: mcModelPath,
            localUrl: mcLocalUrl || "http://localhost:8000/v1"
          };

      const res = await fetch("/api/model-config/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setMCConnectError(data.error ?? "连接失败，请检查 API Key 和网络设置");
      } else {
        setMCConnectSuccess(true);
      }
    } catch {
      setMCConnectError("连接失败，请检查 API Key 和网络设置");
    } finally {
      setMCIsConnecting(false);
    }
  }, [mcProvider, mcModel, mcBaseUrl, mcApiKey, mcModelPath, mcLocalUrl]);

  // ─── Model config: file browse ─────────────────────────────────────────────
  const handleMCBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleMCFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setMCModelPath(file.name);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="chat-interaction-layer" data-menu-open={menuOpen}>

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

          {/* Form panel layer — 跟随菜单同步左移（照搬 panelRef 逻辑） */}
          <div ref={mcPanelLayerRef} className="mc-panel-layer">
            <div className="mc-panel">

              {/* Header */}
              <div ref={mcHeaderRef} className="mc-panel-header">
                <div className="mc-panel-title-group">
                  <span className="mc-eyebrow">MODEL CONFIG</span>
                  <h2 className="mc-panel-title">模型配置</h2>
                </div>
                <button
                  className="mc-close-btn"
                  onClick={handleMCClose}
                  aria-label="关闭模型配置"
                  type="button"
                >
                  <span className="mc-close-x" aria-hidden="true" />
                </button>
              </div>

              {/* Provider selector */}
              <div ref={mcProviderRef} className="mc-provider-row">
                {(["OpenAI", "Ollama", "Local"] as MCProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`mc-provider-item${mcProvider === p ? " mc-provider-item--active" : ""}`}
                    onClick={() => setMCProvider(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Model selector */}
              <div ref={mcModelRef} className="mc-model-row">
                <span className="mc-model-label">模型</span>
                <div className="mc-model-options">
                  {MC_MODEL_OPTIONS[mcProvider].map((m, i, arr) => (
                    <span key={m} className="mc-model-slot">
                      <button
                        type="button"
                        className={`mc-model-item${mcModel === m ? " mc-model-item--active" : ""}`}
                        onClick={() => setMCModel(m)}
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

              {/* Fields */}
              <div ref={mcFieldsRef} className="mc-fields">
                {mcProvider !== "Local" ? (
                  <>
                    <div className="mc-field">
                      <label className="mc-field-label" htmlFor="mc-base-url">
                        接口地址 (Base URL)
                      </label>
                      <input
                        id="mc-base-url"
                        className="mc-field-input"
                        type="url"
                        value={mcBaseUrl}
                        onChange={(e) => { setMCBaseUrl(e.target.value); setMCConnectError(""); }}
                        placeholder="https://api.openai.com/v1"
                        autoComplete="off"
                      />
                    </div>
                    <div className="mc-field">
                      <label className="mc-field-label" htmlFor="mc-api-key">
                        API Key
                      </label>
                      <input
                        id="mc-api-key"
                        className="mc-field-input"
                        type="password"
                        value={mcApiKey}
                        onChange={(e) => { setMCApiKey(e.target.value); setMCConnectError(""); }}
                        placeholder="sk-…"
                        autoComplete="new-password"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mc-field">
                      <label className="mc-field-label" htmlFor="mc-model-path">
                        模型路径 (Model Path)
                      </label>
                      <div className="mc-field-path-row">
                        <input
                          id="mc-model-path"
                          className="mc-field-input"
                          type="text"
                          value={mcModelPath}
                          onChange={(e) => { setMCModelPath(e.target.value); setMCConnectError(""); }}
                          placeholder="/path/to/model.gguf"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="mc-browse-btn"
                          onClick={handleMCBrowse}
                        >
                          浏览
                        </button>
                      </div>
                      <span className="mc-field-hint">
                        请选择本地模型文件 (.gguf, .bin) 或项目环境路径
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".gguf,.bin"
                        style={{ display: "none" }}
                        onChange={handleMCFileSelect}
                      />
                    </div>
                    <div className="mc-field">
                      <label className="mc-field-label" htmlFor="mc-local-url">
                        服务端口 (Localhost URL)
                      </label>
                      <input
                        id="mc-local-url"
                        className="mc-field-input"
                        type="url"
                        value={mcLocalUrl}
                        onChange={(e) => { setMCLocalUrl(e.target.value); setMCConnectError(""); }}
                        placeholder="http://localhost:8000/v1"
                        autoComplete="off"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div ref={mcFooterRef} className="mc-footer">
                {mcConnectError && (
                  <p className="mc-connect-error" role="alert">{mcConnectError}</p>
                )}
                {mcConnectSuccess && !mcConnectError && (
                  <p className="mc-connect-success">连接成功（模拟）</p>
                )}
                <button
                  type="button"
                  className="mc-save-btn"
                  onClick={handleMCConnect}
                  disabled={mcIsConnecting}
                  aria-busy={mcIsConnecting}
                >
                  {mcIsConnecting ? "连接中…" : "保存并连接"}
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
            <ToggleGroup.Root
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as Mode)}
              className="chat-mode-toggle"
              aria-label="数据库模式切换"
            >
              <ToggleGroup.Item value="local" className="chat-mode-item" aria-label="本地模式">本地</ToggleGroup.Item>
              <ToggleGroup.Item value="global" className="chat-mode-item" aria-label="全局模式">全局</ToggleGroup.Item>
            </ToggleGroup.Root>

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
