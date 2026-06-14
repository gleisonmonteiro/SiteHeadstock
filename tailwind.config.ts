import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        turquesa: "#00B8C6",
        lime: "#C8F34D",
        "fundo-escuro": "#0A1F1F",
        "card-escuro": "#0F2A2A",
        "borda-escura": "#1F3A3A",
        "accent-dark": "#5EEAD4",
        "texto-sec": "#94A3B8",
        "texto-claro": "#F9FAFB",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
export default config;
