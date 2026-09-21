import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0E13",
        surface: "#131A22",
        surface2: "#1A2129",
        silver: "#C7CDD6",
        "silver-dim": "#8B939D",
        blue: "#3E6FF2",
        "blue-dim": "#2A4DB8",
        amber: "#F2A93E",
        teal: "#0F3D3E",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 60px -15px rgba(242, 169, 62, 0.35)",
        "glow-blue": "0 0 80px -20px rgba(62, 111, 242, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
