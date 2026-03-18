"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FolderOpen, Database } from "lucide-react";
import { StaggeredMenu } from "../main/components/StaggeredMenu";
import type { StaggeredMenuItem } from "../main/components/StaggeredMenu";
import type { Cluster, Metrics } from "@/app/lib/database-store";

interface DatabaseWindowProps {
  onBack: () => void;
  onNavigateToMain?: () => void;
}

export function DatabaseWindow({ onBack, onNavigateToMain }: DatabaseWindowProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    clusterCount: 0,
    totalFiles: 0,
    lastAddedDate: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClusterName, setNewClusterName] = useState("");
  const [inputError, setInputError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [clustersRes, metricsRes] = await Promise.all([
        fetch("/api/database/clusters"),
        fetch("/api/database/metrics"),
      ]);
      if (clustersRes.ok) {
        const data = await clustersRes.json() as { clusters: Cluster[] };
        setClusters(data.clusters);
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json() as Metrics;
        setMetrics(data);
      }
    } catch {
      // Network error — keep previous state
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Modal focus management ───────────────────────────────────────────────────
  useEffect(() => {
    if (isModalOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isModalOpen]);

  // ── Esc to close modal ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  // ── Modal handlers ───────────────────────────────────────────────────────────
  const openModal = useCallback(() => {
    setNewClusterName("");
    setInputError("");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setInputError("");
    setTimeout(() => createBtnRef.current?.focus(), 50);
  }, []);

  const handleSubmit = useCallback(async () => {
    const name = newClusterName.trim();
    if (!name) { setInputError("聚类名称不能为空"); return; }
    if (name.length > 50) { setInputError("名称不能超过 50 个字符"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/database/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setInputError(data.error ?? "创建失败，请重试");
        return;
      }
      await fetchData();
      closeModal();
    } catch {
      setInputError("网络错误，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [newClusterName, fetchData, closeModal]);

  // ── Menu config ──────────────────────────────────────────────────────────────
  const menuItems: StaggeredMenuItem[] = [
    { label: "返回初始界面", ariaLabel: "返回初始界面", link: "#", onClick: onBack },
    { label: "交互对话",     ariaLabel: "交互对话",     link: "#", onClick: onNavigateToMain },
    { label: "数据库",       ariaLabel: "数据库",       link: "#" },
    { label: "宏观平台",     ariaLabel: "宏观平台",     link: "#" },
  ];

  return (
    <div className="db-window">

      {/* ── Ticker bar ───────────────────────────────────────────────────────── */}
      <div className="db-ticker" aria-hidden="true">
        <div className="db-ticker-track">
          <span>数据源管理系统&nbsp;//</span>
          <span>&nbsp;CLUSTER ENGINE&nbsp;//</span>
          <span>&nbsp;已有聚类 {metrics.clusterCount}&nbsp;//</span>
          <span>&nbsp;总文件 {metrics.totalFiles}&nbsp;//</span>
          <span>&nbsp;数据结构化 · 安全存储&nbsp;//</span>
          <span>&nbsp;DATA GOVERNANCE READY&nbsp;//</span>
          {/* Duplicate for seamless loop */}
          <span>数据源管理系统&nbsp;//</span>
          <span>&nbsp;CLUSTER ENGINE&nbsp;//</span>
          <span>&nbsp;已有聚类 {metrics.clusterCount}&nbsp;//</span>
          <span>&nbsp;总文件 {metrics.totalFiles}&nbsp;//</span>
          <span>&nbsp;数据结构化 · 安全存储&nbsp;//</span>
          <span>&nbsp;DATA GOVERNANCE READY&nbsp;//</span>
        </div>
      </div>

      {/* ── Scrollable page ───────────────────────────────────────────────────── */}
      <div className="db-scroll">

        {/* ── Section 1: Hero ────────────────────────────────────────────────── */}
        <section className="db-hero">
          <div className="db-hero-grid">

            {/* Left column */}
            <div className="db-hero-left">
              <p className="db-eyebrow">数据源管理系统&nbsp;|&nbsp;v1.0</p>

              <h1 className="db-headline">
                你可以在此<br />新增数据库聚类<br />或向聚类中<br />添加文件
              </h1>

              <div className="db-decor-group" aria-hidden="true">
                <p className="db-decor-label">高效、结构化、安全的数据聚类引擎</p>
                <p className="db-decor-label">数据治理 · 向量检索 · 语义索引</p>
                <p className="db-decor-mono">CLUSTER ENGINE · INDEX READY · LATENCY ≤ 10ms</p>
              </div>

              <div className="db-btn-row">
                <button
                  ref={createBtnRef}
                  className="db-create-btn"
                  onClick={openModal}
                  aria-haspopup="dialog"
                  aria-expanded={isModalOpen}
                >
                  新建聚类
                </button>
              </div>
            </div>

            {/* Right sidebar */}
            <aside className="db-hero-right" aria-label="数据统计">
              <div className="db-stats">
                <div className="db-stat-row">
                  <span className="db-stat-label">已有聚类数量</span>
                  <span className="db-stat-value db-stat-value--num">
                    {String(metrics.clusterCount).padStart(2, "0")}
                  </span>
                </div>
                <div className="db-stat-divider" />
                <div className="db-stat-row">
                  <span className="db-stat-label">总文件数量</span>
                  <span className="db-stat-value db-stat-value--num">
                    {String(metrics.totalFiles).padStart(2, "0")}
                  </span>
                </div>
                <div className="db-stat-divider" />
                <div className="db-stat-row db-stat-row--date">
                  <span className="db-stat-label">最近添加文件日期</span>
                  <span className="db-stat-value db-stat-value--date">
                    {metrics.lastAddedDate ?? "—"}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ── Section 2: Cluster List ─────────────────────────────────────────── */}
        <section className="db-list-section">
          <header className="db-list-header">
            <p className="db-list-eyebrow">CLUSTER INDEX</p>
            <div className="db-list-title-row">
              <h2 className="db-list-title">聚类列表</h2>
              <span className="db-list-count">{clusters.length} 个聚类</span>
            </div>
          </header>

          <div className="db-list-body" role="list">
            {clusters.length === 0 ? (
              <div className="db-list-empty" role="listitem">
                <Database size={24} strokeWidth={1} aria-hidden="true" />
                <span>暂无聚类 — 点击「新建聚类」开始创建</span>
              </div>
            ) : (
              clusters.map((cluster) => (
                <div key={cluster.id} className="db-cluster-row" role="listitem">
                  <div className="db-cluster-icon" aria-hidden="true">
                    <FolderOpen size={16} strokeWidth={1.5} />
                  </div>
                  <span className="db-cluster-name">{cluster.name}</span>
                  <span className="db-cluster-meta">文件数:&nbsp;{cluster.fileCount}</span>
                  <span className="db-cluster-date">{cluster.createdAt}</span>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* ── Menu layer (always on top) ───────────────────────────────────────── */}
      <div className="db-menu-layer sm-scope">
        <StaggeredMenu
          position="right"
          items={menuItems}
          displayItemNumbering={true}
          menuButtonColor="#111111"
          openMenuButtonColor="#111111"
          changeMenuColorOnOpen={false}
          colors={["#E5E5E0", "#D0D0C8", "#111111"]}
          accentColor="#CC0000"
        />
      </div>

      {/* ── Create Cluster Modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="db-modal-overlay"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="db-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="db-modal-title"
          >
            <div className="db-modal-header">
              <p className="db-modal-eyebrow">DATABASE · NEW ENTRY</p>
              <h3 id="db-modal-title" className="db-modal-title">新建聚类</h3>
            </div>

            <div className="db-modal-body">
              <label className="db-modal-label" htmlFor="db-cluster-input">
                聚类名称
              </label>
              <input
                id="db-cluster-input"
                ref={inputRef}
                className="db-modal-input"
                type="text"
                value={newClusterName}
                onChange={(e) => { setNewClusterName(e.target.value); setInputError(""); }}
                onKeyDown={(e) => e.key === "Enter" && !isSubmitting && handleSubmit()}
                placeholder="输入聚类名称…"
                maxLength={50}
                aria-describedby={inputError ? "db-modal-error" : undefined}
                aria-invalid={!!inputError}
                autoComplete="off"
              />
              {inputError && (
                <p id="db-modal-error" className="db-modal-error" role="alert">
                  {inputError}
                </p>
              )}
            </div>

            <div className="db-modal-footer">
              <button
                className="db-modal-cancel"
                onClick={closeModal}
                type="button"
              >
                取消
              </button>
              <button
                className="db-modal-confirm"
                onClick={handleSubmit}
                type="button"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "创建中…" : "确认创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
