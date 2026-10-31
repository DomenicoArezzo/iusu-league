import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#070707", 900: "#0c0c0c", 800: "#141414", 700: "#1c1c1c", 600: "#262626", 500: "#3a3a3a" },
        pitch: { DEFAULT: "#22e55e", dark: "#16a34a", glow: "#7dffa5" },
        gold: { DEFAULT: "#f5c542", dark: "#b8860b" },
      },
      boxShadow: { glow: "0 0 24px rgba(34,229,94,0.25)" },
    },
  },
  plugins: [],
};
export default config;
