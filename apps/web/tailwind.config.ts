import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // RCT-inspired palette
        'rct-green': '#4a7c59',
        'rct-brown': '#8b7355',
        'rct-sand': '#d4c4a8',
        'rct-water': '#5b8fa8',
        'rct-sky': '#87ceeb',
        'rct-red': '#c44536',
        'rct-yellow': '#f0c808',
        // Lobster theme
        'lobster-red': '#c41e3a',
        'lobster-shell': '#8b0000',
        // Retro UI
        'retro-white': '#f5f5dc',
        'retro-gray': '#c0c0c0',
        'retro-dark': '#2f2f2f',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'retro': ['Chicago', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'retro-inset': 'inset -1px -1px 0 #fff, inset 1px 1px 0 #808080',
        'retro-outset': 'inset 1px 1px 0 #fff, inset -1px -1px 0 #808080',
      },
    },
  },
  plugins: [],
};

export default config;
