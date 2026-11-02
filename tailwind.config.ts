import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#070707", 900: "#0c0c0c", 800: "#141414", 700: "#1c1c1c", 600: "#262626", 500: "#3a3a3a" },
        pitch: { DEFAULT: "#22e55e", dark: "#16a34a", glow: "#7dffa5" },
        gold: { DEFAULT: "#f5c542", dark: "#b8860b" },
        // Bordo dei controlli (campi, selettori): almeno 3:1 sullo sfondo scuro (WCAG 1.4.11).
        control: "#6e6e6e",
        // Grigi del testo secondario ritoccati: tutti >= 5,3:1 sugli sfondi ink-* (WCAG AA richiede 4,5:1).
        // Prima neutral-500/600 arrivavano a 2,2:1.
        neutral: { 400: "#b8b8b8", 500: "#a0a0a0", 600: "#8f8f8f" },
      },
      boxShadow: { glow: "0 0 24px rgba(34,229,94,0.25)" },
      minHeight: { tap: "2.75rem" },
      minWidth: { tap: "2.75rem" },
    },
  },
  plugins: [],
};
export default config;
