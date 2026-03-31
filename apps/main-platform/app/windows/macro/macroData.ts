export interface MacroNode {
  id: string;
  label: string;
  labelCode: string;
  position: [number, number, number];
  isHome: boolean;
}

export interface WordCloudDatum {
  text: string;
  weight: number;
}

export interface BeaconAnchorOffset {
  dx: number;
  dy: number;
}

export interface BeaconStyle {
  height: number;
  topRadius: number;
  baseRadius: number;
  opacity: number;
  pulseMaxRadius: number;
  pulseDuration: number;
  color: string;
  activeColor: string;
}

export interface BeaconNodeConfig {
  nodeId: string;
  anchorOffset: BeaconAnchorOffset;
  style?: Partial<BeaconStyle>;
}

export interface BeaconPerfConfig {
  stdDeviationIdle: number;
  stdDeviationActive: number;
  pulseFrequency: number;
  staggerDelay: number;
  reducedMotion: boolean;
}

export const DEFAULT_BEACON_STYLE: BeaconStyle = {
  height: 90,
  topRadius: 2,
  baseRadius: 22,
  opacity: 0.55,
  pulseMaxRadius: 38,
  pulseDuration: 1.8,
  color: "rgba(80, 180, 255, 0.55)",
  activeColor: "rgba(0, 220, 255, 0.9)",
};

export const BEACON_PERF_CONFIG: BeaconPerfConfig = {
  stdDeviationIdle: 2.5,
  stdDeviationActive: 5.0,
  pulseFrequency: 1.8,
  staggerDelay: 0.14,
  reducedMotion: false,
};

export const BEACON_NODE_CONFIGS: BeaconNodeConfig[] = [
  { nodeId: "node-current",    anchorOffset: { dx: -52, dy: -8  } },
  { nodeId: "node-center-red", anchorOffset: { dx: 52,  dy: -8  } },
  { nodeId: "node-2",       anchorOffset: { dx: -4,  dy: 4   } },
  { nodeId: "node-3",       anchorOffset: { dx: 6,   dy: -4  } },
  { nodeId: "node-4",       anchorOffset: { dx: -2,  dy: 6   } },
  { nodeId: "node-5",       anchorOffset: { dx: 4,   dy: -6  } },
];

export const MACRO_NODES: MacroNode[] = [
  { id: "node-current",    label: "节点一", labelCode: "SECTOR-01", position: [0, 0, 0], isHome: true },
  { id: "node-2",          label: "节点二", labelCode: "SECTOR-02", position: [-8, 0, -6], isHome: false },
  { id: "node-3",          label: "节点三", labelCode: "SECTOR-03", position: [8, 0, 2], isHome: false },
  { id: "node-4",          label: "节点四", labelCode: "SECTOR-04", position: [-3, 0, 8], isHome: false },
  { id: "node-5",          label: "节点五", labelCode: "SECTOR-05", position: [5, 0, -4], isHome: false },
  { id: "node-center-red", label: "核心节点", labelCode: "CORE-RED", position: [0, 0, 0], isHome: false },
];

export const DEFAULT_SELECTED_NODE_ID = "node-current";
export const DEFAULT_ACTIVE_SECTOR_ID = "node-current";

/** 每个板块对应的所有 beacon 节点 ID（含红色特殊节点） */
export const SECTOR_NODES: Record<string, string[]> = {
  "node-current": ["node-current", "node-center-red"],
  "node-2":       ["node-2"],
  "node-3":       ["node-3"],
  "node-4":       ["node-4"],
  "node-5":       ["node-5"],
};

export type NodeSelectSource = "plate" | "beacon" | "external_inject";

export const NODE_WORD_CLOUDS: Record<string, WordCloudDatum[]> = {
  "node-current": [
    { text: "text中学", weight: 98 },
    { text: "text中学南门", weight: 94 },
    { text: "text中学北侧", weight: 90 },
    { text: "text中学天桥", weight: 87 },
    { text: "text广场", weight: 85 },
    { text: "text中心广场", weight: 83 },
    { text: "text广场东口", weight: 81 },
    { text: "text主干道", weight: 76 },
    { text: "text主干道南段", weight: 74 },
    { text: "text主干道北段", weight: 72 },
    { text: "text社区", weight: 68 },
    { text: "text核心社区", weight: 66 },
    { text: "text沿街社区", weight: 64 },
    { text: "text园区", weight: 63 },
    { text: "text科技园区", weight: 61 },
    { text: "text创意园区", weight: 59 },
    { text: "text地铁口", weight: 58 },
    { text: "text地铁A口", weight: 56 },
    { text: "text地铁B口", weight: 55 },
    { text: "text商圈", weight: 54 },
    { text: "text夜间商圈", weight: 53 },
    { text: "text车站", weight: 50 },
    { text: "text公交枢纽", weight: 49 },
    { text: "text步行街", weight: 46 },
    { text: "text步行街中段", weight: 45 },
    { text: "text医院", weight: 42 },
    { text: "text医院急诊", weight: 41 },
    { text: "text文创园", weight: 38 },
    { text: "text文创园北区", weight: 37 },
    { text: "text写字楼", weight: 33 },
    { text: "text写字楼集群", weight: 32 },
    { text: "text停车换乘点", weight: 30 },
    { text: "text商业连廊", weight: 29 },
    { text: "text河岸步道", weight: 27 },
    { text: "text社区驿站", weight: 25 },
    { text: "text便民中心", weight: 23 },
  ],
  "node-2": [
    { text: "text实验小学", weight: 95 },
    { text: "text实验小学西门", weight: 92 },
    { text: "text实验小学周边", weight: 89 },
    { text: "text物流枢纽", weight: 84 },
    { text: "text物流枢纽西区", weight: 82 },
    { text: "text物流枢纽南区", weight: 79 },
    { text: "text老城区", weight: 72 },
    { text: "text老城区主街", weight: 70 },
    { text: "text老城区巷口", weight: 69 },
    { text: "text河道口", weight: 68 },
    { text: "text河道口桥头", weight: 66 },
    { text: "text夜市", weight: 63 },
    { text: "text夜市北排", weight: 61 },
    { text: "text客运站", weight: 59 },
    { text: "text客运站西广场", weight: 58 },
    { text: "text综合体", weight: 55 },
    { text: "text综合体停车场", weight: 54 },
    { text: "text社区医院", weight: 51 },
    { text: "text社区医院门诊", weight: 50 },
    { text: "text文旅区", weight: 47 },
    { text: "text文旅区东段", weight: 46 },
    { text: "text停车场", weight: 43 },
    { text: "text停车场南侧", weight: 41 },
    { text: "text巷道", weight: 39 },
    { text: "text巷道交汇点", weight: 37 },
    { text: "text餐饮街", weight: 34 },
    { text: "text餐饮街入口", weight: 33 },
    { text: "text旧改片区", weight: 31 },
    { text: "text水岸廊桥", weight: 29 },
    { text: "text仓配中心", weight: 27 },
    { text: "text快递集散点", weight: 25 },
    { text: "text便民停车带", weight: 23 },
  ],
  "node-3": [
    { text: "text学院路", weight: 96 },
    { text: "text学院路南段", weight: 93 },
    { text: "text学院路北段", weight: 90 },
    { text: "text产业园", weight: 83 },
    { text: "text产业园一期", weight: 81 },
    { text: "text产业园二期", weight: 79 },
    { text: "text高新园", weight: 79 },
    { text: "text高新园核心区", weight: 77 },
    { text: "text商业街", weight: 71 },
    { text: "text商业街东侧", weight: 69 },
    { text: "text仓储区", weight: 66 },
    { text: "text仓储区北仓", weight: 64 },
    { text: "text居住区", weight: 61 },
    { text: "text居住区中庭", weight: 60 },
    { text: "text公交总站", weight: 57 },
    { text: "text公交总站出入口", weight: 56 },
    { text: "text科研楼", weight: 53 },
    { text: "text科研楼群", weight: 51 },
    { text: "text文体中心", weight: 48 },
    { text: "text文体中心南馆", weight: 47 },
    { text: "text主路口", weight: 44 },
    { text: "text主路口东北角", weight: 43 },
    { text: "text地铁换乘", weight: 40 },
    { text: "text地铁换乘大厅", weight: 39 },
    { text: "text文化广场", weight: 35 },
    { text: "text文化广场南区", weight: 34 },
    { text: "text创新孵化楼", weight: 32 },
    { text: "text人才公寓", weight: 30 },
    { text: "text会客中心", weight: 28 },
    { text: "text园区绿轴", weight: 26 },
    { text: "text停车换电点", weight: 24 },
  ],
  "node-5": [
    { text: "text夫子庙", weight: 97 },
    { text: "text夫子庙广场", weight: 94 },
    { text: "text夫子庙南门", weight: 91 },
    { text: "text秦淮河", weight: 88 },
    { text: "text秦淮河岸", weight: 85 },
    { text: "text秦淮河西段", weight: 83 },
    { text: "text老门东", weight: 80 },
    { text: "text老门东街口", weight: 78 },
    { text: "text老城南", weight: 75 },
    { text: "text老城南巷道", weight: 73 },
    { text: "text历史街区", weight: 70 },
    { text: "text历史街区北侧", weight: 68 },
    { text: "text民宿集群", weight: 65 },
    { text: "text民宿集群西区", weight: 63 },
    { text: "text古玩市场", weight: 60 },
    { text: "text古玩市场入口", weight: 58 },
    { text: "text茶馆区", weight: 55 },
    { text: "text茶馆区东段", weight: 54 },
    { text: "text牌楼广场", weight: 51 },
    { text: "text牌楼广场南侧", weight: 50 },
    { text: "text水街", weight: 46 },
    { text: "text水街拱桥", weight: 45 },
    { text: "text文艺集市", weight: 42 },
    { text: "text文艺集市周边", weight: 40 },
    { text: "text观光码头", weight: 37 },
    { text: "text游船起点", weight: 35 },
    { text: "text非遗展示馆", weight: 32 },
    { text: "text灯彩展区", weight: 30 },
    { text: "text慢行步道", weight: 27 },
    { text: "text夜游集散点", weight: 24 },
    { text: "text文化驿站", weight: 22 },
  ],
  "node-4": [
    { text: "text高中", weight: 94 },
    { text: "text高中南门", weight: 91 },
    { text: "text高中北区", weight: 88 },
    { text: "text滨江带", weight: 82 },
    { text: "text滨江带东段", weight: 80 },
    { text: "text滨江带西段", weight: 78 },
    { text: "text会展中心", weight: 75 },
    { text: "text会展中心北馆", weight: 73 },
    { text: "text休闲区", weight: 69 },
    { text: "text休闲区步道", weight: 67 },
    { text: "text办公区", weight: 64 },
    { text: "text办公区A座", weight: 62 },
    { text: "text社区中心", weight: 60 },
    { text: "text社区中心东翼", weight: 58 },
    { text: "text交通口", weight: 56 },
    { text: "text交通口匝道", weight: 55 },
    { text: "text商贸区", weight: 52 },
    { text: "text商贸区中环", weight: 51 },
    { text: "text市场", weight: 47 },
    { text: "text市场南门", weight: 46 },
    { text: "text公园", weight: 43 },
    { text: "text公园湖区", weight: 42 },
    { text: "text道路节点", weight: 39 },
    { text: "text道路节点西口", weight: 38 },
    { text: "text综合站", weight: 34 },
    { text: "text综合站换乘层", weight: 33 },
    { text: "text滨水广场", weight: 31 },
    { text: "text会展停车场", weight: 29 },
    { text: "text共享办公区", weight: 27 },
    { text: "text文化廊道", weight: 25 },
    { text: "text夜间步道", weight: 23 },
  ],
  "node-center-red": [
    { text: "高权限节点", weight: 99 },
    { text: "综合型数据", weight: 96 },
    { text: "静态知识库", weight: 92 },
    { text: "动态实战档", weight: 90 },
    { text: "跨领域融合", weight: 87 },
    { text: "案件卷宗", weight: 84 },
    { text: "警情通报", weight: 82 },
    { text: "多模态数据", weight: 79 },
    { text: "实战资料", weight: 76 },
    { text: "法律条文", weight: 73 },
    { text: "警务规范", weight: 70 },
    { text: "现场图像", weight: 68 },
    { text: "询问笔录", weight: 65 },
    { text: "身份档案", weight: 62 },
    { text: "情报研判", weight: 60 },
    { text: "关联分析", weight: 57 },
    { text: "节点互联", weight: 55 },
    { text: "管控标签", weight: 52 },
    { text: "指挥调度", weight: 50 },
    { text: "安全态势", weight: 47 },
    { text: "风险预警", weight: 45 },
    { text: "数据融合", weight: 42 },
    { text: "知识图谱", weight: 40 },
    { text: "证据链条", weight: 37 },
    { text: "专项行动", weight: 35 },
    { text: "研判报告", weight: 32 },
    { text: "权限管控", weight: 30 },
    { text: "加密传输", weight: 27 },
    { text: "审计日志", weight: 25 },
    { text: "核查记录", weight: 22 },
  ],
};
