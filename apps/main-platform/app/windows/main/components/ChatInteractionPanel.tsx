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
  const contentRef = useRef<HTMLDivElement>(null);

  // Capture FLIP state from current list children (before a React update)
  const captureFlip = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const nodes = list.querySelectorAll<HTMLElement>(".chat-bubble-wrapper");
    if (nodes.length > 0) {
      pendingFlipRef.current = Flip.getState(nodes);
    }
  }, []);

  // Animate a new bubble with elastic spring effect
  const animateBubble = useCallback((el: HTMLElement) => {
    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.5, y: 40, transformOrigin: "bottom center" },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.9,
        ease: "elastic.out(1, 0.4)",
        clearProps: "all",
      }
    );
  }, []);

  // Smooth-scroll list to bottom
  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    gsap.to(list, {
      scrollTop: list.scrollHeight,
      duration: 0.8,
      ease: "power3.out",
    });
  }, []);

  // Apply pending FLIP after every messages-state change
  useLayoutEffect(() => {
    if (pendingFlipRef.current) {
      Flip.from(pendingFlipRef.current, {
        duration: 0.38,
        ease: "power3.out",
        stagger: 0.012,
        onComplete: () => {
          pendingFlipRef.current = null;
        },
      });
      pendingFlipRef.current = null;
    }
  }, [messages]);

  // MutationObserver: elastic entry on new bubbles
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node instanceof HTMLElement &&
            node.classList.contains("chat-bubble-wrapper")
          ) {
            animateBubble(node);
            scrollToBottom();
          }
        }
      }
    });

    observer.observe(list, { childList: true });
    return () => observer.disconnect();
  }, [animateBubble, scrollToBottom]);

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

  // Initial state: hide content immediately on mount to prevent flash
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    gsap.set(content, { opacity: 0, visibility: "hidden" });
  }, []);

  // Canvas ready: fade in content (mode toggle, messages area, input area)
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !canvasReady) return;

    // Make visible and fade in
    gsap.set(content, { visibility: "visible" });
    gsap.to(content, {
      opacity: 1,
      y: 0,
      duration: 0.45,
      ease: "power2.out",
    });
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
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: text },
    ]);

    // Step 2: typing indicator
    const typingTimer = setTimeout(() => {
      captureFlip();
      setMessages((prev) => [
        ...prev,
        { id: typingId, role: "typing", content: "" },
      ]);

      // Step 3: replace typing with bot message
      const botTimer = setTimeout(() => {
        captureFlip();
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
        <div ref={contentRef} className="chat-content-wrap">
          {/* ── Mode Toggle ── */}
          <div className="chat-mode-row">
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
          <div className="chat-messages-mask">
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
          <div className="chat-input-area">
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
                className="chat-send-btn"
                onClick={handleSend}
                disabled={isSending || !inputValue.trim()}
                aria-label="发送消息"
              >
                <span className="chat-send-btn-front">
                  {isSending ? (
                    <span className="chat-send-spinner" aria-hidden="true" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="chat-send-icon"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
