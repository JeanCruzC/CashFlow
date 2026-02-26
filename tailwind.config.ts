import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#EAF1FB",
          100: "#D6E4F6",
          200: "#B2CBE8",
          300: "#86ABD8",
          400: "#5C8BC8",
          500: "#2F6DB1",
          600: "#245896",
          700: "#1B4679",
          800: "#14365F",
          900: "#0E2544",
        },
        accent: {
          400: "#35A39C",
          500: "#0D7A6D",
          600: "#0A6258",
        },
        surface: {
          0: "#FFFFFF",
          50: "#F7F8FA",
          100: "#EEF1F5",
          200: "#DDE3EB",
          300: "#C7D0DD",
          400: "#8A98AB",
          500: "#667589",
          600: "#4A5A6E",
          700: "#324154",
          800: "#202D3E",
          900: "#111C2A",
          950: "#0A1220",
        },
        positive: {
          400: "#52C585",
          500: "#239A66",
          600: "#1A7A50",
        },
        negative: {
          400: "#EA8A8A",
          500: "#CF4D4D",
          600: "#A93636",
        },
        warning: {
          400: "#EBC66D",
          500: "#CC9B2E",
          600: "#A77C24",
        },
      },
      boxShadow: {
        card: "0 2px 6px rgba(14,37,68,0.06), 0 1px 2px rgba(14,37,68,0.08)",
        "card-hover":
          "0 10px 24px rgba(14,37,68,0.12), 0 4px 8px rgba(14,37,68,0.1)",
        glow: "0 0 18px rgba(47,109,177,0.18)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out both",
        "fade-in-up": "fadeInUp 0.6s ease-out both",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "float": "float 6s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease-in-out infinite alternate",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        gradientShift: {
          "0%": { transform: "translate(-10%, -10%) scale(1)" },
          "100%": { transform: "translate(10%, 10%) scale(1.1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(59,130,246,0.15)" },
          "50%": { boxShadow: "0 0 30px rgba(59,130,246,0.3)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
