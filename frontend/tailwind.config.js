/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          500: '#2f6fed',
          600: '#1f5bd6',
          700: '#1848ab',
        },
      },
      keyframes: {
        'flash-in': {
          '0%': { backgroundColor: 'rgb(220 252 231)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'flash-in': 'flash-in 1.8s ease-out',
      },
    },
  },
  plugins: [],
}
