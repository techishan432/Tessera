"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { gsap } from "../animations/gsap";
import { CommunityNetwork } from "./community-network";

/**
 * Landing-page hero scene: the Tessera community network (core + org hubs +
 * member nodes). GSAP ScrollTrigger drives the scene as the user scrolls
 * past the hero: it scales down, sinks, and the camera pulls back, handing
 * the screen to the copy below. Positioned right-of-center — the hero copy
 * owns the left side.
 *
 * With prefers-reduced-motion the scene renders static (no spin, no scroll
 * transforms, no pointer parallax).
 */
function HeroRig({ reducedMotion }: { reducedMotion: boolean }) {
  const scene = useRef<THREE.Group>(null);
  const scroll = useRef({ progress: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const trigger = gsap.to(scroll.current, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.getElementById("hero"),
        start: "top top",
        end: "bottom 40%",
        scrub: 0.6,
      },
    });
    return () => {
      trigger.scrollTrigger?.kill();
      trigger.kill();
    };
  }, [reducedMotion]);

  useFrame((state, delta) => {
    if (!scene.current) return;
    if (reducedMotion) return;
    const p = scroll.current.progress;
    const targetScale = 1 - p * 0.3;
    const targetY = -p * 1.6;
    scene.current.scale.setScalar(
      THREE.MathUtils.lerp(scene.current.scale.x, targetScale, 1 - Math.pow(0.001, delta))
    );
    scene.current.position.y = THREE.MathUtils.lerp(scene.current.position.y, targetY, 0.1);
    // camera pull-back on scroll
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      4.4 + p * 1.6,
      0.08
    );
  });

  return (
    <group ref={scene} position={[1.05, 0.1, 0]} scale={1.05}>
      <CommunityNetwork spin={!reducedMotion} pointerReactive={!reducedMotion} />
    </group>
  );
}

export default function HeroScene() {
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
    <Canvas
      camera={{ position: [0, 0, 4.4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#cfc6ff" />
      <directionalLight position={[-4, -2, 2]} intensity={0.8} color="#e6c474" />
      <HeroRig reducedMotion={!!reducedMotion} />
    </Canvas>
  );
}
