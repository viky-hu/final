"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  LineBasicMaterial,
  MathUtils,
  MeshStandardMaterial,
  Shape,
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

const PLATE_CONFIGS = [
  {
    id: "plate-1",
    path: "M307 181.5L443.5 76H449.5L454.5 81L458 90.5V313.5V487.5V504.5V520.5L477.5 606.5H300.5V190L303.5 185.5L307 181.5Z",
  },
  {
    id: "plate-2",
    path: "M561.952 969.5L557.115 954.5L531 803H829.393H841V810.5L805.212 963L799.409 975L791.671 984.5L781.031 993L768.941 997H595.321L580.329 993L570.173 982.5L561.952 969.5Z",
  },
  {
    id: "plate-3",
    path: "M463.5 619H239.5V685.5L268.5 824L274 832.5L280.5 836.5L287.5 839H374.5L488 813V665.5L479.5 619H463.5Z",
  },
  {
    id: "plate-4",
    path: "M478 490.5V275.5V266H595.5L604 268.5L609 273L614 280L616 288.5V397H863.5V351.5L869 341.5L876.5 336L884 333.5H942.5L968 346.5H1092V462L1059.5 503.5L1049.5 515L1039 524L1022.5 532.5L1000.5 537H976.5H843.5H823L804 543L787 551L775 559L761 569.5L742.5 579.5H650.5V490.5H478Z",
  },
  {
    id: "plate-5",
    path: "M483 522.5V507H630.358V596H751.801L769.077 588.5L792.451 572L809.22 560.5L827.512 553L848.346 549.5H983V572L973.346 592L959.626 610L904.24 672.5L884.931 701L865.114 747L848.346 789H532.289L483 522.5Z",
  },
] as const;

const DEFAULT_ACTIVE_PLATE_ID = "plate-4";

interface PlateGeometryBundle {
  id: string;
  geometry: ExtrudeGeometry;
  sideLinesGeometry: BufferGeometry;
  edgeGeometry: EdgesGeometry;
}

interface PlateVisualRef {
  group: Group;
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
    positions.push(tx, ty, 0, tx, ty, BASE_DEPTH);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
}

function buildPlateGeometries(): PlateGeometryBundle[] {
  const loader = new SVGLoader();
  const svgMarkup = `<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">${PLATE_CONFIGS.map((item) => `<path d="${item.path}" />`).join("")}</svg>`;
  const parsed = loader.parse(svgMarkup);

  return parsed.paths.flatMap((svgPath, index) => {
    const config = PLATE_CONFIGS[index];
    if (!config) return [];
    const shapes = SVGLoader.createShapes(svgPath);

    return shapes.map((shape) => {
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
      geometry.computeVertexNormals();

      const sideLinesGeometry = makeSideLineGeometry(shape, spread.x, spread.y);
      const edgeGeometry = new EdgesGeometry(geometry, 35);

      return {
        id: config.id,
        geometry,
        sideLinesGeometry,
        edgeGeometry,
      };
    });
  });
}

function PlateMesh({
  plate,
  onToggle,
  registerVisual,
}: {
  plate: PlateGeometryBundle;
  onToggle: (id: string) => void;
  registerVisual: (id: string, value: PlateVisualRef | null) => void;
}) {
  const groupRef = useRef<Group>(null);
  const pulseRef = useRef({ value: 0 });

  const topMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#dff1ff"),
        roughness: 0.34,
        metalness: 0.18,
        emissive: new Color("#5ebeff"),
        emissiveIntensity: 0.08,
        transparent: true,
        opacity: 0.96,
        side: DoubleSide,
      }),
    [],
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
        opacity: 0.62,
        side: DoubleSide,
      }),
    [],
  );

  const sideLineMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: new Color("#8ee8ff"),
        transparent: true,
        opacity: 0.2,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  const edgeMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: new Color("#5fd7ff"),
        transparent: true,
        opacity: 0.26,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    if (!groupRef.current) return;
    registerVisual(plate.id, {
      group: groupRef.current,
      sideMaterial,
      sideLineMaterial,
      edgeMaterial,
      pulse: pulseRef.current,
    });

    return () => {
      registerVisual(plate.id, null);
    };
  }, [plate.id, sideMaterial, sideLineMaterial, edgeMaterial, registerVisual]);

  useEffect(
    () => () => {
      plate.geometry.dispose();
      plate.sideLinesGeometry.dispose();
      plate.edgeGeometry.dispose();
      topMaterial.dispose();
      sideMaterial.dispose();
      sideLineMaterial.dispose();
      edgeMaterial.dispose();
    },
    [plate, topMaterial, sideMaterial, sideLineMaterial, edgeMaterial],
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
        onPointerDown={(event) => {
          event.stopPropagation();
          onToggle(plate.id);
        }}
      >
        <primitive object={topMaterial} attach="material-0" />
        <primitive object={sideMaterial} attach="material-1" />
      </mesh>

      <lineSegments geometry={plate.sideLinesGeometry} renderOrder={3}>
        <primitive object={sideLineMaterial} attach="material" />
      </lineSegments>

      <lineSegments geometry={plate.edgeGeometry} renderOrder={4}>
        <primitive object={edgeMaterial} attach="material" />
      </lineSegments>
    </group>
  );
}

function PlateScene({
  plates,
  onToggle,
  registerVisual,
}: {
  plates: PlateGeometryBundle[];
  onToggle: (id: string) => void;
  registerVisual: (id: string, value: PlateVisualRef | null) => void;
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

      <group scale={[SCENE_SCALE_XY, SCENE_SCALE_XY, 1]} position={[0, -28, 0]}>
        {plates.map((plate) => (
          <PlateMesh key={plate.id} plate={plate} onToggle={onToggle} registerVisual={registerVisualWithStore} />
        ))}
      </group>
    </>
  );
}

export function D3SandboxThreeMvp(props: D3SandboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const visualRefs = useRef<Record<string, PlateVisualRef>>({});
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);

  const plates = useMemo(() => buildPlateGeometries(), []);

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
    { dependencies: [selectedPlateId, props.visible], scope: rootRef },
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
          dpr={[1, 1.8]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{
            fov: 36,
            near: 1,
            far: 5200,
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
          />
        </Canvas>
      </div>
    </div>
  );
}
