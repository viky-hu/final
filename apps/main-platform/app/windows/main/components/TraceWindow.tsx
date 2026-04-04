"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { gsap } from "gsap";
import { LINE_DRAW_EASE } from "../../shared/animation";
import { DotGrid } from "./DotGrid";

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
const INTRO_Y = TVH / 3;
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
  const isClosingRef = useRef(false);
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
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const root = rootRef.current;
    if (!root) {
      onClose();
      return;
    }

    gsap.to(root, {
      yPercent: 100, duration: 0.5, ease: "power3.in", onComplete: onClose,
    });
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose]);

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

      <div className="trace-scroller">
        <div className="trace-canvas">

          <section className="trace-page trace-page--main">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${TVW} ${TVH}`}
              preserveAspectRatio="none"
              className="trace-frame-svg"
              aria-label="知识溯源"
            >
              <foreignObject
                className="trace-intro-fo"
                x={INTRO_X}
                y={INTRO_Y}
                width={INTRO_WIDTH}
                height={INTRO_HEIGHT}
              >
                <div className="trace-intro-box">
                  <h1 className="trace-intro-box-title">你可以在此</h1>
                  <p className="trace-intro-box-body">查看相关文本</p>
                  <p className="trace-intro-box-body">或预览文件</p>
                  <p className="trace-intro-box-body">了解词条出处</p>
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

              {dataset.rows.map((row, idx) => (
                <g className="trace-row-content" key={`trace-row-${idx}`}>
                  <foreignObject
                    className="trace-row-fo"
                    x={C1 + CELL_X_PADDING}
                    y={RTOP + ROW_HEIGHT * idx + CELL_Y_PADDING}
                    width={C3 - C1 - CELL_X_PADDING * 2}
                    height={ROW_HEIGHT - CELL_Y_PADDING * 2}
                  >
                    <div className="trace-row-box trace-row-box--text">
                      <span className="trace-row-box-content trace-row-box-content--text">{row.text}</span>
                    </div>
                  </foreignObject>
                  <foreignObject
                    className="trace-row-fo"
                    x={C3 + CELL_X_PADDING}
                    y={RTOP + ROW_HEIGHT * idx + CELL_Y_PADDING}
                    width={TVW - C3 - CELL_X_PADDING * 2}
                    height={ROW_HEIGHT - CELL_Y_PADDING * 2}
                  >
                    <div className="trace-row-box trace-row-box--file">
                      <span className="trace-row-file-cluster">{row.clusterName}</span>
                      <span className="trace-row-file-name">{row.fileName}</span>
                    </div>
                  </foreignObject>
                </g>
              ))}
            </svg>
          </section>

          <section className="trace-page trace-page--blank" aria-label="知识图谱占位页" />

        </div>
      </div>
    </div>
  );
}
