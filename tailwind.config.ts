import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04040A",
          900: "#08080F",
          800: "#10101A",
          700: "#191927",
          600: "#242438",
          500: "#33334A",
        },
        // Primary — "Klutch mint": electric athletic performance green.
        mint: {
          DEFAULT: "#3DFFC1",
          200: "#B8FFE5",
          300: "#7BFFDA",
          400: "#5EFFC9",
          500: "#3DFFC1",
          600: "#00E89B",
          700: "#00B67A",
        },
        // Secondary — "Klutch magenta": for AP + hot pop accents.
        magenta: {
          DEFAULT: "#FF3D9E",
          300: "#FF8FC1",
          400: "#FF66AF",
          500: "#FF3D9E",
          600: "#E01F82",
          700: "#B01566",
        },
        // Neutral warm — "Cream": for premium off-white touches.
        cream: {
          DEFAULT: "#F5F1E8",
          soft: "#EFEBDD",
        },
      },
      fontFamily: {
        sans: [
          "InterVar",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "InterVar",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      // Radius scale is deliberately tight. Panels and inputs are 6px, the
      // one pill in the app (the score badge) opts in explicitly.
      borderRadius: {
        DEFAULT: "4px",
        md: "5px",
        lg: "6px",
        xl: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
