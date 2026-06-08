/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#32D4A0",
          light: "#6BE8C4",
          dark: "#0FA87A",
          bg: "#E8FAF4",
        },
        dark: {
          DEFAULT: "#1C1E1F",
          secondary: "#2C2E30",
          tertiary: "#3A3C3E",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F8F8F8",
          border: "#F0F0F0",
        },
        danger: "#FF453A",
        warning: "#FF9F0A",
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
    },
  },
  plugins: [],
};
