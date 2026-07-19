import type { CSSProperties } from "react";

const SWATCH_COLORS: Record<string, string> = {
  multicam: "linear-gradient(135deg, #7a6a4f 0%, #4a5a3a 45%, #8b7355 100%)",
  coyote: "#8b6914",
  olive: "#556b2f",
  black: "#1a1a1a",
  "ranger green": "#3d4a3a",
  woodland: "linear-gradient(135deg, #4a5a3a 0%, #2f4f2f 50%, #6b5b3a 100%)",
  khaki: "#bdb76b",
  tan: "#d2b48c",
  grey: "#808080",
  gray: "#808080",
  white: "#f5f5f5",
  red: "#b91c1c",
  blue: "#1d4ed8",
};

export function getSwatchStyle(label: string): CSSProperties {
  const key = label.trim().toLowerCase();
  for (const [keyword, background] of Object.entries(SWATCH_COLORS)) {
    if (key.includes(keyword)) {
      return { background };
    }
  }
  return {
    background: `linear-gradient(135deg, hsl(${hashHue(label)} 35% 45%), hsl(${hashHue(label)} 25% 30%))`,
  };
}

function hashHue(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = input.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
