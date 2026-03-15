import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f766e",
          foreground: "#f0fdfa",
          muted: "#ccfbf1"
        },
        shop: "#0f766e",
        flexy: "#2563eb",
        danger: "#b91c1c",
        warning: "#b45309"
      },
      boxShadow: {
        soft: "0 24px 60px -24px rgba(15, 23, 42, 0.25)"
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(15,118,110,0.08) 1px, transparent 0)"
      },
      fontFamily: {
        sans: ["Tahoma", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
