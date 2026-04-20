/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saudi: {
          emerald: '#10b981',
          teal: '#0d9488',
          cyan: '#0891b2',
        }
      },
    },
  },
  plugins: [],
}