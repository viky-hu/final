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

gsap.registerPlugin(Flip);

type Mode = "local" | "global";
type MessageRole = "user" | "bot" | "typing";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

const BOT_REPLY = "这是模拟回答，后续将接入实际代码。";
const TYPING_DELAY_MS = 700;

export interface ChatInteractionPanelProps {
  menuOpen?: boolean;
  canvasReady?: boolean;
}

export function ChatInteractionPanel({
  menuOpen = false,
  canvasReady = false,
}: ChatInteractionPanelProps) {
  const [mode, setMode] = useState<Mode>("local");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef(false);
  const pendingFlipRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const pendingEntryIdsRef = useRef<Set<string>>(new Set());
  const bubbleTweensRef = useRef<Map<string, gsap.core.Tween>>(new Map());

  // 三段分区 refs — 用于分段延迟入场动画
  const modeRowRef = useRef<HTMLDivElement>(null);
  const msgMaskRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const revealTlRef = useRef<gsap.core.Timeline | null>(null);

  // Capture FLIP state from current list children (before a React update)
  const captureFlip = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const nodes = list.querySelectorAll<HTMLElement>(".chat-bubble-wrapper");
    if (nodes.length > 0) {
      pendingFlipRef.current = Flip.getState(nodes);
    }
  }, []);

  // Single entry animation for new bubbles — no MutationObserver
  const animateBubble = useCallback((el: HTMLElement, msgId: string) => {
    bubbleTweensRef.current.get(msgId)?.kill();
    const tween = gsap.fromTo(
      el,
      {
        opacity: 0,
        scale: 0.85,
        y: 24,
        transformOrigin: "bottom center",
        force3D: true,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "transform,opacity",
        onKill: () => {
          bubbleTweensRef.current.delete(msgId);
        },
        onComplete: () => {
          bubbleTweensRef.current.delete(msgId);
        },
      }
    );
    bubbleTweensRef.current.set(msgId, tween);
  }, []);

  // Smooth-scroll list to bottom, deferred to avoid layout thrashing
  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        gsap.to(list, {
          scrollTop: list.scrollHeight,
          duration: 0.6,
          ease: "power3.out",
        });
      });
    });
  }, []);

  // Apply pending FLIP (existing bubbles only) — runs before entry animation
  useLayoutEffect(() => {
    if (pendingFlipRef.current) {
      Flip.from(pendingFlipRef.current, {
        duration: 0.35,
        ease: "power3.out",
        stagger: 0.01,
        onComplete: () => {
          pendingFlipRef.current = null;
        },
      });
      pendingFlipRef.current = null;
    }
  }, [messages]);

  // Run entry animation for new bubbles (single trigger, no MutationObserver)
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || pendingEntryIdsRef.current.size === 0) return;

    const ids = pendingEntryIdsRef.current;
    list
      .querySelectorAll<HTMLElement>(".chat-bubble-wrapper[data-msg-id]")
      .forEach((el) => {
        const id = el.getAttribute("data-msg-id");
        if (id && ids.has(id)) {
          animateBubble(el, id);
        }
      });
    pendingEntryIdsRef.current.clear();
    scrollToBottom();
  }, [messages, animateBubble, scrollToBottom]);

  // Kill orphaned tweens on unmount
  useEffect(() => {
    return () => {
      bubbleTweensRef.current.forEach((t) => t.kill());
      bubbleTweensRef.current.clear();
    };
  }, []);

  // Synchronize panel horizontal position with menu state
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    // When menu opens the canvas shifts left by 15vw — mirror that here
    gsap.to(panel, {
      x: menuOpen ? "-15vw" : "0vw",
      duration: 0.45,
      ease: "power3.inOut",
    });
  }, [menuOpen]);

  // 挂载时立即隐藏三个分区，防止画布动画期间闪现
  useLayoutEffect(() => {
    const targets = [
      modeRowRef.current,
      msgMaskRef.current,
      inputAreaRef.current,
    ].filter((el): el is HTMLDivElement => el !== null);
    if (targets.length === 0) return;
    gsap.set(targets, { opacity: 0, y: 24, visibility: "hidden" });
  }, []);

  // 画布完成后：三段分区依次浮现，各区独立缓动
  useEffect(() => {
    if (!canvasReady) return;

    revealTlRef.current?.kill();
    const tl = gsap.timeline();
    revealTlRef.current = tl;

    // 每区入场配置：at = 时间轴插入时间点（秒）
    const sections: Array<{
      el: HTMLDivElement | null;
      at: number;
      fromY: number;
      fromBlur: number;
      duration: number;
      ease: string;
    }> = [
      {
        // 段1：模式切换 — 轻盈上浮 + 去模糊
        el: modeRowRef.current,
        at: 0.12,
        fromY: 16,
        fromBlur: 5,
        duration: 0.50,
        ease: "power3.out",
      },
      {
        // 段2：消息流 — 稍重下沉感，略晚于段1
        el: msgMaskRef.current,
        at: 0.30,
        fromY: 28,
        fromBlur: 3,
        duration: 0.62,
        ease: "power3.out",
      },
      {
        // 段3：输入区 — 最晚，带轻微 overshoot 强调落点
        el: inputAreaRef.current,
        at: 0.50,
        fromY: 38,
        fromBlur: 8,
        duration: 0.68,
        ease: "back.out(1.4)",
      },
    ];

    for (const { el, at, fromY, fromBlur, duration, ease } of sections) {
      if (!el) continue;
      gsap.set(el, { visibility: "visible" });
      tl.fromTo(
        el,
        { opacity: 0, y: fromY, filter: `blur(${fromBlur}px)` },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration,
          ease,
          // 动画结束后清除 filter 属性，避免持续合成开销
          clearProps: "filter",
        },
        at,
      );
    }

    return () => {
      tl.kill();
      revealTlRef.current = null;
    };
  }, [canvasReady]);

  // Send message flow
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

    // Step 1: user bubble
    captureFlip();
    pendingEntryIdsRef.current.add(userId);
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: text },
    ]);

    // Step 2: typing indicator
    const typingTimer = setTimeout(() => {
      captureFlip();
      pendingEntryIdsRef.current.add(typingId);
      setMessages((prev) => [
        ...prev,
        { id: typingId, role: "typing", content: "" },
      ]);

      // Step 3: replace typing with bot message
      const botTimer = setTimeout(() => {
        captureFlip();
        pendingEntryIdsRef.current.add(botId);
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== typingId)
            .concat({ id: botId, role: "bot", content: BOT_REPLY })
        );
        isSendingRef.current = false;
        setIsSending(false);
      }, TYPING_DELAY_MS);

      return () => clearTimeout(botTimer);
    }, 120);

    return () => clearTimeout(typingTimer);
  }, [inputValue, captureFlip]);

  // Auto-resize textarea to content
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-interaction-layer" data-menu-open={menuOpen}>
      <div ref={panelRef} className="chat-interaction-panel">
        <div className="chat-content-wrap">
          {/* ── Mode Toggle ── */}
          <div ref={modeRowRef} className="chat-mode-row">
            <ToggleGroup.Root
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as Mode)}
              className="chat-mode-toggle"
              aria-label="数据库模式切换"
            >
              <ToggleGroup.Item
                value="local"
                className="chat-mode-item"
                aria-label="本地模式"
              >
                本地
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="global"
                className="chat-mode-item"
                aria-label="全局模式"
              >
                全局
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>

          {/* ── Messages Area ── */}
          <div ref={msgMaskRef} className="chat-messages-mask">
            <div ref={listRef} className="chat-messages-list">
              {messages.length === 0 && (
                <div className="chat-empty-state" aria-hidden="true">
                  <p className="chat-empty-title">智能检索对话</p>
                  <p className="chat-empty-hint">选择模式，输入问题开始提问</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  data-msg-id={msg.id}
                  className={`chat-bubble-wrapper chat-bubble-wrapper--${msg.role}`}
                >
                  {msg.role === "typing" ? (
                    <div className="chat-bubble chat-bubble--bot chat-bubble--typing">
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                    </div>
                  ) : (
                    <div className={`chat-bubble chat-bubble--${msg.role}`}>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
