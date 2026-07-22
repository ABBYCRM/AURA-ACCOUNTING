/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae6ff',
          200: '#bccfff',
          300: '#8eaeff',
          400: '#5b84fc',
          500: '#3a5df5',
          600: '#2541e0',
          700: '#1e33b8',
          800: '#1c2e91',
          900: '#1d2c75',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
