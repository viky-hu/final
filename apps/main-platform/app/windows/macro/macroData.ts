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
  { id: "node-current",    label: "本机节点", labelCode: "SECTOR-01", position: [0, 0, 0], isHome: true },
  { id: "node-2",          label: "教务处", labelCode: "SECTOR-02", position: [-8, 0, -6], isHome: false },
  { id: "node-3",          label: "警体馆", labelCode: "SECTOR-03", position: [8, 0, 2], isHome: false },
  { id: "node-4",          label: "老山园", labelCode: "SECTOR-04", position: [-3, 0, 8], isHome: false },
  { id: "node-5",          label: "图书馆", labelCode: "SECTOR-05", position: [5, 0, -4], isHome: false },
  { id: "node-center-red", label: "本机节点", labelCode: "CORE-RED", position: [0, 0, 0], isHome: false },
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

function buildWordCloudData(words: string[], startWeight = 98, step = 2, minWeight = 30): WordCloudDatum[] {
  const uniqueWords = Array.from(new Set(words.map((item) => item.trim()).filter(Boolean)));
  return uniqueWords.map((text, index) => ({
    text,
    weight: Math.max(minWeight, startWeight - index * step),
  }));
}

const SECURITY_WORDS = [
  "校园安全",
  "门禁",
  "监控系统",
  "巡逻",
  "消防",
  "出入登记",
  "访客",
  "校园卡",
  "秩序",
  "违规电器",
  "晚归记录",
  "应急预案",
  "巡查",
  "防火防盗等",
];

const LAOSHANYUAN_WORDS = [
  "老山园",
  "超市",
  "生活用品",
  "食堂",
  "教工食堂",
  "打饭",
  "饭卡",
  "排队",
  "大学生活动中心",
  "社团招新",
  "文艺晚会",
  "排练室",
  "奶茶店",
];

const GYM_WORDS = [
  "警体馆",
  "拳击馆",
  "射击馆",
  "健身房",
  "汗水",
  "力量",
  "搏击",
  "靶心",
  "射击训练",
  "跑步机",
  "哑铃",
  "体能",
  "竞技",
  "肌肉",
  "拼搏",
  "纪律",
  "警务技能",
  "散打",
  "体测",
  "哨声",
  "荷尔蒙",
  "极限",
  "坚持",
  "运动服",
  "擂台",
];

const REGISTRAR_WORDS = [
  "教务处",
  "选课系统",
  "成绩单",
  "学分",
  "考试安排",
  "培养方案",
  "补考",
  "重修",
  "四六级考试",
  "毕业答辩",
  "毕业证书",
  "学位证书",
  "课程表",
  "评教",
  "学籍管理",
  "成绩单盖章",
  "在校证明",
  "学期注册",
  "挂科",
  "教学大纲",
  "考务",
];

const NEW_TEACH_WORDS = [
  "教学楼",
  "阶梯教室",
  "录播教室",
  "实验室",
  "报告厅",
  "多媒体教学",
  "投影仪",
  "讲台",
  "课堂笔记",
  "听讲",
  "数据分析",
  "学术讲座",
  "麦克风",
  "晚自习",
  "签到",
  "实验报告",
];

const LIBRARY_WORDS = [
  "借阅",
  "还书",
  "阅览室",
  "藏书",
  "文献资料",
  "期刊杂志",
  "知网论文查询",
  "数据库",
  "检索",
  "电子书",
  "借书证",
  "论文查重",
  "馆际互借",
  "读书笔记",
  "期末复习",
  "书架",
];

export const NODE_WORD_CLOUDS: Record<string, WordCloudDatum[]> = {
  "node-current": buildWordCloudData(SECURITY_WORDS),
  "node-center-red": buildWordCloudData(SECURITY_WORDS),
  "node-2": buildWordCloudData(REGISTRAR_WORDS),
  "node-3": buildWordCloudData(GYM_WORDS),
  "node-4": buildWordCloudData(LAOSHANYUAN_WORDS),
  "node-5": buildWordCloudData(LIBRARY_WORDS),

  "n-registrar": buildWordCloudData(REGISTRAR_WORDS),
  "n-gym": buildWordCloudData(GYM_WORDS),
  "n-laoshan": buildWordCloudData(LAOSHANYUAN_WORDS),
  "n-library": buildWordCloudData(LIBRARY_WORDS),
  "n-newteach": buildWordCloudData(NEW_TEACH_WORDS),
};
