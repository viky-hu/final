"use client";

import { useRef, forwardRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import * as THREE from "three";

gsap.registerPlugin(useGSAP);

interface D3SandboxProps {
  visible: boolean;
}

export function D3Sandbox({ visible }: D3SandboxProps) {
  const headerRef = useRef<HTMLElement>(null);

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

      <div className="w-full h-full pt-[36px]">
        <Canvas camera={{ position: [0, 15, 25], fov: 45 }}>
          <color attach="background" args={["#1e1919"]} />
          <ambientLight intensity={0.5} />
          <D3Scene visible={visible} />
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

  // Instead of updating a single uniform float, we can also force a uniform update this way
  useFrame((state) => {
    if (materialRef.current) {
      // make it rotate visibly
      materialRef.current.uniforms.uSweep.value = (state.clock.elapsedTime * 1.5) % (Math.PI * 2);
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[40, 40]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uColor: { value: new THREE.Color(0, 0.5, 1.2) }, // Darker blue color
          uSweep: { value: 0 },
        }}
        vertexShader={radarVertexShader}
        fragmentShader={radarFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
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

const Beacon = forwardRef<THREE.Group, { position: [number, number, number], isCurrent: boolean, scale?: number }>(
  ({ position, isCurrent, scale = 1 }, ref) => {
    // 进一步降低发光强度，避免光污染
    const color: [number, number, number] = isCurrent ? [0.8, 0.2, 0.05] : [0, 0.4, 0.8];
    const coreColor: [number, number, number] = isCurrent ? [1.5, 0.4, 0.1] : [0.2, 0.8, 1.5];

    return (
      <group ref={ref} position={position} scale={scale}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.45, 0.82, 36]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {isCurrent && (
          <>
            <RippleRing color={color} offset={0} />
            <RippleRing color={color} offset={0.5} />
          </>
        )}

        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.82, 0.04, 5, 32, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.23}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.78, 0.03, 5, 16, 1, true]} />
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={0.45}
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
            color={color}
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
  },
);
Beacon.displayName = "Beacon";

function D3Scene({ visible }: { visible: boolean }) {
  const gridRef = useRef<THREE.Group>(null);
  const beaconsRef = useRef<THREE.Group>(null);
  const radarGroupRef = useRef<THREE.Group>(null);

  const nodes = [
    { id: "node1", position: [-8, 0, -6], isCurrent: false },
    { id: "node2", position: [8, 0, 2], isCurrent: false },
    { id: "node3", position: [-3, 0, 8], isCurrent: false },
    { id: "node-current", position: [0, 0, 0], isCurrent: true },
  ];

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
      const normalNodes = children.filter((_, i) => !nodes[i].isCurrent);
      const activeNode = children.find((_, i) => nodes[i].isCurrent);

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
        {nodes.map((node) => (
          <Beacon
            key={node.id}
            position={[node.position[0], 0, node.position[2]]}
            isCurrent={node.isCurrent}
            scale={0.01}
          />
        ))}
      </group>
    </>
  );
}
