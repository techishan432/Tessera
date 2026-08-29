import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Single registration point for GSAP + ScrollTrigger.
// Import this module (never bare "gsap") from client components so the
// plugin is registered exactly once app-wide.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
