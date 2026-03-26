"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { MACRO_NODES, NODE_WORD_CLOUDS, WordCloudDatum } from "../macroData";

interface D5WordCloudProps {
  visible: boolean;
  selectedNodeId: string;
}

interface LayoutWord extends WordCloudDatum {
  x: number;
  y: number;
  startY: number;
  rotate: number;
  fontSize: number;
  color: string;
  letterSpacing: number;
  fontWeight: number;
}

interface RectBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const DEFAULT_SIZE = { width: 360, height: 250 };

function buildDenseWords(source: WordCloudDatum[], targetCount = 34): WordCloudDatum[] {
  const seedSuffix = [
    "核心区",
    "热区",
    "片区",
    "路段",
    "站域",
    "圈层",
    "联动区",
    "交汇处",
    "缓冲带",
    "南侧",
    "北侧",
    "东侧",
    "西侧",
    "周边",
    "节点",
  ];
  const unique = new Map<string, number>();
  source.forEach((item) => {
    unique.set(item.text, item.weight);
  });

  let suffixIndex = 0;
  let round = 0;
  const sorted = [...source].sort((a, b) => b.weight - a.weight);
  while (unique.size < targetCount) {
    const base = sorted[round % sorted.length];
    const suffix = seedSuffix[suffixIndex % seedSuffix.length];
    const text = `${base.text}${suffix}`;
    if (!unique.has(text)) {
      const decay = 0.7 - (round % 4) * 0.08;
      unique.set(text, Math.max(8, Math.round(base.weight * decay)));
    }
    suffixIndex += 1;
    round += 1;
    if (round > 200) break;
  }
  return [...unique.entries()].map(([text, weight]) => ({ text, weight }));
}

function buildWordCloudLayout(source: WordCloudDatum[], width: number, height: number): LayoutWord[] {
  const sorted = buildDenseWords(source).sort((a, b) => b.weight - a.weight);
  const maxWeight = sorted[0]?.weight ?? 100;
  const minWeight = sorted[sorted.length - 1]?.weight ?? 0;
  const placedBoxes: RectBox[] = [];
  const boxesByIndex: RectBox[] = [];
  const words: LayoutWord[] = [];
  const centerX = width / 2;
  const centerY = height / 2 + 8;
  const riskPalette = ["#ff4d4f", "#ff7a45", "#ff9c3d"];
  const techPalette = ["#38bdf8", "#4f9fff", "#647dff", "#56a8ff", "#45d2ff", "#8ea2ff"];
  const rotationPreset = [0, 0, 0, 0, 8, -8, 12, -12];

  const normalize = (weight: number) => {
    if (maxWeight === minWeight) return 1;
    return Math.pow((weight - minWeight) / (maxWeight - minWeight), 0.65);
  };

  const intersects = (box: RectBox) =>
    placedBoxes.some((b) => !(box.left > b.right || box.right < b.left || box.top > b.bottom || box.bottom < b.top));
  const toRect = (x: number, y: number, fontSize: number, rotate: number, text: string, pad: number): RectBox => {
    const rawW = fontSize * (text.length * 0.55 + 1.2);
    const rawH = fontSize * 0.9;
    const rad = (Math.abs(rotate) * Math.PI) / 180;
    const w = Math.abs(rawW * Math.cos(rad)) + Math.abs(rawH * Math.sin(rad));
    const h = Math.abs(rawW * Math.sin(rad)) + Math.abs(rawH * Math.cos(rad));
    return {
      left: x - w / 2 - pad,
      right: x + w / 2 + pad,
      top: y - h / 2 - pad,
      bottom: y + h / 2 + pad,
    };
  };

  sorted.forEach((word, index) => {
    const ratio = normalize(word.weight);
    const baseFontSize = 12 + ratio * 50;
    const rotate = rotationPreset[index % rotationPreset.length];
    const color = index < 3 ? riskPalette[index % riskPalette.length] : techPalette[(index + word.text.length) % techPalette.length];
    const margin = 10;
    let found = false;
    let placedX = centerX;
    let placedY = centerY;
    let placedFont = baseFontSize;
    let placedBox: RectBox | null = null;

    for (let shrink = 0; shrink <= 5 && !found; shrink += 1) {
      const fontSize = Math.max(11, baseFontSize * (1 - shrink * 0.08));
      const maxAttempts = index < 6 ? 1300 : 900;
      for (let step = 0; step < maxAttempts && !found; step += 1) {
        const theta = step * 0.31 + index * 0.58;
        const radius = 2 + step * 0.95;
        const x = centerX + Math.cos(theta) * radius * 1.08;
        const y = centerY + Math.sin(theta) * radius * 0.76;
        const box = toRect(x, y, fontSize, rotate, word.text, index < 5 ? 6 : 4);
        const inside = box.left >= margin && box.right <= width - margin && box.top >= margin && box.bottom <= height - margin;
        if (inside && !intersects(box)) {
          placedBox = box;
          placedX = x;
          placedY = y;
          placedFont = fontSize;
          found = true;
        }
      }
    }

    if (!placedBox) return;
    placedBoxes.push(placedBox);
    boxesByIndex.push(placedBox);
    words.push({
      ...word,
      x: placedX,
      y: placedY,
      startY: placedY + 14 + (index % 3) * 3,
      rotate,
      fontSize: placedFont,
      color,
      letterSpacing: placedFont > 36 ? 0.5 : placedFont > 24 ? 0.25 : 0.05,
      fontWeight: index < 2 ? 700 : index < 8 ? 600 : 500,
    });
  });

  if (!words.length) return [];
  const minX = Math.min(...boxesByIndex.map((box) => box.left));
  const maxX = Math.max(...boxesByIndex.map((box) => box.right));
  const minY = Math.min(...boxesByIndex.map((box) => box.top));
  const maxY = Math.max(...boxesByIndex.map((box) => box.bottom));
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);
  const scale = Math.min((width - 18) / contentWidth, (height - 18) / contentHeight, 1.16);
  const targetCenterX = width / 2;
  const targetCenterY = height / 2 + 1;
  const currentCenterX = (minX + maxX) / 2;
  const currentCenterY = (minY + maxY) / 2;

  return words.map((word) => {
    const x = targetCenterX + (word.x - currentCenterX) * scale;
    const y = targetCenterY + (word.y - currentCenterY) * scale;
    return {
      ...word,
      x,
      y,
      startY: y + 16,
      fontSize: Math.max(11, word.fontSize * scale),
      letterSpacing: Math.max(0, word.letterSpacing * scale),
    };
  });
}

export function D5WordCloud({ visible, selectedNodeId }: D5WordCloudProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const canvasRevealRef = useRef<SVGRectElement>(null);
  const cloudGroupRef = useRef<SVGGElement>(null);
  const wordsRef = useRef<(SVGTextElement | null)[]>([]);
  const [size, setSize] = useState(DEFAULT_SIZE);

  const nodeLabel = useMemo(
    () => MACRO_NODES.find((item) => item.id === selectedNodeId)?.label ?? "text1",
    [selectedNodeId],
  );
  const sourceWords = NODE_WORD_CLOUDS[selectedNodeId] ?? NODE_WORD_CLOUDS["node-current"];
  const layoutWords = useMemo(
    () => buildWordCloudLayout(sourceWords, size.width, size.height),
    [sourceWords, size.width, size.height],
  );

  useEffect(() => {
    wordsRef.current = [];
  }, [layoutWords]);

  useEffect(() => {
    if (!rootRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const first = entries[0];
      if (!first) return;
      const nextWidth = Math.max(320, Math.floor(first.contentRect.width));
      const nextHeight = Math.max(200, Math.floor(first.contentRect.height - 44));
      setSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    });
    observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  useGSAP(
    () => {
      if (!visible || !headerRef.current || !canvasRevealRef.current) return;
      const validWords = wordsRef.current.filter((item): item is SVGTextElement => Boolean(item));
      const tl = gsap.timeline();

      tl.to(headerRef.current, {
        autoAlpha: 1,
        duration: 0.35,
        ease: "power2.out",
      });

      tl.to(
        canvasRevealRef.current,
        {
          scaleY: 1,
          duration: 0.55,
          ease: "power2.inOut",
        },
        0.06,
      );

      tl.to(
        validWords,
        {
          autoAlpha: 1,
          opacity: 1,
          attr: {
            y: (_, target) => Number((target as SVGTextElement).dataset.ty ?? 0),
          },
          duration: 0.6,
          ease: "power3.out",
          stagger: {
            each: 0.05,
            from: "random",
          },
        },
        0.58,
      );

      if (cloudGroupRef.current) {
        tl.to(
          cloudGroupRef.current,
          {
            rotate: 1.4,
            transformOrigin: "50% 50%",
            duration: 7.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          },
          1.2,
        );
      }

      return () => {
        tl.kill();
      };
    },
    { dependencies: [visible, selectedNodeId, layoutWords], scope: rootRef },
  );

  if (!visible) return null;

  return (
    <div ref={rootRef} className="d5cloud-root" aria-label="语义地点词汇云图">
      <header ref={headerRef} className="d1tl-header d5cloud-header">
        <span className="d1tl-header-dot d5cloud-dot" />
        <span className="d1tl-header-title">语义地点词汇云图 · {nodeLabel}</span>
      </header>

      <div className="d5cloud-canvas-wrap">
        <svg
          key={selectedNodeId}
          viewBox={`0 0 ${size.width} ${size.height}`}
          className="d5cloud-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${nodeLabel} 节点词云`}
        >
          <defs>
            <pattern id="d5-grid-pattern" width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(34, 58, 112, 0.07)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width={size.width} height={size.height} fill="#ffffff" />
          <rect width={size.width} height={size.height} fill="url(#d5-grid-pattern)" />
          <rect
            ref={canvasRevealRef}
            className="d5cloud-canvas-reveal"
            width={size.width}
            height={size.height}
            fill="#ffffff"
          />

          <g ref={cloudGroupRef}>
            {layoutWords.map((word, index) => (
              <text
                key={`${selectedNodeId}-${word.text}`}
                ref={(el) => {
                  wordsRef.current[index] = el;
                }}
                x={word.x}
                y={word.startY}
                data-ty={word.y}
                className="d5cloud-word"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${word.rotate} ${word.x} ${word.y})`}
                fill={word.color}
                style={{
                  fontSize: `${word.fontSize}px`,
                  letterSpacing: `${word.letterSpacing}px`,
                  fontWeight: word.fontWeight,
                }}
              >
                {word.text}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
