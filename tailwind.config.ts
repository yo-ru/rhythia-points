import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0a",
          elev: "#111214",
          row: "#1d1e20",
        },
        line: "#262626",
        text: {
          DEFAULT: "#ffffff",
          dim: "#d4d4d4",
          muted: "#9ca3af",
        },
        accent: {
          DEFAULT: "#60a5fa",
          bright: "#93c5fd",
        },
        brand: {
          blue: "#3179d6",
          discord: "#5562ea",
          purple: "#6220EC",
        },
        rose: "#dc2626",
        len: {
          short: "#4ade80",
          med: "#a3e635",
          long: "#fbbf24",
          xlong: "#fb923c",
        },
        stars: {
          ez: "#4ade80",
          nm: "#a3e635",
          hd: "#fbbf24",
          in: "#fb923c",
          ex: "#f87171",
          xe: "#c084fc",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
