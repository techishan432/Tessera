"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";

export interface WallCredential {
  key: string;
  orgName: string;
  typeLabel: string;
  date: string;
  description: string;
}

const CARD_W = 1.5;
const CARD_H = 2.0;
const GAP_X = 1.85;
const GAP_Y = 2.45;
const PER_ROW = 4;

/** Arc layout: middle cards face the camera, outer cards curve away. */
function layout(index: number, total: number) {
  const row = Math.floor(index / PER_ROW);
  const col = index % PER_ROW;
  const rowTotal = Math.min(PER_ROW, total - row * PER_ROW);
  const x = (col - (rowTotal - 1) / 2) * GAP_X;
  const offset = Math.abs(x) / (GAP_X * ((PER_ROW - 1) / 2 || 1));
  const z = -offset * offset * 1.1;
  const y = -row * GAP_Y;
  const rotY = -x * 0.055;
  return { x, y, z, rotY };
}

function WallCard({
  credential,
  position,
  rotY,
  selected,
  onSelect,
}: {
  credential: WallCredential;
  position: { x: number; y: number; z: number };
  rotY: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const hovered = useRef(false);

  useFrame((state, delta) => {
    if (!group.current || !inner.current) return;
    const lerp = 1 - Math.pow(0.0018, delta);
    const lift = (hovered.current ? 0.28 : 0) + (selected ? 0.12 : 0);
    group.current.position.z = THREE.MathUtils.lerp(
      group.current.position.z,
      position.z + lift,
      lerp
    );
    inner.current.rotation.y = THREE.MathUtils.lerp(
      inner.current.rotation.y,
      rotY + (selected ? Math.PI : 0),
      lerp
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -state.pointer.y * 0.03,
      lerp * 0.5
    );
  });

  const desc = credential.description.length > 90 ? credential.description.slice(0, 87) + "…" : credential.description;

  return (
    <group
      ref={group}
      position={[position.x, position.y, position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = true;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hovered.current = false;
        document.body.style.cursor = "auto";
      }}
    >
      <group ref={inner}>
        <RoundedBox args={[CARD_W, CARD_H, 0.055]} radius={0.045} smoothness={3}>
          <meshStandardMaterial
            color="#12121d"
            metalness={0.55}
            roughness={0.3}
            emissive="#8b7cff"
            emissiveIntensity={0.05}
          />
        </RoundedBox>
        {/* gold top edge */}
        <mesh position={[0, CARD_H / 2 - 0.012, 0.03]}>
          <boxGeometry args={[CARD_W * 0.86, 0.022, 0.01]} />
          <meshStandardMaterial
            color="#e6c474"
            emissive="#e6c474"
            emissiveIntensity={0.8}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* front face */}
        <group position={[0, 0, 0.035]}>
          <Text
            fontSize={0.155}
            maxWidth={CARD_W - 0.24}
            textAlign="center"
            color="#f4f3fa"
            anchorX="center"
            anchorY="middle"
            position={[0, 0.42, 0]}
          >
            {credential.orgName}
          </Text>
          <Text
            fontSize={0.1}
            color="#8b7cff"
            anchorX="center"
            anchorY="middle"
            position={[0, 0.08, 0]}
            letterSpacing={0.12}
          >
            {credential.typeLabel.toUpperCase()}
          </Text>
          <mesh position={[0, -0.06, 0]}>
            <planeGeometry args={[CARD_W * 0.5, 0.004]} />
            <meshBasicMaterial color="#23232f" />
          </mesh>
          <Text
            fontSize={0.085}
            color="#9b98ac"
            anchorX="center"
            anchorY="middle"
            position={[0, -0.2, 0]}
          >
            {credential.date}
          </Text>
          <Text
            fontSize={0.07}
            color="#e6c474"
            anchorX="center"
            anchorY="middle"
            position={[0, -CARD_H / 2 + 0.16, 0]}
          >
            SOULBOUND · TESSERA
          </Text>
        </group>

        {/* back face (revealed on flip) */}
        <group position={[0, 0, -0.035]} rotation={[0, Math.PI, 0]}>
          <Text
            fontSize={0.088}
            maxWidth={CARD_W - 0.26}
            textAlign="center"
            color="#c9c6d8"
            anchorX="center"
            anchorY="middle"
            position={[0, 0.35, 0]}
          >
            {desc}
          </Text>
          <Text
            fontSize={0.075}
            color="#8b7cff"
            anchorX="center"
            anchorY="middle"
            position={[0, -0.35, 0]}
          >
            {credential.orgName}
          </Text>
          <Text
            fontSize={0.065}
            color="#9b98ac"
            anchorX="center"
            anchorY="middle"
            position={[0, -CARD_H / 2 + 0.16, 0]}
          >
            VERIFY ON TESSERA
          </Text>
        </group>
      </group>
    </group>
  );
}

export default function CredentialWallScene({
  credentials,
  selected,
  onSelect,
}: {
  credentials: WallCredential[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const items = useMemo(
    () => credentials.map((c, i) => ({ credential: c, pos: layout(i, credentials.length) })),
    [credentials]
  );

  // recentre the wall vertically for small rows
  const rows = Math.ceil(credentials.length / PER_ROW);
  const offsetY = ((rows - 1) * GAP_Y) / 2 - 0.4;

  return (
    <Canvas
      camera={{ position: [0, 0, 6.4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D wall of credentials"
      role="img"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 6]} intensity={1.5} color="#cfc6ff" />
      <directionalLight position={[-5, -3, 3]} intensity={0.7} color="#e6c474" />
      <group position={[0, offsetY, 0]}>
        {items.map(({ credential, pos }, i) => (
          <WallCard
            key={credential.key}
            credential={credential}
            position={pos}
            rotY={pos.rotY}
            selected={selected === i}
            onSelect={() => onSelect(i)}
          />
        ))}
      </group>
    </Canvas>
  );
}
