/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'safe-green': '#10B981',
        'caution-amber': '#F59E0B',
        'danger-red': '#EF4444',
      }
    },
  },
  plugins: [],
}
