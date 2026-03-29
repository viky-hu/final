"use client";

/**
 * D3Sandbox.tsx — 2.5D 等距视角 · 科技机械风板块地图
 *
 * 【重构核心】
 *  1. Z-Sorting 修复: 静态按地理中心 Y 排序，动态则在被点选瞬间将 DOM 结构劫持至最顶。
 *  2. Timeline 互斥锁: 基于 currentTimelineRef，强行控制「先旧块降落 -> Z 轴提升 -> 新块抬起」。
 *  3. 高级审美质感: 缩减画布余白，抛弃廉价全亮光，代之深邃的赛博暗青与暗紫过渡中段，配合柔和毛玻璃发光。
 */

import { useMemo, useRef } from "react";
import * as d3geo from "d3-geo";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { GeoJsonProperties, Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoPermissibleObjects } from "d3-geo";

gsap.registerPlugin(useGSAP);

// ══════════════════════════════════════════════════════════════════════════════
// 【魔数常量区域 - Magic Numbers】
// ══════════════════════════════════════════════════════════════════════════════

// SVG 逻辑尺寸
const SVG_WIDTH = 800;
const SVG_HEIGHT = 800;
// 【审美调优】缩放边距，让地图撑满视野更具冲击感
const PADDING = 20;

const LAYER_BOTTOM_Y = 20;      // 底座下沉量
const LAYER_TOP_DEFAULT_Y = 0;  // 顶盖自然状态高度
const LAYER_TOP_ACTIVE_Y = -40; // 被选中后的剧烈抬起目标点
const MIDDLE_LAYER_COUNT = 15;  // 15层墙体侧壁侧面

// 【视觉升维：高级配色体系】
const COLOR_TOP_FILL = "#022C3A";                      // 沉稳的暗赛博青色顶盖 (Desaturated Teal)
const COLOR_TOP_ACTIVE_FILL = "rgba(2, 60, 80, 0.95)"; // 选中时仅微微变亮，不再瞎眼
const COLOR_TOP_STROKE = "rgba(0, 220, 255, 0.5)";     // 低调但清晰的线框描边
const COLOR_BOTTOM_FILL = "#030e14";                   // 深邃的深渊底座

// 暗紫至赛博蓝的渐变函数 (给中间 15 层侧壁打上层次色彩)
function interpolateSideWall(idx: number, maxIdx: number): string {
  // 从 深紫 #1f0b40 -> 赛博靛蓝 #0b4c7a
  const c1 = [31, 11, 64];   // #1f0b40
  const c2 = [11, 76, 122];  // #0b4c7a
  const ratio = idx / Math.max(1, maxIdx);
  const r = Math.round(c1[0] + ratio * (c2[0] - c1[0]));
  const g = Math.round(c1[1] + ratio * (c2[1] - c1[1]));
  const b = Math.round(c1[2] + ratio * (c2[2] - c1[2]));
  return `rgb(${r}, ${g}, ${b})`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 【数据流与 ID 映射】
// ══════════════════════════════════════════════════════════════════════════════
const ADCODE_MAP: Record<number, string> = {
  320111: "node-current", // 浦口区
  320114: "node-2",       // 雨花台区
  320105: "node-3",       // 建邺区
  320106: "node-4",       // 鼓楼区
  320104: "node-current"  // 秦淮区
};

const NODE_TO_ADCODES = Object.entries(ADCODE_MAP).reduce((acc, [ad, node]) => {
  if (!acc[node]) acc[node] = [];
  acc[node].push(Number(ad));
  return acc;
}, {} as Record<string, number[]>);

interface D3SandboxProps {
  visible: boolean;
  selectedNodeId: string;
  onNodeSelect: (nodeId: string) => void;
}

interface DistrictItem {
  adcode: number;
  name: string;
  nodeId: string;
  pathD: string;
  centroidY: number; // 用于最初始的 DOM Z-sorting
}

export function D3Sandbox({ visible, selectedNodeId, onNodeSelect }: D3SandboxProps) {
  // ─── 预处理与原生投影体系 ──────────────────────────────────────────────────
  const districts = useMemo<DistrictItem[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geoJson = require("../nanjingDistricts.json") as FeatureCollection<Geometry, GeoJsonProperties>;

    const projection = d3geo
      .geoIdentity()
      .reflectY(true)
      .fitExtent(
        [[PADDING, PADDING], [SVG_WIDTH - PADDING, SVG_HEIGHT - PADDING]], 
        geoJson as GeoPermissibleObjects
      );

    const geoPathGenerator = d3geo.geoPath().projection(projection);

    const mapped = geoJson.features.map((f: Feature<Geometry, GeoJsonProperties>) => {
      const adcode = (f.properties as { adcode: number }).adcode;
      const name = (f.properties as { name: string }).name;
      const d = geoPathGenerator(f) || "";
      const centroid = geoPathGenerator.centroid(f);
      return {
        adcode,
        name,
        nodeId: ADCODE_MAP[adcode] || "node-current",
        pathD: d,
        centroidY: centroid[1] || 0
      };
    }).filter((item: DistrictItem) => item.pathD.length > 0);

    // 【1. 核心修复 - 初始地理排序 Z-Sorting】
    // Y 值比较大（更靠近地球南端、屏幕下方）的区域需要在视觉前方盖住后面的区域。
    // 所以 Y 小的先进数组（沉在底面），Y 大的后进数组（盖在上面）。
    return mapped.sort((a, b) => a.centroidY - b.centroidY);
  }, []);

  // ─── GSAP 霸体接管控制区 ──────────────────────────────────────────────────
  const currentTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const previousSelectedGroupRef = useRef<string | null>(null);

  useGSAP(() => {
    if (!visible) return;

    // 防止同个 Node 反复击打重载
    if (previousSelectedGroupRef.current === selectedNodeId) return;

    // 清理并在任何动画执行前抹平上一个可能未完成的 TL
    if (currentTimelineRef.current) {
      currentTimelineRef.current.kill();
    }

    const masterTl = gsap.timeline();
    currentTimelineRef.current = masterTl;

    const prevNodeId = previousSelectedGroupRef.current;
    
    // 【阶段 1：先锋回归 (Drop Previous)】
    if (prevNodeId && prevNodeId !== selectedNodeId) {
      const pAdcodes = NODE_TO_ADCODES[prevNodeId] || [];
      pAdcodes.forEach((adcode: number) => {
        const topEl = `#d3-top-${adcode}`;
        const midEls = Array.from({ length: MIDDLE_LAYER_COUNT }, (_, i) => `#d3-mid-${adcode}-${i}`);
        const filterEl = document.getElementById(`glow-filter-${adcode}`);

        // 所有相关 DOM 一起流畅降落
        masterTl.to(topEl, {
          y: LAYER_TOP_DEFAULT_Y,
          fill: COLOR_TOP_FILL,
          duration: 0.5,
          ease: "power3.inOut"
        }, 0);

        midEls.forEach((sel: string, idx: number) => {
          const defaultY = LAYER_TOP_DEFAULT_Y + (idx / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - LAYER_TOP_DEFAULT_Y);
          masterTl.to(sel, {
            y: defaultY,
            duration: 0.5,
            ease: "power3.inOut"
          }, 0);
        });

        // 柔和熄灭发光滤镜
        if (filterEl) {
          const feBlur = filterEl.querySelector("feGaussianBlur");
          if (feBlur) {
            masterTl.to({ val: parseFloat(feBlur.getAttribute("stdDeviation") || "0") }, {
              val: 0,
              duration: 0.5,
              ease: "power2.inOut",
              onUpdate: function() {
                feBlur.setAttribute("stdDeviation", String(this.targets()[0].val.toFixed(2)));
              }
            }, 0);
          }
        }
      });
    }

    // 【阶段 2：强制截断提层 (Dynamic Z-Sorting via appendChild)】
    const curAdcodes = NODE_TO_ADCODES[selectedNodeId] || [];
    masterTl.call(() => {
      curAdcodes.forEach((adcode: number) => {
         const groupNode = document.getElementById(`group-adcode-${adcode}`);
         if (groupNode && groupNode.parentNode) {
           // 将其从原生文档流插入末尾，瞬间获得王者级遮挡权限
           groupNode.parentNode.appendChild(groupNode);
         }
      });
    });

    // 【阶段 3：舞台王座升起 (Lift Current & Neon Glow)】
    curAdcodes.forEach((adcode: number) => {
      const topEl = `#d3-top-${adcode}`;
      const midEls = Array.from({ length: MIDDLE_LAYER_COUNT }, (_, i) => `#d3-mid-${adcode}-${i}`);
      const filterEl = document.getElementById(`glow-filter-${adcode}`);

      // 顶盖伴随高能后坐力抬起
      masterTl.to(topEl, {
        y: LAYER_TOP_ACTIVE_Y,
        fill: COLOR_TOP_ACTIVE_FILL,
        duration: 0.65,
        ease: "back.out(1.2)"     // 呈现出机械重物咬合撞击感
      }, ">");  // 紧接着上一动作执行（即等完全下落并且调整层级后）

      // 侧壁顺滑均匀摊开展开
      midEls.forEach((sel: string, idx: number) => {
        const stretchedY = LAYER_TOP_ACTIVE_Y + (idx / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - LAYER_TOP_ACTIVE_Y);
        masterTl.to(sel, {
          y: stretchedY,
          duration: 0.65,
          ease: "power3.out"
        }, "<"); // 同步于顶级抬升
      });

      // 极为缓和且高级的光晕点亮
      if (filterEl) {
        const feBlur = filterEl.querySelector("feGaussianBlur");
        if (feBlur) {
          const proxy = { val: 0 };
          masterTl.to(proxy, {
            val: 3.2, // 不过度曝光，稍微节制的高级模糊
            duration: 0.85,  // 发光时长更悠长
            ease: "power2.out",
            onUpdate: () => {
              feBlur.setAttribute("stdDeviation", proxy.val.toFixed(2));
            }
          }, "<0.15"); // 在盖板升起 0.15s 后才渐渐开始晕开，增加质感
        }
      }
    });

    previousSelectedGroupRef.current = selectedNodeId;

  }, { dependencies: [visible, selectedNodeId] });

  // ─── 容器整体入场 ────────────────────────────────────────────────────────
  const mapWrapRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!visible || !mapWrapRef.current) return;
    gsap.fromTo(
      mapWrapRef.current,
      { autoAlpha: 0, scale: 0.95 },
      { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power2.out" }
    );
  }, { dependencies: [visible] });

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: "transparent" }}>
      <div 
        ref={mapWrapRef}
        className="w-full h-full pt-16 flex items-center justify-center invisible relative"
      >
        <div 
          className="absolute pointer-events-none" 
          style={{ width: "200%", height: "200%", 
                   backgroundSize: "60px 60px", 
                   backgroundImage: "linear-gradient(to right, rgba(0, 242, 254, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 242, 254, 0.03) 1px, transparent 1px)", 
                   transform: "perspective(1000px) rotateX(60deg) rotateZ(-30deg) translate(-10%, -20%)" 
          }}
        />

        <div
          className="flex items-center justify-center relative z-10"
          style={{
            transform: "perspective(1000px) rotateX(60deg) rotateZ(-30deg)",
            transformStyle: "preserve-3d",
            width: "85%", // 防止溢出裁切
            aspectRatio: "1",
          }}
        >
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
            width="100%" 
            height="100%"
            style={{ overflow: "visible" }} 
          >
            <defs>
              {districts.map((d: DistrictItem) => (
                <filter key={`glow-${d.adcode}`} id={`glow-filter-${d.adcode}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            {/* 借助已经由 Centroid Y 排序好顺序的地理区块层，默认层级即完美 */}
            {districts.map((district: DistrictItem) => {
              return (
                <g 
                  key={district.adcode} 
                  id={`group-adcode-${district.adcode}`} // 用于 querySelector 取出并排最后
                  className="district-group cursor-pointer"
                  onClick={() => onNodeSelect(district.nodeId)}
                >
                  {/* 底座截面：常驻最底不会随抬升改变 Y 高 */}
                  <path
                    d={district.pathD}
                    fill={COLOR_BOTTOM_FILL}
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={0.8}
                    transform={`translate(0, ${LAYER_BOTTOM_Y})`}
                  />

                  {/* 中间 15 层的立体伪外墙截层 */}
                  {Array.from({ length: MIDDLE_LAYER_COUNT }, (_, idx) => {
                    const defaultY = LAYER_TOP_DEFAULT_Y + (idx / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - LAYER_TOP_DEFAULT_Y);
                    return (
                      <path
                        key={`mid-${district.adcode}-${idx}`}
                        id={`d3-mid-${district.adcode}-${idx}`}
                        d={district.pathD}
                        fill={interpolateSideWall(MIDDLE_LAYER_COUNT - 1 - idx, MIDDLE_LAYER_COUNT - 1)} // 从底向顶取色，形成优雅渐变侧壁
                        stroke="none"      
                        transform={`translate(0, ${defaultY})`}
                        filter={`url(#glow-filter-${district.adcode})`}
                      />
                    );
                  })}

                  <path
                    id={`d3-top-${district.adcode}`}
                    d={district.pathD}
                    fill={COLOR_TOP_FILL}
                    stroke={COLOR_TOP_STROKE}
                    strokeWidth={1.2}
                    transform={`translate(0, ${LAYER_TOP_DEFAULT_Y})`} 
                  />

                  <DistrictLabel 
                    district={district} 
                    isSelected={(NODE_TO_ADCODES[selectedNodeId] || []).includes(district.adcode)} 
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── 附属标注层保持逻辑一致 ──────────────────────────────────────────────────
function DistrictLabel({ district, isSelected }: { district: DistrictItem; isSelected: boolean }) {
  const pos = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geoJson = require("../nanjingDistricts.json") as FeatureCollection<Geometry, GeoJsonProperties>;
    const feature = geoJson.features.find(f => (f.properties as { adcode: number }).adcode === district.adcode);
    if (!feature) return [0, 0];
    
    const projection = d3geo.geoIdentity()
      .reflectY(true)
      .fitExtent([[PADDING, PADDING], [SVG_WIDTH - PADDING, SVG_HEIGHT - PADDING]], geoJson as GeoPermissibleObjects);
    
    return d3geo.geoPath().projection(projection).centroid(feature);
  }, [district.adcode]);

  const textRef = useRef<SVGTextElement>(null);

  // 这里不跟随 masterTl 走，因为文本完全悬停在最顶绝对安全，可以自行补间
  useGSAP(() => {
    if (!textRef.current) return;
    const yVal = isSelected ? LAYER_TOP_ACTIVE_Y : LAYER_TOP_DEFAULT_Y;
    gsap.to(textRef.current, {
      y: yVal,
      duration: isSelected ? 0.65 : 0.5,
      ease: isSelected ? "back.out(1.2)" : "power3.inOut"
    });
  }, [isSelected]);

  if (!pos || pos[0] === 0) return null;

  return (
    <text
      ref={textRef}
      x={pos[0]}
      y={pos[1]}
      style={{
        transformOrigin: "center",
      }}
      className={`font-mono transition-all duration-300 pointer-events-none select-none ${isSelected ? 'font-bold' : ''}`}
      fontSize={isSelected ? "20px" : "15px"}
      fill={isSelected ? "#00FFFF" : "rgba(2, 44, 58, 0.75)"}
      textAnchor="middle"
    >
      {district.name}
    </text>
  );
}
