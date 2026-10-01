/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d8',
          300: '#f4a9b8',
          400: '#ec7792',
          500: '#df4c6f',
          600: '#c92f57',
          700: '#a82248',
          800: '#8d2041',
          900: '#781e3c',
        },
      },
    },
  },
  plugins: [],
};
