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
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        brand: {
          subtle: "var(--color-brand-subtle)",
          muted: "var(--color-brand-muted)",
          DEFAULT: "var(--color-brand-default)",
          emphasis: "var(--color-brand-emphasis)",
          strong: "var(--color-brand-strong)",
        },
        positive: {
          subtle: "var(--color-positive-subtle)",
          muted: "var(--color-positive-muted)",
          DEFAULT: "var(--color-positive-default)",
          emphasis: "var(--color-positive-emphasis)",
          strong: "var(--color-positive-strong)",
        },
        negative: {
          subtle: "var(--color-negative-subtle)",
          muted: "var(--color-negative-muted)",
          DEFAULT: "var(--color-negative-default)",
          emphasis: "var(--color-negative-emphasis)",
          strong: "var(--color-negative-strong)",
        },
        attention: {
          subtle: "var(--color-attention-subtle)",
          muted: "var(--color-attention-muted)",
          DEFAULT: "var(--color-attention-default)",
          emphasis: "var(--color-attention-emphasis)",
          strong: "var(--color-attention-strong)",
        },
        neutral: {
          subtle: "var(--color-neutral-subtle)",
          muted: "var(--color-neutral-muted)",
          DEFAULT: "var(--color-neutral-default)",
          emphasis: "var(--color-neutral-emphasis)",
          strong: "var(--color-neutral-strong)",
        },
        // Compatibility bindings
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
        "raised-low": "var(--shadow-raised-low)",
        "raised-mid": "var(--shadow-raised-mid)",
        "raised-high": "var(--shadow-raised-high)",
        // Strict boundary: amber-glow reserved exclusively for the 3 HITL states
        "amber-glow": "0 0 16px var(--human-amber-glow)",
      },
      backdropBlur: {
        glass: "28px",
      },
      borderRadius: {
        "2xs": "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        full: "9999px",
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
