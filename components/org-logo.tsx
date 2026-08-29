import Image from "next/image";

/** Org name -> logo in /public/assets. Logos without alpha sit on a white tile. */
export const ORG_LOGOS: Record<string, string> = {
  "FIEM ACM": "/assets/fiem-acm.jpeg",
  "GDG Groups": "/assets/gdg.png",
  HackSpire: "/assets/hackspire.webp",
};

export function orgLogo(name: string): string | null {
  return ORG_LOGOS[name] ?? null;
}

/**
 * Org logo with an initial-letter fallback for orgs without an asset.
 * Fixed square container, logo contained inside.
 */
export function OrgLogo({
  name,
  size = 40,
  rounded = "rounded-2xl",
  className = "",
}: {
  name: string;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const src = orgLogo(name);
  const box = { width: size, height: size };

  if (!src) {
    return (
      <span
        style={box}
        className={
          "inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-primary/60 to-gold/50 text-xs font-semibold " +
          rounded +
          " " +
          className
        }
      >
        {name[0]}
      </span>
    );
  }

  return (
    <span
      style={box}
      className={
        "relative inline-block shrink-0 overflow-hidden bg-white " +
        rounded +
        " " +
        className
      }
    >
      <Image
        src={src}
        alt={`${name} logo`}
        fill
        sizes={`${size}px`}
        className="object-contain"
      />
    </span>
  );
}
