import type { Config } from 'tailwindcss';

// Palette: https://colorhunt.co/palette/0915401b2cc17692ffabd2fa
// Navy ink, royal blue actions, periwinkle focus, sky ruling. Red is reserved for "away".
const config: Config = {
  content: ['./components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F9FE',
        sheet: '#FFFFFF',
        ink: {
          DEFAULT: '#091540',
          2: '#3A4570',
          3: '#5F6890'
        },
        royal: {
          DEFAULT: '#1B2CC1',
          hover: '#1523A0'
        },
        peri: '#7692FF',
        sky: {
          DEFAULT: '#ABD2FA',
          wash: '#EAF3FE'
        },
        rule: '#DCE8FA',
        away: {
          DEFAULT: '#C8302A',
          wash: '#FCE9E7'
        },
        marker: {
          DEFAULT: '#FFF1B8',
          ink: '#6B5300'
        }
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', '"Atkinson Hyperlegible"', 'system-ui', 'sans-serif']
      },
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.15rem' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['0.9375rem', { lineHeight: '1.45rem' }],
        lg: ['1.0625rem', { lineHeight: '1.5rem' }],
        xl: ['1.375rem', { lineHeight: '1.8rem' }],
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }],
        tally: ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1', letterSpacing: '-0.02em' }]
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '14px'
      },
      boxShadow: {
        float: '0 12px 32px -8px rgba(9, 21, 64, 0.22), 0 2px 6px rgba(9, 21, 64, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
