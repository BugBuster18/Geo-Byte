/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'rubik': ['Rubik-Regular'],
        'rubik-medium': ['Rubik-Medium'],
        'rubik-bold': ['Rubik-Bold'],
      },
      colors: {
        'black-100': '#666666',
        'black-200': '#444444',
        'black-300': '#222222',
      }
    },
  },
  plugins: [],
}