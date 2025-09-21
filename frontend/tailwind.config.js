/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',    // Large phones
      'sm': '640px',    // Small tablets
      'md': '768px',    // Medium tablets  
      'lg': '1024px',   // Desktop
      'xl': '1280px',   // Large desktop
      '2xl': '1440px',  // Extra large desktop
      '3xl': '1920px',  // Ultra wide desktop
    },
    extend: {
      colors: {
        // Primary Brand Colors (Professional Blue)
        primary: {
          25: '#f8fcff',   // ultra light background
          50: '#f0f9ff',   // lightest background
          100: '#e0f2fe',  // light background
          200: '#bae6fd',  // border light
          300: '#7dd3fc',  // disabled
          400: '#38bdf8',  // placeholder
          500: '#0ea5e9',  // default primary
          600: '#0284c7',  // primary action
          700: '#0369a1',  // primary hover
          800: '#075985',  // primary pressed
          900: '#0c4a6e',  // primary darkest
        },
        // Secondary/Neutral Colors (Warm Gray)
        secondary: {
          25: '#fdfdfc',   // ultra light neutral
          50: '#fafaf9',   // lightest neutral
          100: '#f5f5f4',  // light neutral
          200: '#e7e5e4',  // border neutral
          300: '#d6d3d1',  // disabled neutral
          400: '#a8a29e',  // placeholder neutral
          500: '#78716c',  // default neutral
          600: '#57534e',  // neutral action
          700: '#44403c',  // neutral hover
          800: '#292524',  // neutral pressed
          900: '#1c1917',  // neutral darkest
        },
        // Success Colors (Modern Green)
        success: {
          25: '#f7fef8',   // ultra light success
          50: '#f0fdf4',   // success background light
          100: '#dcfce7',  // success background
          200: '#bbf7d0',  // success border light
          300: '#86efac',  // success disabled
          400: '#4ade80',  // success placeholder
          500: '#22c55e',  // success default
          600: '#16a34a',  // success action
          700: '#15803d',  // success hover
          800: '#166534',  // success pressed
          900: '#14532d',  // success darkest
        },
        // Warning Colors (Professional Amber)
        warning: {
          25: '#fffdf7',   // ultra light warning
          50: '#fffbeb',   // warning background light
          100: '#fef3c7',  // warning background
          200: '#fde68a',  // warning border light
          300: '#fcd34d',  // warning disabled
          400: '#fbbf24',  // warning placeholder
          500: '#f59e0b',  // warning default
          600: '#d97706',  // warning action
          700: '#b45309',  // warning hover
          800: '#92400e',  // warning pressed
          900: '#78350f',  // warning darkest
        },
        // Error/Danger Colors (Professional Red)
        error: {
          25: '#fffbfb',   // ultra light error
          50: '#fef2f2',   // error background light
          100: '#fee2e2',  // error background
          200: '#fecaca',  // error border light
          300: '#fca5a5',  // error disabled
          400: '#f87171',  // error placeholder
          500: '#ef4444',  // error default
          600: '#dc2626',  // error action
          700: '#b91c1c',  // error hover
          800: '#991b1b',  // error pressed
          900: '#7f1d1d',  // error darkest
        },
        // Info Colors (Professional Indigo)
        info: {
          25: '#fafaff',   // ultra light info
          50: '#eef2ff',   // info background light
          100: '#e0e7ff',  // info background
          200: '#c7d2fe',  // info border light
          300: '#a5b4fc',  // info disabled
          400: '#818cf8',  // info placeholder
          500: '#6366f1',  // info default
          600: '#4f46e5',  // info action
          700: '#4338ca',  // info hover
          800: '#3730a3',  // info pressed
          900: '#312e81',  // info darkest
        },
      },
      fontFamily: {
        'sans': ['Inter', 'Heebo', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'hebrew': ['Heebo', 'Assistant', 'system-ui', 'sans-serif'],
        'inter': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'heebo': ['Heebo', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Cascadia Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      animation: {
        // Fade animations
        'fade-in': 'fadeIn 200ms cubic-bezier(0, 0, 0.2, 1)',
        'fade-out': 'fadeOut 150ms cubic-bezier(0.4, 0, 1, 1)',
        'fade-in-up': 'fadeInUp 300ms cubic-bezier(0, 0, 0.2, 1)',
        'fade-in-down': 'fadeInDown 300ms cubic-bezier(0, 0, 0.2, 1)',
        
        // Slide animations
        'slide-up': 'slideUp 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-down': 'slideDown 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-left': 'slideLeft 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-right': 'slideRight 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-in-up': 'slideInUp 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-in-down': 'slideInDown 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-in-left': 'slideInLeft 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0, 0, 0.2, 1)',
        
        // Scale animations
        'scale-in': 'scaleIn 150ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'scale-out': 'scaleOut 150ms cubic-bezier(0.4, 0, 1, 1)',
        'scale-in-center': 'scaleInCenter 200ms cubic-bezier(0, 0, 0.2, 1)',
        
        // Bounce animations
        'bounce-in': 'bounceIn 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-subtle': 'bounceSubtle 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        
        // Loading animations
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-fast': 'shimmer 1.5s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
        
        // Interactive animations
        'wiggle': 'wiggle 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'shake': 'shake 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'rubber-band': 'rubberBand 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        
        // Attention seeking
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        
        // Rotation animations
        'rotate-in': 'rotateIn 200ms cubic-bezier(0, 0, 0.2, 1)',
        'rotate-out': 'rotateOut 150ms cubic-bezier(0.4, 0, 1, 1)',
        
        // Flip animations
        'flip-horizontal': 'flipHorizontal 400ms cubic-bezier(0.455, 0.03, 0.515, 0.955)',
        'flip-vertical': 'flipVertical 400ms cubic-bezier(0.455, 0.03, 0.515, 0.955)',
      },
      keyframes: {
        // Fade keyframes
        fadeIn: {
          '0%': { opacity: '0', transform: 'translate3d(0, 0, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' }
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
          '100%': { opacity: '0', transform: 'translate3d(0, 0, 0)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translate3d(0, 16px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' }
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translate3d(0, -16px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' }
        },
        
        // Slide keyframes
        slideUp: {
          '0%': { transform: 'translate3d(0, 10px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translate3d(0, -10px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' }
        },
        slideLeft: {
          '0%': { transform: 'translate3d(10px, 0, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' }
        },
        slideRight: {
          '0%': { transform: 'translate3d(-10px, 0, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' }
        },
        slideInUp: {
          '0%': { transform: 'translate3d(0, 100%, 0)', visibility: 'visible' },
          '100%': { transform: 'translate3d(0, 0, 0)' }
        },
        slideInDown: {
          '0%': { transform: 'translate3d(0, -100%, 0)', visibility: 'visible' },
          '100%': { transform: 'translate3d(0, 0, 0)' }
        },
        slideInLeft: {
          '0%': { transform: 'translate3d(-100%, 0, 0)', visibility: 'visible' },
          '100%': { transform: 'translate3d(0, 0, 0)' }
        },
        slideInRight: {
          '0%': { transform: 'translate3d(100%, 0, 0)', visibility: 'visible' },
          '100%': { transform: 'translate3d(0, 0, 0)' }
        },
        
        // Scale keyframes
        scaleIn: {
          '0%': { transform: 'scale3d(0.8, 0.8, 1)', opacity: '0' },
          '100%': { transform: 'scale3d(1, 1, 1)', opacity: '1' }
        },
        scaleOut: {
          '0%': { transform: 'scale3d(1, 1, 1)', opacity: '1' },
          '100%': { transform: 'scale3d(0.8, 0.8, 1)', opacity: '0' }
        },
        scaleInCenter: {
          '0%': { transform: 'scale3d(0, 0, 1)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'scale3d(1, 1, 1)', opacity: '1' }
        },
        
        // Bounce keyframes
        bounceIn: {
          '0%': { transform: 'scale3d(0.3, 0.3, 1)', opacity: '0' },
          '20%': { transform: 'scale3d(1.1, 1.1, 1)' },
          '40%': { transform: 'scale3d(0.9, 0.9, 1)' },
          '60%': { transform: 'scale3d(1.03, 1.03, 1)', opacity: '1' },
          '80%': { transform: 'scale3d(0.97, 0.97, 1)' },
          '100%': { transform: 'scale3d(1, 1, 1)', opacity: '1' }
        },
        bounceSubtle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '40%': { transform: 'translate3d(0, -2px, 0)' },
          '60%': { transform: 'translate3d(0, -1px, 0)' }
        },
        
        // Loading keyframes
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        
        // Interactive keyframes
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        shake: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translate3d(-2px, 0, 0)' },
          '20%, 40%, 60%, 80%': { transform: 'translate3d(2px, 0, 0)' }
        },
        rubberBand: {
          '0%': { transform: 'scale3d(1, 1, 1)' },
          '30%': { transform: 'scale3d(1.25, 0.75, 1)' },
          '40%': { transform: 'scale3d(0.75, 1.25, 1)' },
          '50%': { transform: 'scale3d(1.15, 0.85, 1)' },
          '65%': { transform: 'scale3d(0.95, 1.05, 1)' },
          '75%': { transform: 'scale3d(1.05, 0.95, 1)' },
          '100%': { transform: 'scale3d(1, 1, 1)' }
        },
        
        // Attention seeking keyframes
        pulseRing: {
          '0%': { transform: 'scale(0.33)', opacity: '1' },
          '80%, 100%': { transform: 'scale(2.33)', opacity: '0' }
        },
        heartbeat: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '14%': { transform: 'scale(1.1)', opacity: '0.7' },
          '28%': { transform: 'scale(1)', opacity: '1' },
          '42%': { transform: 'scale(1.1)', opacity: '0.7' },
          '70%': { transform: 'scale(1)', opacity: '1' }
        },
        
        // Rotation keyframes
        rotateIn: {
          '0%': { transform: 'rotate(-200deg)', opacity: '0' },
          '100%': { transform: 'rotate(0)', opacity: '1' }
        },
        rotateOut: {
          '0%': { transform: 'rotate(0)', opacity: '1' },
          '100%': { transform: 'rotate(200deg)', opacity: '0' }
        },
        
        // Flip keyframes
        flipHorizontal: {
          '0%': { transform: 'perspective(400px) rotate3d(0, 1, 0, -360deg)' },
          '40%': { transform: 'perspective(400px) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -190deg)' },
          '50%': { transform: 'perspective(400px) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -170deg)' },
          '80%': { transform: 'perspective(400px) scale3d(0.95, 0.95, 0.95)' },
          '100%': { transform: 'perspective(400px)' }
        },
        flipVertical: {
          '0%': { transform: 'perspective(400px) rotate3d(1, 0, 0, -360deg)' },
          '40%': { transform: 'perspective(400px) translate3d(0, 0, 150px) rotate3d(1, 0, 0, -190deg)' },
          '50%': { transform: 'perspective(400px) translate3d(0, 0, 150px) rotate3d(1, 0, 0, -170deg)' },
          '80%': { transform: 'perspective(400px) scale3d(0.95, 0.95, 0.95)' },
          '100%': { transform: 'perspective(400px)' }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'desktop': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'desktop-hover': '0 20px 50px -12px rgba(0, 0, 0, 0.25)',
        'elevation-1': '0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'elevation-2': '0 4px 8px 0 rgba(0, 0, 0, 0.08), 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'elevation-3': '0 8px 16px 0 rgba(0, 0, 0, 0.1), 0 4px 8px 0 rgba(0, 0, 0, 0.08)',
        'elevation-4': '0 16px 32px 0 rgba(0, 0, 0, 0.12), 0 8px 16px 0 rgba(0, 0, 0, 0.1)',
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)',
        'inner-glow': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      transitionDuration: {
        '50': '50ms',
        '250': '250ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'snappy': 'cubic-bezier(0.4, 0, 0.6, 1)',
        'gentle': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
        '98': '0.98',
        '97': '0.97',
        '96': '0.96',
      },
      willChange: {
        'transform': 'transform',
        'opacity': 'opacity',
        'scroll': 'scroll-position',
        'contents': 'contents',
      }
    },
  },
  plugins: [],
  // RTL support
  corePlugins: {
    // Enable logical properties for RTL support
    float: false,
    clear: false,
    textAlign: false,
  }
}