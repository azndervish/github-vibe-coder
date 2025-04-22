// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",  // Scan all JS, TS, JSX, and TSX files in the pages directory
    "./components/**/*.{js,ts,jsx,tsx}" // Scan all files in the components directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}