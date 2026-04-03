"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import type { DatabaseUpdate } from "@/app/lib/database-store";

/* ── 轮询间隔 ── */
const POLL_MS = 4000;

interface D1TimelineProps {
  /** 为 true 时开始渲染内部内容（由父组件在画布完全展开后传入） */
  visible: boolean;
}

export function D1Timeline({ visible }: D1TimelineProps) {
  const [updates, setUpdates] = useState<DatabaseUpdate[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animatedRef = useRef(false);

  /* ── 拉取更新日志 ── */
  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch("/api/database/updates");
      if (!res.ok) return;
      const data = await res.json() as { updates: DatabaseUpdate[] };
      setUpdates(data.updates);
    } catch {
      /* 忽略网络错误 */
    }
  }, []);

  /* ── 轮询 ── */
  useEffect(() => {
    fetchUpdates(); // Initial fetch
    if (!visible) return;
    pollTimerRef.current = setInterval(fetchUpdates, POLL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [visible, fetchUpdates]);

  /* ── GSAP 动画 ── */
  useEffect(() => {
    if (visible && updates.length > 0 && !animatedRef.current && trackRef.current) {
      animatedRef.current = true;
      const items = trackRef.current.querySelectorAll(".d1tl-item");

      // 初始状态已由 CSS 预设（opacity:0、translateY(15px)）
      // 直接执行错开动画显示，无需 gsap.set
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.1, // 画布展开后的微小延迟
      });
    }
  }, [visible, updates]);

  if (!visible) return null;

  return (
    <div className="d1tl-root" aria-label="最新更新时间轴">
      {/* ── 标题 ── */}
      <header className="d1tl-header">
        <span className="d1tl-header-dot" />
        <span className="d1tl-header-title">最新更新时间栏</span>
      </header>

      {/* ── 滚动容器 ── */}
      <div ref={scrollRef} className="d1tl-scroll">
        <div ref={trackRef} className="d1tl-track">
          {updates.map((u, idx) => {
            const isNewest = idx === 0;
            return (
              <div key={u.id} className="d1tl-item">
                {/* 左侧轴：节点 + 虚线/链条 */}
                <div className="d1tl-axis">
                  {isNewest ? (
                    <div className="d1tl-dot-sonar">
                      <div className="sonar-core" />
                      <div className="sonar-wave" />
                      <div className="sonar-wave sonar-wave-delay" />
                    </div>
                  ) : (
                    <div className="d1tl-dot-concentric">
                      <div className="concentric-inner" />
                      <div className="concentric-outer" />
                    </div>
                  )}

                  {idx < updates.length - 1 && (
                    <div className="d1tl-chain" />
                  )}
                </div>

                {/* 右侧内容 */}
                <div className="d1tl-content">
                  <div className="d1tl-meta">
                    <span className="d1tl-time">{u.time}</span>
                    <span className="d1tl-date">{u.date}</span>
                  </div>
                  <p className="d1tl-text">
                    <span className="d1tl-actor">{u.actor}</span>
                    &nbsp;{u.action}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
