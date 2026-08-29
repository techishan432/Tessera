"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { gsap } from "../animations/gsap";
import { TesseraBadge } from "./tessera-badge";

/**
 * Landing-page hero scene. GSAP ScrollTrigger drives the badge/camera as the
 * user scrolls past the hero: the tessera scales down, sinks, and the camera
 * pulls back, handing the screen to the copy below.
 *
 * With prefers-reduced-motion the scene renders static (no spin, no scroll
 * transforms).
 */
function HeroRig({ reducedMotion }: { reducedMotion: boolean }) {
  const badge = useRef<THREE.Group>(null);
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
    if (!badge.current) return;
    if (reducedMotion) return;
    const p = scroll.current.progress;
    const targetScale = 1 - p * 0.3;
    const targetY = -p * 1.6;
    badge.current.scale.setScalar(
      THREE.MathUtils.lerp(badge.current.scale.x, targetScale, 1 - Math.pow(0.001, delta))
    );
    badge.current.position.y = THREE.MathUtils.lerp(badge.current.position.y, targetY, 0.1);
    // camera pull-back on scroll
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      4 + p * 1.6,
      0.08
    );
  });

  return (
    <group ref={badge} position={[0, 0.2, 0]}>
      <TesseraBadge spin={!reducedMotion} pointerReactive={!reducedMotion} />
    </group>
  );
}

export default function HeroScene() {
  const reducedMotion = useReducedMotion();
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#cfc6ff" />
      <directionalLight position={[-4, -2, 2]} intensity={0.8} color="#e6c474" />
      <HeroRig reducedMotion={!!reducedMotion} />
    </Canvas>
  );
}
