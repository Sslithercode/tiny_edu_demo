import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "sans-serif"],
      },
      colors: {
        void: "#0c0c1e",
        ink: {
          900: "#12122a",
          800: "#181838",
          700: "#1e1e44",
          600: "#242452",
          500: "#2a2a60",
        },
        border: {
          dim: "#22223e",
          DEFAULT: "#2e2e54",
          bright: "#3a3a64",
          glow: "#5a3a9e",
        },
        violet: {
          950: "#150d35",
          900: "#1e1040",
          800: "#2e1a5e",
          700: "#4a1d96",
          600: "#6d28d9",
          500: "#7c3aed",
          400: "#8b5cf6",
          300: "#a78bfa",
          200: "#c4b5fd",
          100: "#ede9fe",
        },
        slate: {
          950: "#07070f",
        },
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 8px 0 rgba(124,58,237,0.2)" },
          "50%": { boxShadow: "0 0 20px 2px rgba(124,58,237,0.4)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "fade-up": "fadeUp 0.35s ease-out both",
        "fade-up-1": "fadeUp 0.35s ease-out 0.05s both",
        "fade-up-2": "fadeUp 0.35s ease-out 0.1s both",
        "fade-up-3": "fadeUp 0.35s ease-out 0.15s both",
        shimmer: "shimmer 2.5s linear infinite",
        glow: "glow 2s ease-in-out infinite",
        spin: "spin 1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
