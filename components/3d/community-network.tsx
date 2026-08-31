"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line, Sparkles } from "@react-three/drei";

/**
 * Community network — a 3D node graph of the Tessera community:
 * a shared core, the three pilot org hubs, and their member nodes.
 * Edges represent credentials flowing from orgs to contributors, plus a
 * few cross-community links. Fully parametric (no model assets) and laid
 * out with a seeded PRNG so the community looks the same on every visit.
 */

/* Deterministic PRNG (mulberry32) — stable layout across renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Vec3 = [number, number, number];

type MemberDef = {
  pos: Vec3;
  phase: number;
  speed: number;
  scale: number;
};

type EdgeDef = {
  from: Vec3;
  to: Vec3;
  kind: "hub" | "member" | "cross";
};

type NetworkData = {
  hubs: Vec3[];
  members: MemberDef[];
  edges: EdgeDef[];
};

function buildNetwork(seed: number): NetworkData {
  const rng = mulberry32(seed);
  const hubs: Vec3[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.5;
    hubs.push([Math.cos(a) * 1.15, [0.18, -0.12, 0.32][i], Math.sin(a) * 1.15]);
  }

  const members: MemberDef[] = [];
  const memberByHub: Vec3[][] = [[], [], []];
  hubs.forEach((hub, hi) => {
    for (let m = 0; m < 5; m++) {
      const a = rng() * Math.PI * 2;
      const r = 0.4 + rng() * 0.42;
      const pos: Vec3 = [
        hub[0] + Math.cos(a) * r,
        hub[1] + (rng() - 0.5) * 0.75,
        hub[2] + Math.sin(a) * r,
      ];
      members.push({ pos, phase: rng() * Math.PI * 2, speed: 0.6 + rng() * 0.8, scale: 0.075 + rng() * 0.05 });
      memberByHub[hi].push(pos);
    }
  });

  const edges: EdgeDef[] = [];
  hubs.forEach((h) => edges.push({ from: [0, 0, 0], to: h, kind: "hub" }));
  memberByHub.forEach((node, hi) => {
    node.forEach((p) => edges.push({ from: hubs[hi], to: p, kind: "member" }));
  });
  // a few cross-community links (different orgs)
  for (let k = 0; k < 3; k++) {
    const a = Math.floor(rng() * 3);
    let b = Math.floor(rng() * 3);
    if (b === a) b = (b + 1) % 3;
    edges.push({
      from: memberByHub[a][Math.floor(rng() * 5)],
      to: memberByHub[b][Math.floor(rng() * 5)],
      kind: "cross",
    });
  }
  return { hubs, members, edges };
}

function GlowNode({
  position,
  radius,
  color,
  emissive,
  intensity,
  halo,
}: {
  position: Vec3;
  radius: number;
  color: string;
  emissive: string;
  intensity: number;
  halo: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={intensity}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * halo, 20, 20]} />
        <meshBasicMaterial color={emissive} transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function CommunityNetwork({
  spin = true,
  pointerReactive = true,
}: {
  spin?: boolean;
  pointerReactive?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const core = useRef<THREE.Group>(null);
  const memberRefs = useRef<(THREE.Group | null)[]>([]);
  const network = useMemo(() => buildNetwork(7), []);

  useFrame((state, delta) => {
    if (!spin) return;
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.rotation.y += delta * 0.1;
      if (pointerReactive) {
        root.current.rotation.x = THREE.MathUtils.lerp(
          root.current.rotation.x,
          state.pointer.y * 0.14,
          0.04
        );
        root.current.rotation.z = THREE.MathUtils.lerp(
          root.current.rotation.z,
          -state.pointer.x * 0.08,
          0.04
        );
      }
    }
    if (core.current) {
      core.current.scale.setScalar(1 + Math.sin(t * 1.1) * 0.05);
    }
    for (let i = 0; i < network.members.length; i++) {
      const g = memberRefs.current[i];
      const m = network.members[i];
      if (g) g.position.y = m.pos[1] + Math.sin(t * m.speed + m.phase) * 0.05;
    }
  });

  return (
    <group ref={root}>
      {/* community core */}
      <group ref={core}>
        <GlowNode position={[0, 0, 0]} radius={0.17} color="#e6c474" emissive="#e6c474" intensity={1.1} halo={2.4} />
        <pointLight color="#e6c474" intensity={6} distance={5} decay={2} />
      </group>

      {/* org hubs */}
      {network.hubs.map((h, i) => (
        <GlowNode key={i} position={h} radius={0.11} color="#d8b465" emissive="#e6c474" intensity={0.8} halo={2.2} />
      ))}

      {/* member nodes */}
      {network.members.map((m, i) => (
        <group
          key={i}
          ref={(el) => {
            memberRefs.current[i] = el;
          }}
          position={m.pos}
        >
          <GlowNode position={[0, 0, 0]} radius={m.scale} color="#2a2440" emissive="#8b7cff" intensity={0.9} halo={2.6} />
        </group>
      ))}

      {/* credential edges */}
      {network.edges.map((e, i) =>
        e.kind === "hub" ? (
          <Line key={i} points={[e.from, e.to]} color="#e6c474" lineWidth={1.4} transparent opacity={0.55} />
        ) : e.kind === "member" ? (
          <Line key={i} points={[e.from, e.to]} color="#8b7cff" lineWidth={0.9} transparent opacity={0.3} />
        ) : (
          <Line
            key={i}
            points={[e.from, e.to]}
            color="#cfc6ff"
            lineWidth={0.7}
            dashed
            dashSize={0.09}
            gapSize={0.06}
            transparent
            opacity={0.22}
          />
        )
      )}

      <Sparkles count={60} scale={4.4} size={1.3} speed={0.25} color="#cfc6ff" opacity={0.35} />
    </group>
  );
}
