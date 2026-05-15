/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand colors matching the web app (using hex equivalents of the OKLCH values)
        primary: {
          DEFAULT: '#2ABFB5',
          foreground: '#0a0a0a',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Activity status colors
        'status-definite': '#22C55E',
        'status-maybe': '#EAB308',
        'status-interested': '#3B82F6',
      },
    },
  },
  plugins: [],
}
