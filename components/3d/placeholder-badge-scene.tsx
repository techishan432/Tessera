"use client";
 
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";

function RotatingBadge({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!mesh.current || reducedMotion) return;
    mesh.current.rotation.y += delta * 0.4;
    mesh.current.rotation.x = THREE.MathUtils.lerp(
      mesh.current.rotation.x,
      state.pointer.y * 0.3,
      0.05
    );
  });

  return (
    <Float
      speed={reducedMotion ? 0 : 1.5}
      rotationIntensity={0.2}
      floatIntensity={0.5}
    >
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#7c3aed" wireframe />
      </mesh>
    </Float>
  );
}

export default function PlaceholderBadgeScene() {
  const reducedMotion = useReducedMotion();
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) return null;

  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.2} />
      <RotatingBadge reducedMotion={!!reducedMotion} />
    </Canvas>
  );
}
