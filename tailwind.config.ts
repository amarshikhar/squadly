import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      // -------------------- SQUADLY DESIGN TOKENS --------------------
      colors: {
        // Backgrounds (deep navy stack)
        bg: {
          0: '#070912', // page background
          1: '#0d1322', // section
          2: '#131a2e', // card
        },
        surface: {
          DEFAULT: '#1a233d',
          raised: '#202a4a',
        },

        // Text (warm-cool off-white system)
        text: {
          0: '#f3f6ff',
          1: '#cdd5e8',
          2: '#8a93ad',
          3: '#5b637b',
        },

        // Neon palette
        neon: {
          cyan: '#00f0ff',
          magenta: '#ff2eaa',
          green: '#7bffa4',
          amber: '#ffb800',
        },

        // Tier palette (squad ranks)
        tier: {
          recruit: '#4a5468',
          soldier: '#a35a26',
          veteran: '#9aa4be',
          legend: '#ffd700',
          commander: '#00f0ff',
        },

        // Game palette (per-game brand accent)
        game: {
          bgmi: '#ff8a00',
          valorant: '#ff4655',
          freefire: '#ffae00',
          dota2: '#a30000',
          cs2: '#f5a623',
        },

        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          bright: 'rgba(0,240,255,0.3)',
          magenta: 'rgba(255,46,170,0.3)',
        },
      },

      fontFamily: {
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Fluid display sizes
        'display-xl': ['clamp(48px,7.5vw,108px)', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
        'display-lg': ['clamp(36px,5vw,72px)',  { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-md': ['clamp(24px,3vw,40px)',  { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },

      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
      },

      boxShadow: {
        'glow-cyan': '0 0 24px rgba(0,240,255,0.45)',
        'glow-magenta': '0 0 24px rgba(255,46,170,0.45)',
        'glow-green': '0 0 24px rgba(123,255,164,0.45)',
        'card': '0 30px 80px rgba(0,0,0,0.4), 0 0 60px rgba(0,240,255,0.08)',
      },

      backgroundImage: {
        'grad-brand': 'linear-gradient(90deg, #00f0ff, #ff2eaa)',
        'grad-brand-soft': 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(255,46,170,0.15))',
        'grid-pattern': `linear-gradient(rgba(0,240,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.04) 1px, transparent 1px)`,
      },

      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse: 'pulse 1.6s ease-in-out infinite',
        'fade-up': 'fade-up 0.4s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
