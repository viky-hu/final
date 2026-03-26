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
  return (
    <div className="w-full h-full relative" style={{ backgroundColor: "#1e1919" }}>
      {/* 顶部介绍栏 */}
      <div 
        className="absolute top-0 left-0 w-full flex items-center px-4 z-10 pointer-events-none" 
        style={{ 
          height: "36px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          background: "linear-gradient(to right, rgba(0,0,0,0.8), transparent)"
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00d2ff]" style={{ boxShadow: "0 0 8px #00d2ff" }} />
          <h2 className="text-[#eeeeee] text-sm tracking-widest font-bold font-mono">
            3D 拓扑沙盘 (TOPOLOGY SANDBOX)
          </h2>
        </div>
      </div>

      {/* 3D 画布 */}
      <div className="w-full h-full pt-[36px]">
        <Canvas camera={{ position: [0, 15, 25], fov: 45 }}>
          <color attach="background" args={["#1e1919"]} />
          <ambientLight intensity={0.5} />
          
          <D3Scene visible={visible} />

          <EffectComposer>
            <Bloom 
              luminanceThreshold={1} 
              mipmapBlur 
              intensity={1.5} 
            />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  );
}

// ─── 雷达扫描组件 (纯 Shader 实现完美扇形扫描) ───────────────────────
const radarVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const radarFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv) * 2.0;
    
    // 裁剪掉圆外部分
    if (dist > 1.0) discard;
    
    float angle = atan(uv.y, uv.x); // -PI to PI
    angle -= uTime; // 随时间旋转
    
    // 归一化角度到 0.0 ~ 1.0
    angle = mod(angle, 6.28318530718);
    angle /= 6.28318530718;
    
    float fanSize = 0.15; // 扫描扇形的宽度 (约 54 度)
    float alpha = 0.0;
    
    // 制作拖尾渐变效果
    if (angle < fanSize) {
      alpha = 1.0 - (angle / fanSize);
    }
    
    // 边缘与中心柔和虚化
    alpha *= smoothstep(0.0, 0.1, dist) * smoothstep(1.0, 0.8, dist);
    
    gl_FragColor = vec4(uColor, alpha * 0.6);
  }
`;

function Radar() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      // 控制雷达扫描速度
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * 1.5;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[40, 40]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uColor: { value: new THREE.Color(0, 0.8, 2.0) }, // 科技蓝
          uTime: { value: 0 }
        }}
        vertexShader={radarVertexShader}
        fragmentShader={radarFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false} // 确保可以被 Bloom 捕获发光
      />
    </mesh>
  );
}

// ─── 高级感节点光柱组件 ──────────────────────────────────────────────
const Beacon = forwardRef<THREE.Group, { position: [number, number, number], isCurrent: boolean }>(
  ({ position, isCurrent }, ref) => {
    // 颜色配置：当前节点高亮红金，其他节点科技蓝
    const color = isCurrent ? [4, 0.5, 0.1] : [0, 1.5, 3] as [number, number, number];
    const coreColor = isCurrent ? [8, 2, 1] : [1, 3, 6] as [number, number, number];
    
    return (
      <group ref={ref} position={position}>
        {/* 1. 底部贴地能量环 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.5, 0.8, 32]} />
          <meshBasicMaterial 
            color={color} transparent opacity={0.8} 
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} 
          />
        </mesh>
        
        {/* 2. 外层全息投影壳 (高度透明倒锥体) */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.8, 0.1, 5, 32, 1, true]} />
          <meshBasicMaterial 
            color={color} transparent opacity={0.25} 
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} 
          />
        </mesh>

        {/* 3. 内层高亮能量核心 (极细亮柱) */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 5, 16]} />
          <meshBasicMaterial color={coreColor} toneMapped={false} />
        </mesh>
        
        {/* 4. 顶部悬浮定位环 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
          <ringGeometry args={[0.8, 0.9, 32]} />
          <meshBasicMaterial 
            color={color} transparent opacity={1} 
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} 
          />
        </mesh>
      </group>
    );
  }
);
Beacon.displayName = "Beacon";

// ─── 场景整合与时间轴动画 ────────────────────────────────────────────
function D3Scene({ visible }: { visible: boolean }) {
  const gridRef = useRef<THREE.Group>(null);
  const beaconsRef = useRef<THREE.Group>(null);
  const radarGroupRef = useRef<THREE.Group>(null);
  
  // 节点数据 (模拟)
  const nodes = [
    { id: "node1", position: [-8, 0, -6], isCurrent: false },
    { id: "node2", position: [8, 0, 2], isCurrent: false },
    { id: "node3", position: [-3, 0, 8], isCurrent: false },
    { id: "node-current", position: [0, 0, 0], isCurrent: true },
  ];

  useGSAP(() => {
    if (!visible) return;

    const tl = gsap.timeline();

    // Stage C: 网格犹如画卷般展开
    if (gridRef.current) {
      tl.fromTo(gridRef.current.scale,
        { x: 0.01, y: 0.01, z: 0.01 },
        { x: 1, y: 1, z: 1, duration: 0.8, ease: "power2.out" },
        0.2
      );
    }

    // Stage D: 雷达渐现
    if (radarGroupRef.current) {
      tl.fromTo(radarGroupRef.current.scale,
        { x: 0.01, y: 0.01, z: 0.01 },
        { x: 1, y: 1, z: 1, duration: 0.8, ease: "back.out(1.2)" },
        0.6
      );
    }

    // Stage E & F: 光柱拔地而起 (生长动画)
    if (beaconsRef.current) {
      const children = beaconsRef.current.children;
      const normalNodes = children.filter((_, i) => !nodes[i].isCurrent);
      const activeNode = children.find((_, i) => nodes[i].isCurrent);

      // 初始状态压扁在地面
      gsap.set(children.map(c => c.scale), { x: 0.01, y: 0.01, z: 0.01 });

      // 普通节点按次序“生长”出地面，伴随弹性效果
      tl.to(normalNodes.map(c => c.scale),
        { x: 1, y: 1, z: 1, duration: 0.8, stagger: 0.15, ease: "elastic.out(1, 0.75)" },
        1.0 
      );

      // 当前高亮节点最后压轴震撼登场
      if (activeNode) {
        tl.to(activeNode.scale,
          { x: 1, y: 1, z: 1, duration: 1.2, ease: "elastic.out(1, 0.5)" },
          1.6
        );
      }
    }
  }, [visible]);

  return (
    <>
      {/* 物理级视角控制器 */}
      <OrbitControls 
        enableZoom={true} 
        enablePan={false}
        minPolarAngle={Math.PI / 3.5} // 限制最高俯视角度，保留立体感
        maxPolarAngle={Math.PI / 2.1} // 接近地面防穿模
        // 完全开放左右 360 度旋转
        enableDamping
        dampingFactor={0.015} // 极低的阻尼：赋予“溜冰”般的物理滑行惯性
        rotateSpeed={0.4} // 降低旋转速度，增加厚重感和高定感
        autoRotate={true} // 开启静止时缓慢自转的科幻感
        autoRotateSpeed={0.3}
        makeDefault
      />

      {/* 地面网格 */}
      <group ref={gridRef} scale={0}>
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

      {/* 中心扫描雷达 */}
      <group ref={radarGroupRef} scale={0}>
        <Radar />
      </group>

      {/* 分布在地图上的数据锚点 */}
      <group ref={beaconsRef}>
        {nodes.map((node) => (
          <Beacon 
            key={node.id} 
            position={[node.position[0], 0, node.position[2]]} 
            isCurrent={node.isCurrent} 
          />
        ))}
      </group>
    </>
  );
}
