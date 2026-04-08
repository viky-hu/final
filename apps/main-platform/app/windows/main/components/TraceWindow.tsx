"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { FileSearch } from "lucide-react";
import { LINE_DRAW_EASE } from "../../shared/animation";
import { DotGrid } from "./DotGrid";
import { FilePreviewModal } from "../../database/components/FilePreviewModal";
import { TraceKnowledgeGraph } from "./TraceKnowledgeGraph";

// ─── SVG canvas dimensions ───────────────────────────────────────────────────
const TVW = 1440;
const TVH = 900;

const C1 = TVW * 0.25;
const C3 = C1 + ((TVW - C1) * 2) / 3;
const EDGE_Y_GAP = 88;
const RTOP = EDGE_Y_GAP;
const RBOTTOM = TVH - EDGE_Y_GAP;
const DOUBLE_LINE_GAP = 3;
const ROW_HEIGHT = (RBOTTOM - RTOP) / 5;
const CELL_X_PADDING = 14;
const CELL_Y_PADDING = 10;
const INTRO_X = 30;
const INTRO_Y = TVH * 0.29;
const INTRO_WIDTH = C1 - 60;
const INTRO_HEIGHT = TVH - 130;

interface TraceRow {
  text: string;
  clusterName: string;
  fileName: string;
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

interface TracePreviewTarget {
  file: File;
  name: string;
}

const TRACE_LINES: TraceLineDef[] = [
  { id: "c1", x1: C1, y1: 0, x2: C1, y2: TVH, start: 0, duration: 0.5, strokeWidth: 4 },
  { id: "c3", x1: C3, y1: 0, x2: C3, y2: TVH, start: 0, duration: 0.5, strokeWidth: 2.2 },
  { id: "rtop-1", x1: C1, y1: RTOP - DOUBLE_LINE_GAP / 2, x2: TVW, y2: RTOP - DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 2.8 },
  { id: "rtop-2", x1: C1, y1: RTOP + DOUBLE_LINE_GAP / 2, x2: TVW, y2: RTOP + DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 2 },
  { id: "rbottom-1", x1: C1, y1: RBOTTOM - DOUBLE_LINE_GAP / 2, x2: TVW, y2: RBOTTOM - DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 2.8 },
  { id: "rbottom-2", x1: C1, y1: RBOTTOM + DOUBLE_LINE_GAP / 2, x2: TVW, y2: RBOTTOM + DOUBLE_LINE_GAP / 2, start: 0.4, duration: 0.4, strokeWidth: 2 },
  { id: "r1", x1: C1, y1: RTOP + ROW_HEIGHT * 1, x2: TVW, y2: RTOP + ROW_HEIGHT * 1, start: 0.5, duration: 0.3, strokeWidth: 1.3 },
  { id: "r2", x1: C1, y1: RTOP + ROW_HEIGHT * 2, x2: TVW, y2: RTOP + ROW_HEIGHT * 2, start: 0.6, duration: 0.3, strokeWidth: 1.3 },
  { id: "r3", x1: C1, y1: RTOP + ROW_HEIGHT * 3, x2: TVW, y2: RTOP + ROW_HEIGHT * 3, start: 0.7, duration: 0.3, strokeWidth: 1.3 },
  { id: "r4", x1: C1, y1: RTOP + ROW_HEIGHT * 4, x2: TVW, y2: RTOP + ROW_HEIGHT * 4, start: 0.8, duration: 0.3, strokeWidth: 1.3 },
  { id: "bottom-boundary", x1: 0, y1: TVH - 1, x2: TVW, y2: TVH - 1, start: 0.9, duration: 0.3, strokeWidth: 2.2 },
];

const GROUP_1: TraceDataset = {
  tag: "法学教材定位差异",
  rows: [
    {
      text: "《中国法制史配套测试》在课程导向上强调章节化训练、阶段性测评与高频考点回溯，内容组织围绕课堂进度与考试节奏展开，适合在教学周内进行持续刷题与错题复盘，目标是帮助学生快速形成可迁移的答题框架并提升应试稳定性。",
      clusterName: "核心知识库",
      fileName: "高校法学核心课程配套测试丛书_法制史卷.pdf",
    },
    {
      text: "同组材料显示，配套测试体系会将知识点拆分为基础概念、制度沿革、案例辨析与综合论述四个层级，并在每个层级附加评分说明与典型误区，强调通过高频小测形成记忆曲线，从而在有限备考时间内实现覆盖广、命中高、复习路径清晰的学习效果。",
      clusterName: "研究文献集",
      fileName: "法学本科教学指南_课程能力要求.docx",
    },
    {
      text: "题库与解析文档进一步补充了答题模板、关键词触发机制与法条定位建议，要求学习者在阅读后立即进行同主题迁移练习，并通过解析中的反向示例识别常见失分点，这种“输入—训练—校正”闭环更偏向课程训练与考试实战的结合场景。",
      clusterName: "核心知识库",
      fileName: "法制史配套测试题库与解析_2026版.pdf",
    },
    {
      text: "与之对照，《动产担保权公示及优先顺位规则研究》聚焦制度结构、比较法脉络与裁判规则协调问题，讨论重点是规则冲突与立法完善路径，文本密集引用实务案例和理论争鸣，不以应试得分为直接目标，而以制度解释力和规范建构能力为核心。",
      clusterName: "研究文献集",
      fileName: "动产担保公示与优先顺位规则研究_专著.pdf",
    },
    {
      text: "从受众角度看，研究型材料更适合研究生与政策研究人员在专题写作、课题论证或实务评估时深度使用，其价值体现在提出可操作改革方案与证据化论证链路；而教材型材料更侧重教学配套与考试表现，两类文献在功能定位上形成清晰分层。",
      clusterName: "实验数据集",
      fileName: "动产担保司法实践与立法建议报告.md",
    },
  ],
};

const GROUP_2: TraceDataset = {
  tag: "故意杀人与侦办阶段区分",
  rows: [
    {
      text: "秭归县个案公开信息已明确“持刀攻击—被害人死亡—嫌疑人被控制”这一完整事实链，客观结果与行为因果关系具备直接对应，结合现场处置与后续通报可形成较高确定性的初步法律评价，因此在侦查初期即可落入故意杀人罪名审查路径。",
      clusterName: "核心知识库",
      fileName: "秭归县茅坪镇九里村警情通报_案情摘要.pdf",
    },
    {
      text: "对照刑法构成要件，行为人的主观恶性、实施手段危险程度、攻击部位与持续性行为通常共同指向直接故意判断，若客观上已发生死亡结果且排除明显阻却事由，案件定性会更快从一般暴力行为筛查转入故意杀人实体审查与证据补强阶段。",
      clusterName: "研究文献集",
      fileName: "刑法分则要件对照表_故意杀人条款.docx",
    },
    {
      text: "南通与临沂相关案件目前披露内容主要集中在抓获进展与程序节点，尚缺少关键事实细节、完整鉴定结论以及稳定证据链条，尤其在主观故意程度与结果关联尚未固定前，侦查机关通常会保持审慎表述，避免过早给出终局性罪名结论。",
      clusterName: "实验数据集",
      fileName: "跨省案件侦办阶段信息披露规范.md",
    },
    {
      text: "侦办阶段的法律评价通常遵循“事实先行、证据闭环、定性递进”的工作规则，只有在死亡结果、作案行为、主观状态和排他性解释都达到可支撑起诉标准时，罪名表达才会趋于明确，因此阶段性信息差异并不意味着裁判标准不一致，而是证据成熟度不同。",
      clusterName: "核心知识库",
      fileName: "刑事案件定性流程指引_侦查阶段.pdf",
    },
    {
      text: "综合比较可见，警方在公开口径中区分案件性质的核心依据是证据完成度与事实确定性：一类案件已具备“行为—结果—故意”三要素的高匹配，另一类案件仍处在关键事实补全期，依法维持程序性描述有助于保障后续起诉与审判阶段的严谨性和可解释性。",
      clusterName: "研究文献集",
      fileName: "暴力案件法律适用与证据标准研究报告.pdf",
    },
  ],
};

const DEFAULT_DATASET: TraceDataset = {
  tag: "默认溯源样本",
  rows: [
    {
      text: "系统在收到问题后会先执行多路召回策略，联合向量索引、关键词倒排与主题标签过滤快速定位候选知识块，再根据语义覆盖度、时效权重与结构完整性进行重排序，确保进入生成环节的上下文既贴近问题意图，也具备可追溯、可核验的来源基础。",
      clusterName: "核心知识库",
      fileName: "knowledge_retrieval_pipeline.md",
    },
    {
      text: "在排序阶段，模型不仅比较向量相似度，还会引入关键词共现密度、实体一致性与段落位置权重，防止单一相似度指标导致语义漂移；当多条证据分数接近时，系统会优先保留信息粒度更完整且上下文关系更清晰的文本片段，以提升回答稳定性。",
      clusterName: "研究文献集",
      fileName: "semantic_ranking_design.pdf",
    },
    {
      text: "生成前的校核流程会对候选片段进行事实一致性比对与来源绑定检查，重点确认时间、主体、行为与结论之间不存在明显冲突，并在输出阶段附加可回查锚点，避免回答出现“看似合理但无法追证”的表述，满足后续审计与人工复核需求。",
      clusterName: "实验数据集",
      fileName: "answer_grounding_spec.docx",
    },
    {
      text: "展示层将候选证据映射到文件级元数据后，会统一输出文档来源、聚类归属、命中片段摘要与关联分组信息，使用户能够快速判断每条依据的出处与可信度；当问题跨领域时，界面会优先呈现跨聚类共识片段，减少单源偏差对决策的影响。",
      clusterName: "核心知识库",
      fileName: "trace_window_render_schema.json",
    },
    {
      text: "为增强可解释性，系统在最终答案旁保留结构化溯源链路，包括检索命中记录、重排权重概览与证据片段引用顺序，支持“从结论回看依据”的逆向审查流程；该机制可用于教学演示、业务质检与模型迭代评估，帮助团队持续优化知识问答质量。",
      clusterName: "研究文献集",
      fileName: "llm_explainability_manual.pdf",
    },
  ],
};

function normalize(input: string): string {
  return input.replace(/\s+/g, "").replace(/[“”"'‘’]/g, "");
}

function ensureTrailingEllipsis(text: string): string {
  const trimmed = text.trimEnd();
  if (/……$/.test(trimmed)) return trimmed;
  return `${trimmed}……`;
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

function pickRandomItems<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let idx = pool.length - 1; idx > 0; idx -= 1) {
    const swapIdx = Math.floor(Math.random() * (idx + 1));
    [pool[idx], pool[swapIdx]] = [pool[swapIdx], pool[idx]];
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}

function buildTracePreviewFile(row: TraceRow, rowIndex: number): File {
  const indent = "　　";
  const intro = [
    `来源文件：${row.fileName}`,
    `所属聚类：${row.clusterName}`,
    `溯源编号：TRACE-${String(rowIndex + 1).padStart(2, "0")}`,
    "",
    "语义相关文本：",
    row.text,
    "",
    "正文：",
  ];

  const openingPool = [
    `${indent}围绕“${row.fileName}”的记录主线可以看到，文本描述与证据链呈现出明显的阶段性推进关系。`,
    `${indent}从“${row.clusterName}”聚类的上下文看，该文件重点补充了事件细部与关键节点之间的逻辑连接。`,
    `${indent}将语义文本与来源片段逐条对照后，可以确认主要叙述方向保持一致，仅在表达层面存在轻微差异。`,
    `${indent}该条目在事实呈现上采用了先结论后展开的结构，阅读时需结合时间线与实体关系同步理解。`,
  ];

  const detailPool = [
    "在首轮整理中，系统优先提取可量化信息，再将人物、地点、行为三类实体交叉映射，减少叙述歧义。",
    "就同类文档而言，本文件在细节密度上明显更高，尤其是对上下游事件触发条件的描述更完整。",
    "通过句级比对可以发现，原文中多处因果连接词与时间副词共同构成了强约束的推断路径。",
    "针对容易误读的段落，采用反向复核方式回看源句，确认结论并非由单一语句孤立支撑。",
    "若从资料来源构成观察，该文本同时包含陈述性材料与说明性材料，二者互为补充。",
    "相较于摘要性材料，本文件提供了更多过程描述，可帮助读者理解事实如何逐步成立。",
    "在关联比对阶段，多个关键词在邻近语境重复出现，说明该主题并非偶发提及而是核心议题。",
    "该文档在论述中保留了不少边界条件，这些条件对后续解释范围与结论强度有直接影响。",
  ];

  const closingPool = [
    `${indent}综合以上信息，本文件可作为该主题的重要支撑材料，适合与同聚类文档并行阅读以提高判断稳定性。`,
    `${indent}从证据连续性与叙事完整度看，当前文本具备较高参考价值，建议在复核阶段保留为核心来源之一。`,
    `${indent}若后续需要扩展检索范围，可优先沿当前关键词链条向相邻语料延伸，以获得更完整的背景信息。`,
    `${indent}整体来看，该来源在事实核验、语义一致性与上下文衔接三方面表现均衡，适合作为基础样本。`,
  ];

  const paragraphCount = 12 + Math.floor(Math.random() * 4);
  const baseBody = Array.from({ length: paragraphCount }, () => {
    const opening = openingPool[Math.floor(Math.random() * openingPool.length)];
    const detailA = detailPool[Math.floor(Math.random() * detailPool.length)];
    const detailB = detailPool[Math.floor(Math.random() * detailPool.length)];
    return `${opening}${detailA}${detailB}`;
  }).join("\n\n");

  let body = baseBody;
  while (body.length < 1900) {
    const opening = openingPool[Math.floor(Math.random() * openingPool.length)];
    const detail = detailPool[Math.floor(Math.random() * detailPool.length)];
    body += `\n\n${opening}${detail}`;
  }

  const relatedFilePool = [
    "政策执行纪要-季度汇编.pdf",
    "访谈记录-文本整理版.docx",
    "事件节点时间轴-校核稿.xlsx",
    "联合研判纪要-内部稿.doc",
    "区域样本抽取说明-v3.txt",
    "工作流日志导出-完整版.csv",
    "现场记录影像清单-补充版.md",
    "跨部门会商纪要-终稿.pdf",
    "证据条目索引-修订表.xlsx",
    "案例要点提炼-对照稿.docx",
    "语义片段标注记录-v2.json",
    "溯源链路说明-附注.txt",
  ];
  const relatedFiles = pickRandomItems(relatedFilePool, 7)
    .map((name) => `${indent}${name}`)
    .join("\n");

  const closing = closingPool[Math.floor(Math.random() * closingPool.length)];

  const content = [
    ...intro,
    body,
    "",
    "关联来源：",
    relatedFiles,
    "",
    closing,
  ].join("\n");

  return new File([content], `trace-preview-${rowIndex + 1}.txt`, {
    type: "text/plain;charset=utf-8",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TraceWindowProps {
  msgId: string;
  answerContent: string;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TraceWindow({ msgId, answerContent, onClose }: TraceWindowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const graphPageRef = useRef<HTMLElement>(null);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const hoverDashTweenRef = useRef<gsap.core.Tween | null>(null);
  const rowTransitionTlRef = useRef<gsap.core.Timeline | null>(null);
  const hoveredRowRef = useRef<number | null>(null);
  const e1FocusRectsRef = useRef<Array<SVGRectElement | null>>([]);
  const e1GlowRectsRef = useRef<Array<SVGRectElement | null>>([]);
  const e2FillRectsRef = useRef<Array<SVGRectElement | null>>([]);
  const e2BorderRectsRef = useRef<Array<SVGRectElement | null>>([]);
  const fileBoxRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [previewTarget, setPreviewTarget] = useState<TracePreviewTarget | null>(null);
  const isClosingRef = useRef(false);
  const dataset = useMemo(() => selectDataset(answerContent), [answerContent]);

  const updateHoveredRow = useCallback((nextRow: number | null) => {
    if (hoveredRowRef.current === nextRow) return;
    hoveredRowRef.current = nextRow;
    setHoveredRow(nextRow);
  }, []);

  const applyRowVisualState = useCallback((activeRow: number | null) => {
    rowTransitionTlRef.current?.kill();
    hoverDashTweenRef.current?.kill();
    hoverDashTweenRef.current = null;

    const tl = gsap.timeline({ defaults: { duration: 0.2, ease: "power2.out" } });

    for (let idx = 0; idx < dataset.rows.length; idx += 1) {
      const e1Focus = e1FocusRectsRef.current[idx];
      const e1Glow = e1GlowRectsRef.current[idx];
      const e2Fill = e2FillRectsRef.current[idx];
      const e2Border = e2BorderRectsRef.current[idx];
      const fileBox = fileBoxRefs.current[idx];

      const overlays = [e1Focus, e1Glow, e2Fill, e2Border].filter(
        (el): el is SVGRectElement => el !== null,
      );

      const isActive = activeRow === idx;

      if (e1Focus) {
        gsap.set(e1Focus, { strokeDasharray: "15 10", strokeDashoffset: 0 });
      }

      gsap.killTweensOf(overlays);
      if (fileBox) gsap.killTweensOf(fileBox);

      if (overlays.length > 0) {
        tl.to(overlays, { opacity: isActive ? 1 : 0, overwrite: "auto" }, 0);
      }

      if (fileBox) {
        tl.to(fileBox, { color: isActive ? "#ffffff" : "#000000", overwrite: "auto" }, 0);
      }
    }

    rowTransitionTlRef.current = tl;

    if (activeRow !== null) {
      const activeFocus = e1FocusRectsRef.current[activeRow];
      if (activeFocus) {
        hoverDashTweenRef.current = gsap.to(activeFocus, {
          strokeDashoffset: -50,
          duration: 1.05,
          ease: "none",
          repeat: -1,
        });
      }
    }
  }, [dataset.rows.length]);

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

    gsap.set(
      svg.querySelectorAll<SVGRectElement>(
        ".trace-e1-hover-stroke, .trace-e1-hover-glow, .trace-e2-hover-fill, .trace-e2-hover-border",
      ),
      { opacity: 0 },
    );
    gsap.set(svg.querySelectorAll<HTMLDivElement>(".trace-row-box--file"), { color: "#000000" });

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
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    scrollTweenRef.current?.kill();

    const root = rootRef.current;
    if (!root) {
      onClose();
      return;
    }

    gsap.to(root, {
      yPercent: 100, duration: 0.5, ease: "power3.in", onComplete: onClose,
    });
  }, [onClose]);

  const handleOpenKnowledgeGraph = useCallback(() => {
    const scroller = scrollerRef.current;
    const graphPage = graphPageRef.current;
    if (!scroller || !graphPage) return;

    scrollTweenRef.current?.kill();
    scrollTweenRef.current = gsap.to(scroller, {
      scrollTop: graphPage.offsetTop,
      duration: 0.62,
      ease: "power2.out",
    });
  }, []);

  const handleOpenPreview = useCallback((row: TraceRow, rowIndex: number) => {
    setPreviewTarget({
      file: buildTracePreviewFile(row, rowIndex),
      name: row.fileName,
    });
  }, []);

  const handleOpenPreviewFromSelectedRow = useCallback((row: TraceRow, rowIndex: number) => {
    if (hoveredRowRef.current !== rowIndex) return;
    handleOpenPreview(row, rowIndex);
  }, [handleOpenPreview]);

  const handleClosePreview = useCallback(() => {
    setPreviewTarget(null);
  }, []);

  const handleSvgPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const localX = ((event.clientX - rect.left) / rect.width) * TVW;
    const localY = ((event.clientY - rect.top) / rect.height) * TVH;

    const inRows = localX >= C1 && localX <= TVW && localY >= RTOP && localY <= RBOTTOM;
    if (!inRows) {
      updateHoveredRow(null);
      return;
    }

    const idx = Math.max(0, Math.min(4, Math.floor((localY - RTOP) / ROW_HEIGHT)));
    updateHoveredRow(idx);
  }, [updateHoveredRow]);

  useEffect(() => {
    return () => {
      scrollTweenRef.current?.kill();
      hoverDashTweenRef.current?.kill();
      rowTransitionTlRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    applyRowVisualState(hoveredRow);
  }, [applyRowVisualState, hoveredRow]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (previewTarget) {
          setPreviewTarget(null);
          return;
        }
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose, previewTarget]);

  return (
    <div ref={rootRef} className="trace-window-root" aria-label="知识溯源窗口" data-msg-id={msgId}>
      <div className="trace-window-bg" aria-hidden="true">
        <div className="trace-window-dotgrid">
          <DotGrid
            dotSize={2}
            gap={12}
            baseColor="#EBEBEB"
            activeColor="#0047FF"
            proximity={150}
            speedTrigger={100}
            shockRadius={250}
            shockStrength={5}
            maxSpeed={5000}
            resistance={750}
            returnDuration={1.5}
          />
        </div>
      </div>

      <div ref={scrollerRef} className="trace-scroller">
        <div className="trace-canvas">

          <section className="trace-page trace-page--main">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${TVW} ${TVH}`}
              preserveAspectRatio="none"
              className="trace-frame-svg"
              aria-label="知识溯源"
              onPointerMove={handleSvgPointerMove}
              onPointerLeave={() => updateHoveredRow(null)}
            >
              <defs>
                <filter id="trace-e1-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.8" result="traceGlowBlur" />
                  <feMerge>
                    <feMergeNode in="traceGlowBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <foreignObject
                className="trace-intro-fo"
                x={INTRO_X}
                y={INTRO_Y}
                width={INTRO_WIDTH}
                height={INTRO_HEIGHT}
              >
                <div className="trace-intro-box">
                  <h1 className="trace-intro-box-title">知识溯源</h1>
                  <div className="trace-intro-graph-btn-wrap">
                    <button
                      type="button"
                      className="animated-button trace-graph-btn"
                      onClick={handleOpenKnowledgeGraph}
                    >
                      <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                      </svg>
                      <span className="text">打开知识图谱</span>
                      <span className="circle" />
                      <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </foreignObject>

              <text
                className="trace-col-head"
                x={C1 + 16}
                y={RTOP - 28}
                textAnchor="start"
              >
                语义相关文本
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

              {dataset.rows.map((row, idx) => {
                const rowY = RTOP + ROW_HEIGHT * idx;
                return (
                  <g
                    className="trace-row-content"
                    key={`trace-row-${idx}`}
                    onPointerEnter={() => updateHoveredRow(idx)}
                    onClick={() => handleOpenPreviewFromSelectedRow(row, idx)}
                  >
                    <rect
                      className="trace-row-hit"
                      x={C1}
                      y={rowY}
                      width={TVW - C1}
                      height={ROW_HEIGHT}
                    />

                    <rect
                      ref={(el) => {
                        e2FillRectsRef.current[idx] = el;
                      }}
                      className="trace-e2-hover-fill"
                      x={C3 + 1}
                      y={rowY + 1}
                      width={TVW - C3 - 2}
                      height={ROW_HEIGHT - 2}
                    />

                    <rect
                      ref={(el) => {
                        e2BorderRectsRef.current[idx] = el;
                      }}
                      className="trace-e2-hover-border"
                      x={C3 + 1}
                      y={rowY + 1}
                      width={TVW - C3 - 2}
                      height={ROW_HEIGHT - 2}
                    />

                    <rect
                      ref={(el) => {
                        e1GlowRectsRef.current[idx] = el;
                      }}
                      className="trace-e1-hover-glow"
                      x={C1 + 1}
                      y={rowY + 1}
                      width={C3 - C1 - 2}
                      height={ROW_HEIGHT - 2}
                    />

                    <rect
                      ref={(el) => {
                        e1FocusRectsRef.current[idx] = el;
                      }}
                      className="trace-e1-hover-stroke"
                      x={C1 + 1}
                      y={rowY + 1}
                      width={C3 - C1 - 2}
                      height={ROW_HEIGHT - 2}
                    />

                    <foreignObject
                      className="trace-row-fo"
                      x={C1 + CELL_X_PADDING}
                      y={rowY + CELL_Y_PADDING}
                      width={C3 - C1 - CELL_X_PADDING * 2}
                      height={ROW_HEIGHT - CELL_Y_PADDING * 2}
                    >
                      <div className="trace-row-box trace-row-box--text">
                        <span className="trace-row-box-content trace-row-box-content--text">
                          {ensureTrailingEllipsis(row.text)}
                        </span>
                      </div>
                    </foreignObject>
                    <foreignObject
                      className="trace-row-fo"
                      x={C3 + CELL_X_PADDING}
                      y={rowY + CELL_Y_PADDING}
                      width={TVW - C3 - CELL_X_PADDING * 2}
                      height={ROW_HEIGHT - CELL_Y_PADDING * 2}
                    >
                      <div
                        ref={(el) => {
                          fileBoxRefs.current[idx] = el;
                        }}
                        className="trace-row-box trace-row-box--file"
                      >
                        <div className="trace-row-file-main">
                          <span className="trace-row-file-cluster">{row.clusterName}</span>
                          <span className="trace-row-file-name">{row.fileName}</span>
                        </div>
                        <button
                          type="button"
                          className="trace-row-preview-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenPreviewFromSelectedRow(row, idx);
                          }}
                          aria-label={`打开来源文件预览：${row.fileName}`}
                        >
                          <FileSearch size={18} strokeWidth={1.9} className="trace-row-preview-icon" />
                          <span className="trace-row-preview-label">预览文件</span>
                        </button>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </section>

          <section ref={graphPageRef} className="trace-page trace-page--graph" aria-label="知识图谱页面">
            <TraceKnowledgeGraph />
          </section>

        </div>
      </div>

      {previewTarget && (
        <FilePreviewModal
          file={previewTarget.file}
          name={previewTarget.name}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
