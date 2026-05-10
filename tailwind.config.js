/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#E00000",
        "primary-dark": "#8B0000",
        "primary-light": "#FF4444",
        glow: "#FF2222",
        "glow-soft": "#FFAAAA",
        white: "#FFFFFF",
        "off-white": "#F5F0F0",
        bg: "#0A0000",
        "bg-surface": "#1A0000",
        "bg-card": "#2A0A0A",
      },
    },
  },
  plugins: [],
};
