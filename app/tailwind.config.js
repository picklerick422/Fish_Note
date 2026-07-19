/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ---- shadcn semantic tokens (mapped to design vars) ---- */
        border: "var(--border)",
        input: "var(--border-strong)",
        ring: "var(--brand-500)",
        background: "var(--bg-base)",
        foreground: "var(--ink-900)",
        primary: {
          DEFAULT: "var(--brand-500)",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "var(--bg-subtle)",
          foreground: "var(--ink-900)",
        },
        destructive: {
          DEFAULT: "var(--red)",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "var(--bg-subtle)",
          foreground: "var(--ink-500)",
        },
        accent: {
          DEFAULT: "var(--brand-50)",
          foreground: "var(--brand-700)",
        },
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--ink-900)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--ink-900)",
        },
        /* ---- FishNote 雾蓝 design tokens ---- */
        base: "var(--bg-base)",
        subtle: "var(--bg-subtle)",
        surface: "var(--surface)",
        line: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        ink: {
          900: "var(--ink-900)",
          700: "var(--ink-700)",
          500: "var(--ink-500)",
          400: "var(--ink-400)",
          300: "var(--ink-300)",
        },
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
        },
        ai: {
          50: "var(--ai-50)",
          100: "var(--ai-100)",
          400: "var(--ai-400)",
          500: "var(--ai-500)",
          600: "var(--ai-600)",
        },
        heat: {
          0: "var(--heat-0)",
          1: "var(--heat-1)",
          2: "var(--heat-2)",
          3: "var(--heat-3)",
          4: "var(--heat-4)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          soft: "var(--amber-soft)",
        },
        red: {
          DEFAULT: "var(--red)",
          soft: "var(--red-soft)",
        },
        blue: {
          DEFAULT: "var(--blue)",
          soft: "var(--blue-soft)",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        /* design.md §5 radii */
        "r-sm": "8px",
        "r-md": "12px",
        "r-lg": "16px",
        "r-xl": "20px",
        "r-pill": "999px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        hover: "var(--shadow-hover)",
        pop: "var(--shadow-pop)",
        ai: "var(--shadow-ai)",
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        display: ['Sora', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      transitionTimingFunction: {
        "out-emphasized": "cubic-bezier(.16,1,.3,1)",
        standard: "cubic-bezier(.4,0,.2,1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "ai-shine": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "float-breathe": {
          "0%,100%": { transform: "translateY(-4px)" },
          "50%": { transform: "translateY(4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "ai-shine": "ai-shine 1.2s linear infinite",
        "float-breathe": "float-breathe 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
