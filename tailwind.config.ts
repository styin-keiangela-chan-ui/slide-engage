import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: "#2D8A4E",
          light: "#EAF7EF",
          dark: "#1A5C32",
        },
        navy: "#1A1A2E",
        blue: {
          DEFAULT: "#1A6BB5",
          light: "#E6F1FB",
        },
        orange: {
          DEFAULT: "#D46B08",
          light: "#FFF3E6",
        },
        pink: {
          DEFAULT: "#8B1A4A",
          light: "#FFF0F6",
        },
        off: "#F4F7F4",
        border: "#E2EBE6",
        gray: {
          DEFAULT: "#6B7B8D",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "14px",
      },
      boxShadow: {
        DEFAULT: "0 4px 24px rgba(0,0,0,.08)",
      },
    },
  },
  plugins: [],
};
export default config;
