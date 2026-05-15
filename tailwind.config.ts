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
          DEFAULT: "#16161a",
          elev: "#1d1d22",
          row: "#22222a",
        },
        line: "#33333d",
        text: {
          DEFAULT: "#e8e6df",
          dim: "#9a988e",
          muted: "#6b6a63",
        },
        accent: {
          DEFAULT: "#e6a04c",
          bright: "#f5b966",
        },
        rose: "#ef5a6f",
        len: {
          short: "#3aa7a0",
          med: "#3a78c9",
          long: "#7a4ac9",
          xlong: "#aa3d6a",
        },
        stars: {
          ez: "#7bd44f",
          nm: "#5cb6e6",
          hd: "#e8c43a",
          in: "#e88a3a",
          ex: "#ef5a4f",
          xe: "#a06ad4",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
