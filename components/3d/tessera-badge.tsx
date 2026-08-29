"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";

/**
 * The Tessera — a procedural 3D credential badge: a hexagonal mosaic tile
 * with a gold inner seal and a slowly orbiting ring. No external model
 * assets; everything is parametric so it stays crisp at any size.
 */
export function TesseraBadge({
  spin = true,
  pointerReactive = true,
}: {
  spin?: boolean;
  pointerReactive?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (spin) group.current.rotation.y += delta * 0.25;
    if (pointerReactive && spin) {
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        state.pointer.y * 0.25,
        0.04
      );
      group.current.rotation.z = THREE.MathUtils.lerp(
        group.current.rotation.z,
        -state.pointer.x * 0.12,
        0.04
      );
    }
    if (ring.current) ring.current.rotation.z += delta * 0.6;
    if (inner.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
      inner.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.6}>
        {/* hexagonal tile (the tessera) */}
        <mesh>
          <cylinderGeometry args={[1.05, 1.05, 0.12, 6]} />
          <meshStandardMaterial
            color="#191927"
            metalness={0.75}
            roughness={0.25}
            emissive="#8b7cff"
            emissiveIntensity={0.08}
          />
        </mesh>
        {/* beveled edge glow */}
        <mesh position={[0, -0.075, 0]}>
          <cylinderGeometry args={[1.08, 1.08, 0.03, 6]} />
          <meshStandardMaterial
            color="#8b7cff"
            emissive="#8b7cff"
            emissiveIntensity={0.7}
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
        {/* gold inner seal */}
        <mesh ref={inner} position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.05, 6]} />
          <meshStandardMaterial
            color="#e6c474"
            metalness={0.9}
            roughness={0.18}
            emissive="#e6c474"
            emissiveIntensity={0.25}
          />
        </mesh>
        {/* orbiting ring */}
        <mesh ref={ring} rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[1.5, 0.015, 16, 96]} />
          <meshStandardMaterial
            color="#8b7cff"
            emissive="#8b7cff"
            emissiveIntensity={1.4}
            transparent
            opacity={0.65}
          />
        </mesh>
        <Sparkles
          count={40}
          scale={3.4}
          size={1.6}
          speed={0.35}
          color="#cfc6ff"
          opacity={0.5}
        />
      </Float>
    </group>
  );
}
