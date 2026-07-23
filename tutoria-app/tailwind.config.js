/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        imss: {
          green: {
            dark: '#08483c',
            medium: '#488a76',
          },
          burgundy: '#611232',
          gold: '#bd965c',
          gray: '#404041',
          bg: '#f3f3f5',
        }
      }
    },
  },
  plugins: [],
}

