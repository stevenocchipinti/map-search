import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        school: {
          government: '#3b82f6',
          catholic: '#f97316',
          independent: '#a855f7',
        },
        station: '#0891b2',
        supermarket: '#eab308',
        user: '#ef4444',
      },
    },
  },
  plugins: [],
} satisfies Config;
