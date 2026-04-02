"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  LineBasicMaterial,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  Texture,
  TextureLoader,
  Vector2,
  type Group,
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

gsap.registerPlugin(useGSAP);

interface D3SandboxProps {
  visible: boolean;
  activeSectorId: string;
  selectedNodeId: string | null;
  onSectorChange: (sectorId: string) => void;
  onNodeSelect: (nodeId: string) => void;
}

const SVG_WIDTH = 1280;
const SVG_HEIGHT = 1080;
const SVG_CENTER_X = SVG_WIDTH / 2;
const SVG_CENTER_Y = SVG_HEIGHT / 2;
const BASE_DEPTH = 24;
const SELECTED_DEPTH_SCALE = 2.5;
const SPREAD_DISTANCE = 12;
const SCENE_SCALE_XY = 0.78;
const SIDE_LINE_Z_EPSILON = 0.28;
const DESKTOP_SVG_URL = "/Desktop.svg";
const PLATE_IDS = ["plate-1", "plate-2", "plate-3", "plate-4", "plate-5"] as const;
type PlateId = (typeof PLATE_IDS)[number];

const DESKTOP_MASK_PATHS_FALLBACK = [
  "M503.519 307.009L510.068 300H603.264L607.295 301.001L613.34 304.506L617.37 308.511L619.889 312.516L622.911 319.024V430.165H870.26V388.112L871.772 382.104L876.305 375.596L881.343 370.589L889.403 366.084H949.855L976.555 380.101H1055.14V493.745H1103V511.267H1096.95V512.769L1078.82 533.796L1067.74 547.313L1057.66 557.326L1045.57 565.837L1028.95 572.345L1017.36 574.848L1006.28 576.35H997.713H968.998V589.366V610.894L962.953 622.909L954.389 635.925L939.78 651.445L923.659 672.471L903.005 695L868.749 668.967V573.847H853.132H837.516L821.899 577.351L809.305 580.856L795.703 587.364L782.605 595.374L771.018 603.384L761.447 609.392L755.402 613.397L745.83 616.401H651.626V523.783H505.03H501V314.518L503.519 307.009Z",
  "M566.948 995.453L541 845H842L805.672 1000.31L797.18 1011.95L785.857 1021.66L773.119 1027H603.276L597.143 1025.54L583.461 1018.75L575.44 1010.01L566.948 995.453Z",
  "M626.284 538H486V549.5L539.915 838H839.327L842.991 829.5L847.702 811.5L855.03 787.5L862.359 768.5L871.257 749.5L880.679 730L889.578 714L899 702V698.5L856.601 667V580H836.71L833.046 581L820.483 583.5L802.162 590L791.17 596.5L767.615 612.5L758.716 618L749.294 622.5L738.302 626H626.284V538Z",
  "M483.32 657H260V723.235L273.593 795.252L285.73 861.487L290.1 867.795L293.983 869.897L300.78 872H384.768L419.237 865.166L465.842 853.601L474.581 850.447L494 847.819L491.573 712.196L490.116 704.836V699.054L483.32 657Z",
  "M457.61 120.5L463.43 119L468.192 118L474.012 119L479.302 122.5L483.006 126.5L486.709 131L489.884 136.5L492 142.5V149.5V346.5H465.547L453.907 347V555L473.483 652H322.169L310 643V232L311.587 230.5L313.174 228L457.61 120.5Z",
] as const;

const DEFAULT_ACTIVE_PLATE_ID = "plate-4";

interface PlateGeometryBundle {
  id: PlateId;
  geometry: ExtrudeGeometry;
  topOverlayGeometry: ShapeGeometry;
  sideLinesGeometry: BufferGeometry;
  edgeGeometry: EdgesGeometry;
}

interface PlateVisualRef {
  group: Group;
  topScanMaterial: MeshBasicMaterial;
  topScanTexture: Texture;
  sideMaterial: MeshStandardMaterial;
  sideLineMaterial: LineBasicMaterial;
  edgeMaterial: LineBasicMaterial;
  pulse: { value: number };
}

function makeSideLineGeometry(shape: Shape, spreadX: number, spreadY: number): BufferGeometry {
  const points = shape.getSpacedPoints(58);
  const positions: number[] = [];

  points.forEach((point) => {
    const tx = point.x - SVG_CENTER_X + spreadX;
    const ty = SVG_CENTER_Y - point.y + spreadY;
    positions.push(tx, ty, SIDE_LINE_Z_EPSILON, tx, ty, BASE_DEPTH - SIDE_LINE_Z_EPSILON);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
}

function applySvgTextureUv(geometry: ExtrudeGeometry, spreadX: number, spreadY: number) {
  const position = geometry.getAttribute("position");
  const uvArray = new Float32Array(position.count * 2);

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const sourceX = x - spreadX + SVG_CENTER_X;
    const sourceY = SVG_CENTER_Y - (y - spreadY);

    const u = MathUtils.clamp(sourceX / SVG_WIDTH, 0, 1);
    const v = 1 - MathUtils.clamp(sourceY / SVG_HEIGHT, 0, 1);
    uvArray[i * 2] = u;
    uvArray[i * 2 + 1] = v;
  }

  geometry.setAttribute("uv", new BufferAttribute(uvArray, 2));
}

function createTopScanTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const primary = ctx.createLinearGradient(0, 0, canvas.width, 0);
    primary.addColorStop(0, "rgba(255,255,255,0)");
    primary.addColorStop(0.34, "rgba(255,255,255,0)");
    primary.addColorStop(0.5, "rgba(255,255,255,1)");
    primary.addColorStop(0.66, "rgba(255,255,255,0)");
    primary.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const accent = ctx.createLinearGradient(0, 0, canvas.width, 0);
    accent.addColorStop(0.18, "rgba(255,255,255,0)");
    accent.addColorStop(0.24, "rgba(255,255,255,0.55)");
    accent.addColorStop(0.3, "rgba(255,255,255,0)");
    accent.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = 0.68;
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.repeat.set(2.05, 1);
  texture.offset.set(0, 0);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function extractDesktopMaskPaths(svgMarkup: string): string[] {
  const xml = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const maskPaths = Array.from(xml.querySelectorAll("mask path[d]"))
    .map((node) => node.getAttribute("d")?.trim())
    .filter((value): value is string => Boolean(value));

  if (maskPaths.length >= 5) {
    return maskPaths.slice(0, 5);
  }

  return [...DESKTOP_MASK_PATHS_FALLBACK];
}

function computeRawCentroid(shape: Shape): { x: number; y: number } {
  const points = shape.getSpacedPoints(120);
  const sum = points.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 },
  );

  return {
    x: sum.x / Math.max(1, points.length),
    y: sum.y / Math.max(1, points.length),
  };
}

function mapShapesToPlateIds(shapes: Shape[]): Array<{ id: PlateId; shape: Shape }> {
  const entries = shapes.map((shape, index) => {
    const center = computeRawCentroid(shape);
    return { index, shape, cx: center.x, cy: center.y };
  });

  if (entries.length < 5) return [];

  const idByIndex = new Map<number, PlateId>();
  const remaining = entries.map((entry) => entry.index);
  const removeIndex = (indexToRemove: number) => {
    const idx = remaining.indexOf(indexToRemove);
    if (idx >= 0) remaining.splice(idx, 1);
  };

  const top = entries.reduce((best, item) => (item.cy < best.cy ? item : best));
  idByIndex.set(top.index, "plate-1");
  removeIndex(top.index);

  const bottom = entries.reduce((best, item) => (item.cy > best.cy ? item : best));
  idByIndex.set(bottom.index, "plate-2");
  removeIndex(bottom.index);

  const remainingEntries = entries.filter((entry) => remaining.includes(entry.index));
  const left = remainingEntries.reduce((best, item) => (item.cx < best.cx ? item : best));
  idByIndex.set(left.index, "plate-3");
  removeIndex(left.index);

  const tail = entries
    .filter((entry) => remaining.includes(entry.index))
    .sort((a, b) => a.cy - b.cy);
  if (tail[0]) idByIndex.set(tail[0].index, "plate-4");
  if (tail[1]) idByIndex.set(tail[1].index, "plate-5");

  return entries
    .map((entry) => {
      const id = idByIndex.get(entry.index);
      if (!id) return null;
      return { id, shape: entry.shape };
    })
    .filter((item): item is { id: PlateId; shape: Shape } => item !== null)
    .sort((a, b) => PLATE_IDS.indexOf(a.id) - PLATE_IDS.indexOf(b.id));
}

function buildPlateGeometries(pathDefs: string[]): PlateGeometryBundle[] {
  const loader = new SVGLoader();
  const svgMarkup = `<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">${pathDefs
    .slice(0, 5)
    .map((path) => `<path d="${path}" />`)
    .join("")}</svg>`;

  const parsed = loader.parse(svgMarkup);
  const shapes = parsed.paths.flatMap((svgPath) => SVGLoader.createShapes(svgPath));
  const mapped = mapShapesToPlateIds(shapes);

  return mapped.map(({ id, shape }) => {
    const sample = shape.getSpacedPoints(100);
    const center = sample.reduce(
      (acc, point) => {
        acc.x += point.x - SVG_CENTER_X;
        acc.y += SVG_CENTER_Y - point.y;
        return acc;
      },
      { x: 0, y: 0 },
    );
    const cx = center.x / Math.max(1, sample.length);
    const cy = center.y / Math.max(1, sample.length);
    const direction = new Vector2(cx, cy);
    const spread = direction.lengthSq() > 0.0001 ? direction.normalize().multiplyScalar(SPREAD_DISTANCE) : new Vector2();

    const geometry = new ExtrudeGeometry(shape, {
      depth: BASE_DEPTH,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 24,
    });
    geometry.translate(-SVG_CENTER_X, -SVG_CENTER_Y, 0);
    geometry.scale(1, -1, 1);
    geometry.translate(spread.x, spread.y, 0);
    applySvgTextureUv(geometry, spread.x, spread.y);
    geometry.computeVertexNormals();

    const topOverlayGeometry = new ShapeGeometry(shape, 24);
    topOverlayGeometry.translate(-SVG_CENTER_X, -SVG_CENTER_Y, 0);
    topOverlayGeometry.scale(1, -1, 1);
    topOverlayGeometry.translate(spread.x, spread.y, BASE_DEPTH + 0.26);

    const sideLinesGeometry = makeSideLineGeometry(shape, spread.x, spread.y);
    const edgeGeometry = new EdgesGeometry(geometry, 35);

    return {
      id,
      geometry,
      topOverlayGeometry,
      sideLinesGeometry,
      edgeGeometry,
    };
  });
}

function PlateMesh({
  plate,
  onToggle,
  registerVisual,
  topTexture,
}: {
  plate: PlateGeometryBundle;
  onToggle: (id: string) => void;
  registerVisual: (id: string, value: PlateVisualRef | null) => void;
  topTexture: Texture | null;
}) {
  const groupRef = useRef<Group>(null);
  const pulseRef = useRef({ value: 0 });
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  useEffect(() => {
    if (!topTexture) return;
    const nextAnisotropy = Math.max(1, Math.min(16, maxAnisotropy || 1));
    if (topTexture.anisotropy === nextAnisotropy) return;
    topTexture.anisotropy = nextAnisotropy;
    topTexture.needsUpdate = true;
  }, [maxAnisotropy, topTexture]);

  const topMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color("#ffffff"),
        side: DoubleSide,
        map: topTexture,
        toneMapped: false,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    [topTexture],
  );

  const topScanTexture = useMemo(() => createTopScanTexture(), []);

  const topScanMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color("#b9fbff"),
        alphaMap: topScanTexture,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        blending: AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [topScanTexture],
  );

  const sideMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#94c8ef"),
        roughness: 0.42,
        metalness: 0.24,
        emissive: new Color("#49cbff"),
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.66,
        side: DoubleSide,
        forceSinglePass: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: 2,
        polygonOffsetUnits: 2,
      }),
    [],
  );

  const sideLineMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: new Color("#8ee8ff"),
        transparent: true,
        opacity: 0.16,
        blending: AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  const edgeMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: new Color("#5fd7ff"),
        transparent: true,
        opacity: 0.2,
        blending: AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    if (!groupRef.current) return;
    registerVisual(plate.id, {
      group: groupRef.current,
      topScanMaterial,
      topScanTexture,
      sideMaterial,
      sideLineMaterial,
      edgeMaterial,
      pulse: pulseRef.current,
    });

    return () => {
      registerVisual(plate.id, null);
    };
  }, [plate.id, topScanMaterial, topScanTexture, sideMaterial, sideLineMaterial, edgeMaterial, registerVisual]);

  useEffect(
    () => () => {
      plate.geometry.dispose();
      plate.topOverlayGeometry.dispose();
      plate.sideLinesGeometry.dispose();
      plate.edgeGeometry.dispose();
      topMaterial.dispose();
      topScanMaterial.dispose();
      topScanTexture.dispose();
      sideMaterial.dispose();
      sideLineMaterial.dispose();
      edgeMaterial.dispose();
    },
    [plate, topMaterial, topScanMaterial, topScanTexture, sideMaterial, sideLineMaterial, edgeMaterial],
  );

  return (
    <group
      ref={groupRef}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <mesh
        geometry={plate.geometry}
        renderOrder={1}
        onPointerDown={(event) => {
          event.stopPropagation();
          onToggle(plate.id);
        }}
      >
        <primitive object={topMaterial} attach="material-0" />
        <primitive object={sideMaterial} attach="material-1" />
      </mesh>

      <mesh
        geometry={plate.topOverlayGeometry}
        renderOrder={7}
        onPointerDown={(event) => {
          event.stopPropagation();
          onToggle(plate.id);
        }}
      >
        <primitive object={topScanMaterial} attach="material" />
      </mesh>

      <lineSegments geometry={plate.sideLinesGeometry} renderOrder={5}>
        <primitive object={sideLineMaterial} attach="material" />
      </lineSegments>

      <lineSegments geometry={plate.edgeGeometry} renderOrder={6}>
        <primitive object={edgeMaterial} attach="material" />
      </lineSegments>
    </group>
  );
}

function PlateScene({
  plates,
  onToggle,
  registerVisual,
  topTexture,
}: {
  plates: PlateGeometryBundle[];
  onToggle: (id: string) => void;
  registerVisual: (id: string, value: PlateVisualRef | null) => void;
  topTexture: Texture | null;
}) {
  const visualsRef = useRef<Record<string, PlateVisualRef>>({});

  const registerVisualWithStore = useCallback(
    (id: string, value: PlateVisualRef | null) => {
      if (value) {
        visualsRef.current[id] = value;
      } else {
        delete visualsRef.current[id];
      }
      registerVisual(id, value);
    },
    [registerVisual],
  );

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    plates.forEach((plate) => {
      const visual = visualsRef.current[plate.id];
      if (!visual) return;

      const wave = (Math.sin(t * 2.25) + 1) * 0.5;
      const pulse = visual.pulse.value;

      visual.topScanMaterial.opacity = pulse * (0.24 + wave * 0.16);
      visual.topScanTexture.offset.x = (t * 0.26) % 1;
      visual.sideMaterial.emissiveIntensity = 0.2 + pulse * (0.9 + wave * 0.28);
      visual.sideMaterial.opacity = 0.6 + pulse * 0.22;
      visual.sideLineMaterial.opacity = 0.18 + pulse * (0.38 + wave * 0.12);
      visual.edgeMaterial.opacity = 0.24 + pulse * (0.5 + wave * 0.16);
      visual.group.position.z = MathUtils.lerp(visual.group.position.z, 0, Math.min(1, delta * 9));
    });
  });

  return (
    <>
      <ambientLight intensity={0.86} color="#f4fbff" />
      <directionalLight position={[380, -620, 860]} intensity={1.18} color="#ffffff" />
      <pointLight position={[200, 140, 320]} intensity={1.2} color="#79d9ff" />
      <pointLight position={[-260, -140, 220]} intensity={0.56} color="#8ea8ff" />

      <group scale={[SCENE_SCALE_XY, SCENE_SCALE_XY, 1]} position={[0, 14, 0]}>
        {plates.map((plate) => (
          <PlateMesh
            key={plate.id}
            plate={plate}
            onToggle={onToggle}
            registerVisual={registerVisualWithStore}
            topTexture={topTexture}
          />
        ))}
      </group>
    </>
  );
}

export function D3SandboxThreeMvp(props: D3SandboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const loadedTextureRef = useRef<Texture | null>(null);

  const visualRefs = useRef<Record<string, PlateVisualRef>>({});
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);
  const [plates, setPlates] = useState<PlateGeometryBundle[]>([]);
  const [topTexture, setTopTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let active = true;

    fetch(DESKTOP_SVG_URL)
      .then((response) => response.text())
      .then((svgMarkup) => {
        if (!active) return;
        const paths = extractDesktopMaskPaths(svgMarkup);
        setPlates(buildPlateGeometries(paths));
      })
      .catch(() => {
        if (!active) return;
        setPlates(buildPlateGeometries([...DESKTOP_MASK_PATHS_FALLBACK]));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loader = new TextureLoader();

    loader.load(
      DESKTOP_SVG_URL,
      (texture) => {
        if (!active) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 16;
        texture.needsUpdate = true;

        if (loadedTextureRef.current && loadedTextureRef.current !== texture) {
          loadedTextureRef.current.dispose();
        }
        loadedTextureRef.current = texture;
        setTopTexture(texture);
      },
      undefined,
      () => {
        if (!active) return;
        setTopTexture(null);
      },
    );

    return () => {
      active = false;
      if (loadedTextureRef.current) {
        loadedTextureRef.current.dispose();
        loadedTextureRef.current = null;
      }
    };
  }, []);

  const registerVisual = useCallback((id: string, value: PlateVisualRef | null) => {
    if (value) {
      visualRefs.current[id] = value;
      return;
    }
    delete visualRefs.current[id];
  }, []);

  const handleToggle = useCallback((plateId: string) => {
    setSelectedPlateId((prev) => (prev === plateId ? null : plateId));
  }, []);

  useEffect(() => {
    if (!props.visible) {
      setSelectedPlateId(null);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setSelectedPlateId(DEFAULT_ACTIVE_PLATE_ID);
    });
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [props.visible]);

  useGSAP(
    () => {
      if (!props.visible) return;
      if (!headerRef.current || !canvasWrapRef.current) return;

      const tl = gsap.timeline();
      tl.fromTo(
        headerRef.current,
        { autoAlpha: 0, y: -10 },
        { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out" },
      );
      tl.fromTo(
        canvasWrapRef.current,
        { autoAlpha: 0, scale: 0.97 },
        { autoAlpha: 1, scale: 1, duration: 0.62, ease: "power2.out" },
        0.04,
      );

      return () => {
        tl.kill();
      };
    },
    { dependencies: [props.visible], scope: rootRef },
  );

  useGSAP(
    () => {
      if (!props.visible) return;

      Object.entries(visualRefs.current).forEach(([plateId, visual]) => {
        const targetScale = selectedPlateId === plateId ? SELECTED_DEPTH_SCALE : 1;
        const duration = targetScale > visual.group.scale.z ? 0.5 : 0.4;
        gsap.to(visual.group.scale, {
          z: targetScale,
          duration,
          ease: targetScale > 1 ? "expo.out" : "power2.inOut",
          overwrite: true,
        });

        gsap.to(visual.pulse, {
          value: selectedPlateId === plateId ? 1 : 0,
          duration: selectedPlateId === plateId ? 0.45 : 0.3,
          ease: "sine.out",
          overwrite: true,
        });
      });
    },
    { dependencies: [selectedPlateId, props.visible, plates.length], scope: rootRef },
  );

  if (!props.visible) return null;

  return (
    <div ref={rootRef} className="d3viz-root d3three-root">
      <header ref={headerRef} className="d1tl-header d3viz-header d3three-header">
        <span className="d1tl-header-dot d3viz-dot" />
        <span className="d1tl-header-title">核心地域态势</span>
      </header>

      <div ref={canvasWrapRef} className="d3three-canvas-wrap">
        <Canvas
          className="d3three-canvas"
          dpr={[1.25, 2.4]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
          camera={{
            fov: 36,
            near: 10,
            far: 3000,
            position: [72, -900, 980],
          }}
          onCreated={({ camera }) => {
            camera.lookAt(0, -18, 90);
          }}
          onPointerMissed={() => setSelectedPlateId(null)}
        >
          <PlateScene
            plates={plates}
            onToggle={handleToggle}
            registerVisual={registerVisual}
            topTexture={topTexture}
          />
        </Canvas>
      </div>
    </div>
  );
}
