/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // --- Font ---
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'xs2': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12px', { lineHeight: '16px' }],
        'base': ['14px', { lineHeight: '20px' }],
        'md':  ['15px', { lineHeight: '22px' }],
        'lg':  ['17px', { lineHeight: '24px' }],
        'xl':  ['18px', { lineHeight: '26px' }],
        '2xl': ['22px', { lineHeight: '30px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
        '4xl': ['32px', { lineHeight: '40px' }],
      },

      // --- Colors (from Figma) ---
      colors: {
        brand: {
          DEFAULT: '#0051ff',
          hover:   '#005bf2',
          300:     '#3380ff',
          400:     '#66aaff',
          200:     '#99ccff',
          100:     '#b3d4ff',
          50:      '#c7dfff',
          bg:      '#eef3ff',
        },
        text: {
          primary:   '#1c1c1e',
          secondary: '#3c3c43',
          tertiary:  '#8e8e93',
          disabled:  '#c7c7cc',
        },
        surface: {
          DEFAULT: '#f5f5f7',
          alt:     '#f0f0f5',
          card:    '#ffffff',
          border:  '#e5e5ea',
        },
        danger: {
          DEFAULT: '#ff3b30',
          light:   '#ff8a80',
          bg:      '#fff0f0',
          bg2:     '#fff5f5',
        },
        warning: {
          DEFAULT: '#c07800',
          bg:      '#fff8ec',
        },
        success: {
          DEFAULT: '#00a651',
        },
      },

      // --- Border Radius ---
      borderRadius: {
        'xs':   '6px',
        'sm':   '8px',
        'md':   '12px',
        'lg':   '14px',
        'xl':   '16px',
        '2xl':  '20px',
        '3xl':  '24px',
        '4xl':  '40px',
        'pill': '9999px',
      },

      // --- Spacing ---
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '7':   '28px',
      },

      // --- Max Width ---
      maxWidth: {
        'mobile': '430px',
      },
    },
  },
  plugins: [],
}
