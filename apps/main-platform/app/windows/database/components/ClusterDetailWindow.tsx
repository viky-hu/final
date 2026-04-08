"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import {
  ArrowLeft,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  FolderOpen,
} from "lucide-react";
import { LINE_DRAW_EASE } from "../../shared/animation";
import { FilePreviewModal } from "./FilePreviewModal";
import type { Cluster } from "@/app/lib/database-store";

// ── Local file model ──────────────────────────────────────────────────────────

interface LocalFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  addedAt: string;
  fileObject: File;
}

// ── File type groups for the upload bubble ───────────────────────────────────

const FILE_TYPE_GROUPS = [
  {
    label: "文档",
    labelEn: "DOC",
    Icon: FileText,
    accept: ".pdf,.txt,.doc,.docx,.rtf,.md,.csv,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp",
  },
  {
    label: "图片",
    labelEn: "IMG",
    Icon: ImageIcon,
    accept: ".jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.tiff,.avif,.heic",
  },
  {
    label: "视频",
    labelEn: "VID",
    Icon: Video,
    accept: ".mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.m4v",
  },
  {
    label: "音频",
    labelEn: "AUD",
    Icon: Music,
    accept: ".mp3,.wav,.ogg,.flac,.aac,.m4a,.wma,.opus",
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf", txt: "text/plain", md: "text/markdown",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    csv: "text/csv", rtf: "application/rtf",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", bmp: "image/bmp",
    svg: "image/svg+xml", tiff: "image/tiff",
    mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
    avi: "video/x-msvideo", mkv: "video/x-matroska",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
    flac: "audio/flac", aac: "audio/aac", m4a: "audio/mp4",
  };
  return map[ext] ?? "application/octet-stream";
}

function FileTypeIcon({ mimeType, name }: { mimeType: string; name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/") || ["jpg","jpeg","png","webp","gif","svg","bmp"].includes(ext))
    return <ImageIcon size={16} strokeWidth={1.5} />;
  if (mimeType.startsWith("video/") || ["mp4","webm","mov","avi","mkv"].includes(ext))
    return <Video size={16} strokeWidth={1.5} />;
  if (mimeType.startsWith("audio/") || ["mp3","wav","ogg","flac","aac","m4a"].includes(ext))
    return <Music size={16} strokeWidth={1.5} />;
  if (mimeType === "application/pdf" || ext === "pdf")
    return <FileText size={16} strokeWidth={1.5} />;
  if (mimeType.startsWith("text/") || ["txt","md","csv","doc","docx","xls","xlsx"].includes(ext))
    return <FileText size={16} strokeWidth={1.5} />;
  return <File size={16} strokeWidth={1.5} />;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ClusterDetailWindowProps {
  cluster: Cluster;
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClusterDetailWindow({ cluster, onBack }: ClusterDetailWindowProps) {
  const rootRef        = useRef<HTMLDivElement>(null);
  const hLineRef       = useRef<SVGLineElement>(null);
  const hLineSvgRef    = useRef<SVGSVGElement>(null);
  const listHeaderRef  = useRef<HTMLElement>(null);
  const listBodyRef    = useRef<HTMLDivElement>(null);
  const uploadBtnRef   = useRef<HTMLButtonElement>(null);
  const bubbleRef      = useRef<HTMLDivElement>(null);
  const fileInputRefs  = useRef<Array<HTMLInputElement | null>>(
    Array.from({ length: FILE_TYPE_GROUPS.length }, () => null),
  );

  const [files, setFiles]               = useState<LocalFile[]>([]);
  const [showBubble, setShowBubble]     = useState(false);
  const [selectedFile, setSelectedFile] = useState<LocalFile | null>(null);

  // ── Entrance: slide-in from right then draw line + fade list header ────────
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.set(root, { x: "100%" });

    const tl = gsap.timeline();
    tl.to(root, { x: "0%", duration: 0.45, ease: "power3.out" });

    const hLine    = hLineRef.current;
    const hLineSvg = hLineSvgRef.current;
    if (hLine && hLineSvg) {
      const svgW = hLineSvg.getBoundingClientRect().width || 1080;
      hLine.setAttribute("x2", String(svgW));
      const len = hLine.getTotalLength();
      gsap.set(hLine, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(hLine, { strokeDashoffset: 0, duration: 0.55, ease: LINE_DRAW_EASE }, 0.3);
    }

    if (listHeaderRef.current) {
      gsap.set(listHeaderRef.current, { autoAlpha: 0 });
      tl.to(listHeaderRef.current, { autoAlpha: 1, duration: 0.28, ease: "power2.out" }, 0.62);
    }

    return () => { tl.kill(); };
  }, []);

  // ── Exit: slide out to the right ──────────────────────────────────────────
  const handleBack = useCallback(() => {
    const root = rootRef.current;
    if (!root) { onBack(); return; }
    gsap.to(root, { x: "100%", duration: 0.35, ease: "power3.in", onComplete: onBack });
  }, [onBack]);

  // ── Upload bubble open/close ───────────────────────────────────────────────
  const openBubble = useCallback(() => {
    setShowBubble(true);
  }, []);

  // Animate in when bubble mounts
  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble || !showBubble) return;
    gsap.fromTo(bubble,
      { autoAlpha: 0, y: -10, scale: 0.92 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: "power2.out" },
    );
  }, [showBubble]);

  // Close bubble on outside click
  useEffect(() => {
    if (!showBubble) return;
    const handler = (e: MouseEvent) => {
      const btn    = uploadBtnRef.current;
      const bubble = bubbleRef.current;
      if (
        btn    && !btn.contains(e.target as Node) &&
        bubble && !bubble.contains(e.target as Node)
      ) {
        setShowBubble(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBubble]);

  // ── Handle file selection from any hidden input ────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const newFiles: LocalFile[] = Array.from(list).map((f) => ({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      mimeType: f.type || getMimeFromName(f.name),
      addedAt: today,
      fileObject: f,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setShowBubble(false);
    e.target.value = "";

    // Also sync to backend stub (fire-and-forget for now)
    newFiles.forEach((nf) => {
      fetch(`/api/database/clusters/${cluster.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nf.name, size: nf.size, mimeType: nf.mimeType }),
      }).catch(() => {/* backend unavailable in dev is fine */});
    });
  }, [cluster.id]);

  // ── Animate each new file row ──────────────────────────────────────────────
  useEffect(() => {
    if (files.length === 0) return;
    const rows = listBodyRef.current?.querySelectorAll(".db-file-row");
    if (!rows) return;
    const last = rows[rows.length - 1];
    if (last) {
      gsap.fromTo(last,
        { autoAlpha: 0, x: 24 },
        { autoAlpha: 1, x: 0, duration: 0.32, ease: "power2.out" },
      );
    }
  }, [files]);

  return (
    <div ref={rootRef} className="db-cluster-detail">

      {/* ── Detail header ── */}
      <header className="db-cluster-detail-header">

        {/* Back button */}
        <button
          className="db-cluster-detail-back"
          onClick={handleBack}
          type="button"
          aria-label="返回聚类列表"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          <span>返回列表</span>
        </button>

        {/* Title block */}
        <div className="db-cluster-detail-title-block">
          <p className="db-cluster-detail-eyebrow">
            CLUSTER&nbsp;·&nbsp;{cluster.createdAt}
          </p>
          <h1 className="db-cluster-detail-title">{cluster.name}</h1>
        </div>

        {/* Horizontal draw line */}
        <div className="db-cluster-detail-h-line-wrap" aria-hidden="true">
          <svg ref={hLineSvgRef} className="db-h-line-svg" aria-hidden="true">
            <line
              ref={hLineRef}
              x1="0" y1="1" x2="100%" y2="1"
              stroke="#111111"
              strokeWidth="1"
              strokeLinecap="square"
            />
          </svg>
        </div>

        {/* Upload button + bubble */}
        <div className="db-cluster-detail-actions">
          <div className="db-upload-wrapper">
            <button
              ref={uploadBtnRef}
              className="db-upload-btn"
              onClick={openBubble}
              type="button"
              aria-haspopup="true"
              aria-expanded={showBubble}
            >
              <Upload size={14} strokeWidth={2} />
              上传文件
            </button>

            {showBubble && (
              <div
                ref={bubbleRef}
                className="db-type-bubble"
                role="menu"
                aria-label="选择文件类型"
              >
                {FILE_TYPE_GROUPS.map(({ label, labelEn, Icon }, idx) => (
                  <button
                    key={label}
                    className="db-type-bubble-item"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setShowBubble(false);
                      setTimeout(() => fileInputRefs.current[idx]?.click(), 60);
                    }}
                  >
                    <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span className="db-type-bubble-label">{label}</span>
                    <span className="db-type-bubble-en">{labelEn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hidden file inputs — one per type group */}
          {FILE_TYPE_GROUPS.map(({ label, accept }, idx) => (
            <input
              key={label}
              ref={(el) => { fileInputRefs.current[idx] = el; }}
              type="file"
              accept={accept}
              multiple
              className="db-file-input-hidden"
              onChange={handleFileChange}
              aria-hidden="true"
              tabIndex={-1}
            />
          ))}
        </div>
      </header>

      {/* ── File list ── */}
      <section className="db-file-list-section">
        <header ref={listHeaderRef} className="db-file-list-header">
          <p className="db-list-eyebrow">FILE INDEX</p>
          <div className="db-list-title-row">
            <h2 className="db-list-title">已添加文件</h2>
            <span className="db-list-count">{files.length} 个文件</span>
          </div>
        </header>

        <div ref={listBodyRef} className="db-list-body" role="list">
          {files.length === 0 ? (
            <div className="db-list-empty" role="listitem">
              <FolderOpen size={24} strokeWidth={1} aria-hidden="true" />
              <span>暂无文件 — 点击「上传文件」开始添加</span>
            </div>
          ) : (
            files.map((f) => (
              <div
                key={f.id}
                className="db-file-row"
                role="listitem"
                tabIndex={0}
                onClick={() => setSelectedFile(f)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedFile(f)}
                aria-label={`打开文件：${f.name}`}
              >
                <div className="db-file-icon" aria-hidden="true">
                  <FileTypeIcon mimeType={f.mimeType} name={f.name} />
                </div>
                <span className="db-file-name">{f.name}</span>
                <span className="db-file-meta">{formatFileSize(f.size)}</span>
                <span className="db-file-date">{f.addedAt}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── File preview modal ── */}
      {selectedFile && (
        <FilePreviewModal
          file={selectedFile.fileObject}
          name={selectedFile.name}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
