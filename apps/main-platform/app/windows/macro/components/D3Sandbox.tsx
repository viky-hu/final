"use client";

import { useMemo, useRef, forwardRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import * as THREE from "three";
import { DEFAULT_SELECTED_NODE_ID, MACRO_NODES } from "../macroData";

gsap.registerPlugin(useGSAP);

interface D3SandboxProps {
  visible: boolean;
  selectedNodeId: string;
  onNodeSelect: (nodeId: string) => void;
}

export function D3Sandbox({ visible, selectedNodeId, onNodeSelect }: D3SandboxProps) {
  const headerRef = useRef<HTMLElement>(null);
  const selectedNodeLabel = useMemo(
    () => MACRO_NODES.find((node) => node.id === selectedNodeId)?.label ?? MACRO_NODES[0]?.label ?? DEFAULT_SELECTED_NODE_ID,
    [selectedNodeId],
  );
  const totalNodeCount = MACRO_NODES.length;

  useGSAP(() => {
    if (!visible || !headerRef.current) return;
    gsap.to(headerRef.current, {
      autoAlpha: 1,
      duration: 0.35,
      ease: "power2.out",
    });
  }, [visible]);

  return (
    <div className="w-full h-full relative d3viz-root" style={{ backgroundColor: "#1e1919", display: "flex", flexDirection: "column" }}>
      {/* ── 标题栏，复用 d1tl-header 结构 ── */}
      <header ref={headerRef} className="d1tl-header d3viz-header" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(to right, rgba(0,0,0,0.8), transparent)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <span className="d1tl-header-dot d3viz-dot" />
        <span className="d1tl-header-title text-[#eeeeee]">全局节点地图</span>
      </header>

      <div className="d3viz-ticker" aria-hidden="true">
        <div className="d3viz-ticker-track">
          <span>当前节点：{selectedNodeLabel}&nbsp;//</span>
          <span>&nbsp;总节点：{totalNodeCount}&nbsp;//</span>
          <span>&nbsp;宏观全局节点网络&nbsp;//</span>
          <span>当前节点：{selectedNodeLabel}&nbsp;//</span>
          <span>&nbsp;总节点：{totalNodeCount}&nbsp;//</span>
          <span>&nbsp;宏观全局节点网络&nbsp;//</span>
        </div>
      </div>

      <div className="w-full h-full pt-[72px] d3viz-canvas-wrap">
        <Canvas className="d3viz-canvas" frameloop="always" camera={{ position: [0, 15, 25], fov: 45 }}>
          <color attach="background" args={["#1e1919"]} />
          <ambientLight intensity={0.5} />
          <D3Scene visible={visible} selectedNodeId={selectedNodeId} onNodeSelect={onNodeSelect} />
          <EffectComposer>
            <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  );
}

const radarVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const radarFragmentShader = `
  uniform vec3 uColor;
  uniform float uSweep;
  varying vec2 vUv;

  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    if (r > 1.0) discard;

    float a = atan(p.y, p.x);
    if (a < 0.0) a += TAU;

    // Use a negative sign to rotate clockwise, or positive for counter-clockwise
    float d = mod(a - uSweep + TAU, TAU);
    float fan = PI / 2.0;

    float sweep = 1.0 - smoothstep(0.0, fan, d);
    float radial = smoothstep(0.05, 0.45, r) * (1.0 - smoothstep(0.65, 1.0, r));
    
    // Lower the alpha multiplier to reduce brightness/light pollution
    float alpha = sweep * radial * 0.4;

    // Don't multiply uColor by 2.0 to keep the base color softer
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function Radar() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const sweepRef = useRef(0);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(0, 0.58, 1.25) },
      uSweep: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    sweepRef.current = (sweepRef.current + delta * 1.2) % (Math.PI * 2);

    if (materialRef.current) {
      materialRef.current.uniforms.uSweep.value = sweepRef.current;
      materialRef.current.uniformsNeedUpdate = true;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[40, 40]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={radarVertexShader}
          fragmentShader={radarFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function RippleRing({ color, offset }: { color: [number, number, number]; offset: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!ringRef.current || !matRef.current) return;
    const t = (state.clock.elapsedTime * 0.55 + offset) % 1;
    const scale = 0.8 + t * 3.4;
    ringRef.current.scale.set(scale, scale, 1);
    matRef.current.opacity = (1 - t) * 0.55;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <ringGeometry args={[0.18, 0.24, 40]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

const Beacon = forwardRef<
  THREE.Group,
  {
    nodeId: string;
    position: [number, number, number];
    isHome: boolean;
    isSelected: boolean;
    scale?: number;
    onSelect: (nodeId: string) => void;
  }
>(({ nodeId, position, isHome, isSelected, scale = 1, onSelect }, ref) => {
    const color: [number, number, number] = isHome ? [0.85, 0.22, 0.08] : [0, 0.4, 0.8];
    const selectedColor: [number, number, number] = isHome ? [1.05, 0.3, 0.12] : [0.12, 0.65, 1.1];
    const coreColor: [number, number, number] = isHome ? [1.55, 0.42, 0.12] : [0.2, 0.85, 1.55];
    const activeColor = isSelected ? selectedColor : color;
    const ringOpacity = isSelected ? 0.98 : 0.85;
    const wireframeOpacity = isSelected ? 0.7 : 0.45;
    const columnOpacity = isSelected ? 0.34 : 0.23;

    return (
      <group
        ref={ref}
        position={position}
        scale={scale}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(nodeId);
        }}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.45, 0.82, 36]} />
          <meshBasicMaterial
            color={activeColor}
            transparent
            opacity={ringOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {isSelected && (
          <>
            <RippleRing color={activeColor} offset={0} />
            <RippleRing color={activeColor} offset={0.5} />
          </>
        )}

        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.82, 0.04, 5, 32, 1, true]} />
          <meshBasicMaterial
            color={activeColor}
            transparent
            opacity={columnOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.78, 0.03, 5, 16, 1, true]} />
          <meshBasicMaterial
            color={activeColor}
            wireframe
            transparent
            opacity={wireframeOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.06, 0.03, 5, 18]} />
          <meshBasicMaterial color={coreColor} toneMapped={false} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
          <ringGeometry args={[0.78, 0.95, 32]} />
          <meshBasicMaterial
            color={activeColor}
            transparent
            opacity={1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, 0.07, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={coreColor} toneMapped={false} />
        </mesh>
      </group>
    );
  });
Beacon.displayName = "Beacon";

function D3Scene({
  visible,
  selectedNodeId,
  onNodeSelect,
}: {
  visible: boolean;
  selectedNodeId: string;
  onNodeSelect: (nodeId: string) => void;
}) {
  const gridRef = useRef<THREE.Group>(null);
  const beaconsRef = useRef<THREE.Group>(null);
  const radarGroupRef = useRef<THREE.Group>(null);

  useGSAP(() => {
    if (!visible) return;

    const tl = gsap.timeline();

    if (gridRef.current) {
      tl.to(gridRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        ease: "power2.out",
      }, 0.2);
    }

    if (radarGroupRef.current) {
      tl.to(radarGroupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        ease: "back.out(1.2)",
      }, 0.6);
    }

    if (beaconsRef.current) {
      const children = beaconsRef.current.children;
      const normalNodes = children.filter((_, i) => MACRO_NODES[i].id !== DEFAULT_SELECTED_NODE_ID);
      const activeNode = children.find((_, i) => MACRO_NODES[i].id === DEFAULT_SELECTED_NODE_ID);

      tl.to(normalNodes.map((c) => c.scale), {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: "elastic.out(1, 0.75)",
      }, 1.0);

      if (activeNode) {
        tl.to(activeNode.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.2,
          ease: "elastic.out(1, 0.5)",
        }, 1.6);
      }
    }

    return () => {
      tl.kill();
    };
  }, [visible]);

  useGSAP(() => {
    if (!visible || !beaconsRef.current) return;
    const children = beaconsRef.current.children;
    const tl = gsap.timeline();
    children.forEach((child, index) => {
      const isSelected = MACRO_NODES[index].id === selectedNodeId;
      tl.to(
        child.scale,
        {
          x: isSelected ? 1.12 : 1,
          y: isSelected ? 1.2 : 1,
          z: isSelected ? 1.12 : 1,
          duration: 0.45,
          ease: "power2.out",
        },
        0,
      );
    });
    return () => {
      tl.kill();
    };
  }, [visible, selectedNodeId]);

  return (
    <>
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.015}
        rotateSpeed={0.4}
        autoRotate={true}
        autoRotateSpeed={0.3}
        makeDefault
      />

      <group ref={gridRef} scale={0.01}>
        <Grid
          args={[40, 40]}
          cellSize={1}
          cellThickness={1}
          cellColor="#004466"
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#0088ff"
          fadeDistance={30}
          fadeStrength={1}
        />
      </group>

      <group ref={radarGroupRef} scale={0.01}>
        <Radar />
      </group>

      <group ref={beaconsRef}>
        {MACRO_NODES.map((node) => (
          <Beacon
            key={node.id}
            nodeId={node.id}
            position={[node.position[0], 0, node.position[2]]}
            isHome={node.isHome}
            isSelected={selectedNodeId === node.id}
            scale={0.01}
            onSelect={onNodeSelect}
          />
        ))}
      </group>
    </>
  );
}
