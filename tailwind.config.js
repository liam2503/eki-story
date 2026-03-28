/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./www/**/*.{html,js}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quantico', 'sans-serif']
      }
    }
  },
  plugins: [],
}

