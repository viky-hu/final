"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { gsap } from "gsap";
import { LINE_DRAW_EASE } from "../../shared/animation";

// ─── SVG canvas dimensions ───────────────────────────────────────────────────
const TVW = 1440;
const TVH = 900;

const C1 = TVW * 0.25;
const RIGHT_WIDTH = TVW - C1;
const C2 = C1 + RIGHT_WIDTH / 3;
const C3 = C1 + RIGHT_WIDTH / 2;
const RTOP = 190;
const RBOTTOM = 750;
const DOUBLE_LINE_GAP = 3;
const ROW_HEIGHT = (RBOTTOM - RTOP) / 5;

interface TraceRow {
  text: string;
  similarity: string;
  file: string;
}

interface TraceDataset {
  tag: string;
  rows: TraceRow[];
}

interface TraceLineDef {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  start: number;
  duration: number;
  strokeWidth: number;
}

const TRACE_LINES: TraceLineDef[] = [
  { id: "c1", x1: C1, y1: 0, x2: C1, y2: TVH, start: 0, duration: 0.5, strokeWidth: 2.8 },
  { id: "c2", x1: C2, y1: 0, x2: C2, y2: TVH, start: 0, duration: 0.5, strokeWidth: 1.6 },
  { id: "c3", x1: C3, y1: 0, x2: C3, y2: TVH, start: 0, duration: 0.5, strokeWidth: 1.6 },
  { id: "rtop-1", x1: C1, y1: RTOP - DOUBLE_LINE_GAP / 2, x2: TVW, y2: RTOP - DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 2 },
  { id: "rtop-2", x1: C1, y1: RTOP + DOUBLE_LINE_GAP / 2, x2: TVW, y2: RTOP + DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 1.4 },
  { id: "rbottom-1", x1: C1, y1: RBOTTOM - DOUBLE_LINE_GAP / 2, x2: TVW, y2: RBOTTOM - DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 2 },
  { id: "rbottom-2", x1: C1, y1: RBOTTOM + DOUBLE_LINE_GAP / 2, x2: TVW, y2: RBOTTOM + DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 1.4 },
  { id: "r1", x1: C1, y1: RTOP + ROW_HEIGHT * 1, x2: TVW, y2: RTOP + ROW_HEIGHT * 1, start: 0.5, duration: 0.3, strokeWidth: 1.3 },
  { id: "r2", x1: C1, y1: RTOP + ROW_HEIGHT * 2, x2: TVW, y2: RTOP + ROW_HEIGHT * 2, start: 0.6, duration: 0.3, strokeWidth: 1.3 },
  { id: "r3", x1: C1, y1: RTOP + ROW_HEIGHT * 3, x2: TVW, y2: RTOP + ROW_HEIGHT * 3, start: 0.7, duration: 0.3, strokeWidth: 1.3 },
  { id: "r4", x1: C1, y1: RTOP + ROW_HEIGHT * 4, x2: TVW, y2: RTOP + ROW_HEIGHT * 4, start: 0.8, duration: 0.3, strokeWidth: 1.3 },
];

const GROUP_1: TraceDataset = {
  tag: "法学教材定位差异",
  rows: [
    { text: "《中国法制史配套测试》定位为核心课程应试训练", similarity: "96%", file: "高校法学核心课程配套测试丛书_法制史卷.pdf" },
    { text: "目标读者以法学院在校生与备考群体为主", similarity: "93%", file: "法学本科教学指南_课程能力要求.docx" },
    { text: "题量充足、解答详尽，强调知识点覆盖与答题技巧", similarity: "91%", file: "法制史配套测试题库与解析_2026版.pdf" },
    { text: "《动产担保权公示及优先顺位规则研究》聚焦制度建构与立法完善", similarity: "88%", file: "动产担保公示与优先顺位规则研究_专著.pdf" },
    { text: "内容偏法理与实务改革建议，服务研究生与实务研究者", similarity: "84%", file: "动产担保司法实践与立法建议报告.md" },
  ],
};

const GROUP_2: TraceDataset = {
  tag: "故意杀人与侦办阶段区分",
  rows: [
    { text: "秭归案中存在明确持刀致死行为，客观后果已完成", similarity: "97%", file: "秭归县茅坪镇九里村警情通报_案情摘要.pdf" },
    { text: "行为人主观上具有直接故意，符合故意杀人主观要件", similarity: "94%", file: "刑法分则要件对照表_故意杀人条款.docx" },
    { text: "南通与临沂案目前仅披露抓获信息，关键事实尚待查明", similarity: "90%", file: "跨省案件侦办阶段信息披露规范.md" },
    { text: "未见确认死亡结果与完整证据链，暂不宜先行定性", similarity: "86%", file: "刑事案件定性流程指引_侦查阶段.pdf" },
    { text: "警方区分依据为主观状态与客观后果的证据完成度", similarity: "82%", file: "暴力案件法律适用与证据标准研究报告.pdf" },
  ],
};

const DEFAULT_DATASET: TraceDataset = {
  tag: "默认溯源样本",
  rows: [
    { text: "检索命中与问题语义最接近的知识块并进行重排", similarity: "92%", file: "knowledge_retrieval_pipeline.md" },
    { text: "基于向量相似度与关键词共现进行联合评分", similarity: "89%", file: "semantic_ranking_design.pdf" },
    { text: "输出前执行事实一致性校核与来源追踪绑定", similarity: "86%", file: "answer_grounding_spec.docx" },
    { text: "展示层按 Top5 证据片段映射文件级来源元数据", similarity: "81%", file: "trace_window_render_schema.json" },
    { text: "提供可解释链路以支持回答审计与人工复核", similarity: "77%", file: "llm_explainability_manual.pdf" },
  ],
};

function normalize(input: string): string {
  return input.replace(/\s+/g, "").replace(/[“”"'‘’]/g, "");
}

function selectDataset(answerContent: string): TraceDataset {
  const content = normalize(answerContent);
  if (
    content.includes(normalize("中国法制史配套测试")) ||
    content.includes(normalize("动产担保权公示及优先顺位规则研究"))
  ) {
    return GROUP_1;
  }

  if (
    content.includes(normalize("秭归县茅坪镇九里村")) ||
    content.includes(normalize("江苏南通")) ||
    content.includes(normalize("山东临沂"))
  ) {
    return GROUP_2;
  }

  return DEFAULT_DATASET;
}

function ellipsis(input: string, maxChars: number): string {
  return input.length > maxChars ? `${input.slice(0, maxChars)}…` : input;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TraceWindowProps {
  msgId: string;
  answerContent: string;
  onClose: () => void;
}

const ROW_Y = Array.from({ length: 5 }, (_, idx) => RTOP + ROW_HEIGHT * idx + ROW_HEIGHT / 2 + 4);

// ─── Main component ───────────────────────────────────────────────────────────
export function TraceWindow({ msgId, answerContent, onClose }: TraceWindowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dataset = useMemo(() => selectDataset(answerContent), [answerContent]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.set(root, { yPercent: 100 });
    const t = gsap.to(root, { yPercent: 0, duration: 0.72, ease: "power3.out" });
    return () => {
      t.kill();
    };
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    TRACE_LINES.forEach(({ id }) => {
      const el = svg.querySelector<SVGLineElement>(`#${id}`);
      if (!el) return;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    });

    gsap.set(svg.querySelectorAll<SVGGElement>(".trace-row-content"), { opacity: 0, y: 10 });

    const tl = gsap.timeline({ paused: true });
    TRACE_LINES.forEach(({ id, start, duration }) => {
      const line = svg.querySelector<SVGLineElement>(`#${id}`);
      if (!line) return;
      tl.to(line, { strokeDashoffset: 0, duration, ease: LINE_DRAW_EASE }, start);
    });

    tl.to(
      svg.querySelectorAll<SVGGElement>(".trace-row-content"),
      { opacity: 1, y: 0, duration: 0.28, stagger: 0.08, ease: "power2.out" },
      0.94,
    );

    tl.play(0);

    return () => {
      tl.kill();
    };
  }, []);

  const handleClose = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      onClose();
      return;
    }

    gsap.to(root, {
      yPercent: 100, duration: 0.5, ease: "power3.in", onComplete: onClose,
    });
  }, [onClose]);

  return (
    <div ref={rootRef} className="trace-window-root" aria-label="知识溯源窗口">
      <div className="trace-window-bg" aria-hidden="true" />

      <div className="trace-scroller">
        <div className="trace-canvas">

          <section className="trace-page trace-page--main">
            <div className="trace-page-layout">
              <aside className="trace-intro-panel">
                <p className="trace-intro-eyebrow">KNOWLEDGE TRACE</p>
                <h1 className="trace-intro-title">知识溯源</h1>
                <p className="trace-intro-body">
                  基于向量数据库的语义检索，追溯本次回答的五条原始知识来源，并展示语义相关度与文件出处。
                </p>
                <p className="trace-intro-body">
                  左侧提供溯源说明，右侧以线框绘制 Top5 结果，支持按回答内容匹配预设问答场景。
                </p>
                <p className="trace-meta">回答ID：{msgId.slice(-8)}</p>
                <p className="trace-meta">场景标签：{dataset.tag}</p>
              </aside>

              <div className="trace-board-shell">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${TVW} ${TVH}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="trace-frame-svg"
                  aria-label="知识溯源Top5"
                >
                  <text
                    className="trace-col-head"
                    x={C1 + 16}
                    y={RTOP - 28}
                    textAnchor="start"
                  >
                    语义相关文本（Top5）
                  </text>
                  <text
                    className="trace-col-head"
                    x={(C2 + C3) / 2}
                    y={RTOP - 28}
                    textAnchor="middle"
                  >
                    相似度
                  </text>
                  <text
                    className="trace-col-head"
                    x={C3 + 16}
                    y={RTOP - 28}
                    textAnchor="start"
                  >
                    来源文件
                  </text>

                  {TRACE_LINES.map(({ id, x1, y1, x2, y2, strokeWidth }) => (
                    <line
                      key={id}
                      id={id}
                      className="trace-line"
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      strokeWidth={strokeWidth}
                    />
                  ))}

                  {dataset.rows.map((row, idx) => (
                    <g className="trace-row-content" key={`trace-row-${idx}`}>
                      <text
                        className="trace-row-text"
                        x={C1 + 16}
                        y={ROW_Y[idx]}
                        textAnchor="start"
                      >
                        {ellipsis(row.text, 32)}
                      </text>
                      <text
                        className="trace-row-score"
                        x={(C2 + C3) / 2}
                        y={ROW_Y[idx]}
                        textAnchor="middle"
                      >
                        {row.similarity}
                      </text>
                      <text
                        className="trace-row-file"
                        x={C3 + 16}
                        y={ROW_Y[idx]}
                        textAnchor="start"
                      >
                        {ellipsis(row.file, 26)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </section>

          <section className="trace-page trace-page--blank" aria-label="知识图谱占位页" />

        </div>
      </div>

      <button
        className="trace-close-btn"
        onClick={handleClose}
        aria-label="关闭溯源窗口"
      >
        <span className="trace-close-icon" aria-hidden="true">✕</span>
        <span className="trace-close-text">关闭溯源</span>
      </button>
    </div>
  );
}
