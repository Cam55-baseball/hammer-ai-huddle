import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1400px',
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        wellness: {
          lavender: "hsl(var(--wellness-lavender))",
          "lavender-foreground": "hsl(var(--wellness-lavender-foreground))",
          sage: "hsl(var(--wellness-sage))",
          "sage-foreground": "hsl(var(--wellness-sage-foreground))",
          coral: "hsl(var(--wellness-coral))",
          "coral-foreground": "hsl(var(--wellness-coral-foreground))",
          sky: "hsl(var(--wellness-sky))",
          "sky-foreground": "hsl(var(--wellness-sky-foreground))",
          cream: "hsl(var(--wellness-cream))",
          "soft-gray": "hsl(var(--wellness-soft-gray))",
          warning: "hsl(var(--wellness-warning))",
          "warning-foreground": "hsl(var(--wellness-warning-foreground))",
        },
        "tex-vision": {
          DEFAULT: "hsl(var(--tex-vision-primary))",
          primary: "hsl(var(--tex-vision-primary))",
          "primary-light": "hsl(var(--tex-vision-primary-light))",
          "primary-dark": "hsl(var(--tex-vision-primary-dark))",
          success: "hsl(var(--tex-vision-success))",
          text: "hsl(var(--tex-vision-text))",
          "text-muted": "hsl(var(--tex-vision-text-muted))",
          timing: "hsl(var(--tex-vision-timing))",
          feedback: "hsl(var(--tex-vision-feedback))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "gradient-shift": {
          "0%, 100%": {
            "background-position": "0% 50%",
          },
          "50%": {
            "background-position": "100% 50%",
          },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "icon-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "icon-wiggle": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-8deg)" },
          "75%": { transform: "rotate(8deg)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(5px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "vault-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 0 0 hsl(var(--amber-glow, 45 100% 50%) / 0.4)",
          },
          "50%": { 
            boxShadow: "0 0 12px 4px hsl(var(--amber-glow, 45 100% 50%) / 0.6)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-shift": "gradient-shift 3s ease infinite",
        "slide-in-left": "slide-in-left 0.3s ease-out forwards",
        "icon-bounce": "icon-bounce 0.5s ease-in-out",
        "icon-wiggle": "icon-wiggle 0.5s ease-in-out",
        "fade-in-up": "fade-in-up 0.2s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "vault-pulse": "vault-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
