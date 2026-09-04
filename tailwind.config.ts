import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        "canvas-raised": "var(--canvas-raised)",
        "canvas-overlay": "var(--canvas-overlay)",
        "glass-bg": "var(--glass-bg)",
        "glass-border": "var(--glass-border)",
        "glass-highlight": "var(--glass-highlight)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "brand-blue": "var(--brand-blue)",
        "brand-blue-dim": "var(--brand-blue-dim)",
        "brand-navy": "var(--brand-navy)",
        "human-amber": "var(--human-amber)",
        "human-amber-glow": "var(--human-amber-glow)",
        "human-amber-subtle": "var(--human-amber-subtle)",
        "success-teal": "var(--success-teal)",
        "danger-crimson": "var(--danger-crimson)",
        "neutral-slate": "var(--neutral-slate)",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "amber-glow": "0 0 16px var(--human-amber-glow), inset 0 1px 0 var(--glass-highlight)",
        "blue-glow": "0 0 16px var(--brand-blue-glow), inset 0 1px 0 var(--glass-highlight)",
        "teal-glow": "0 0 16px var(--success-teal-glow)",
      },
      backdropBlur: {
        glass: "28px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flow-dash": "flowDash 1.5s linear infinite",
      },
      keyframes: {
        flowDash: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
