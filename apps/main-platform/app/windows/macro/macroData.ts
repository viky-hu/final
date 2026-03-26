export interface MacroNode {
  id: string;
  label: string;
  position: [number, number, number];
  isHome: boolean;
}

export interface WordCloudDatum {
  text: string;
  weight: number;
}

export const MACRO_NODES: MacroNode[] = [
  { id: "node-current", label: "text1", position: [0, 0, 0], isHome: true },
  { id: "node-2", label: "text2", position: [-8, 0, -6], isHome: false },
  { id: "node-3", label: "text3", position: [8, 0, 2], isHome: false },
  { id: "node-4", label: "text4", position: [-3, 0, 8], isHome: false },
];

export const DEFAULT_SELECTED_NODE_ID = "node-current";

export const NODE_WORD_CLOUDS: Record<string, WordCloudDatum[]> = {
  "node-current": [
    { text: "text中学", weight: 98 },
    { text: "text广场", weight: 85 },
    { text: "text主干道", weight: 76 },
    { text: "text社区", weight: 68 },
    { text: "text园区", weight: 63 },
    { text: "text地铁口", weight: 58 },
    { text: "text商圈", weight: 54 },
    { text: "text车站", weight: 50 },
    { text: "text步行街", weight: 46 },
    { text: "text医院", weight: 42 },
    { text: "text文创园", weight: 38 },
    { text: "text写字楼", weight: 33 },
  ],
  "node-2": [
    { text: "text实验小学", weight: 95 },
    { text: "text物流枢纽", weight: 84 },
    { text: "text老城区", weight: 72 },
    { text: "text河道口", weight: 68 },
    { text: "text夜市", weight: 63 },
    { text: "text客运站", weight: 59 },
    { text: "text综合体", weight: 55 },
    { text: "text社区医院", weight: 51 },
    { text: "text文旅区", weight: 47 },
    { text: "text停车场", weight: 43 },
    { text: "text巷道", weight: 39 },
    { text: "text餐饮街", weight: 34 },
  ],
  "node-3": [
    { text: "text学院路", weight: 96 },
    { text: "text产业园", weight: 83 },
    { text: "text高新园", weight: 79 },
    { text: "text商业街", weight: 71 },
    { text: "text仓储区", weight: 66 },
    { text: "text居住区", weight: 61 },
    { text: "text公交总站", weight: 57 },
    { text: "text科研楼", weight: 53 },
    { text: "text文体中心", weight: 48 },
    { text: "text主路口", weight: 44 },
    { text: "text地铁换乘", weight: 40 },
    { text: "text文化广场", weight: 35 },
  ],
  "node-4": [
    { text: "text高中", weight: 94 },
    { text: "text滨江带", weight: 82 },
    { text: "text会展中心", weight: 75 },
    { text: "text休闲区", weight: 69 },
    { text: "text办公区", weight: 64 },
    { text: "text社区中心", weight: 60 },
    { text: "text交通口", weight: 56 },
    { text: "text商贸区", weight: 52 },
    { text: "text市场", weight: 47 },
    { text: "text公园", weight: 43 },
    { text: "text道路节点", weight: 39 },
    { text: "text综合站", weight: 34 },
  ],
};
