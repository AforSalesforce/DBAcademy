import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: 'class',
    // Every folder that can contain className strings. Missing one here fails
    // silently: its classes are simply never generated (this is what broke the
    // lesson panel and sidebar after the move to src/features/).
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ['var(--font-display)', 'sans-serif'],
                body: ['var(--font-body)', 'sans-serif'],
            },
            // Design tokens (values live in globals.css as RGB channels, so
            // opacity modifiers like bg-accent/10 work). Use these instead of
            // hex codes or Tailwind's slate/blue palette.
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                canvas: "rgb(var(--bg-rgb) / <alpha-value>)",
                surface: "rgb(var(--surface-rgb) / <alpha-value>)",
                card: "rgb(var(--card-rgb) / <alpha-value>)",
                "card-hover": "rgb(var(--card-hover-rgb) / <alpha-value>)",
                ink: "rgb(var(--text-rgb) / <alpha-value>)",
                muted: "rgb(var(--muted-rgb) / <alpha-value>)",
                faint: "rgb(var(--faint-rgb) / <alpha-value>)",
                accent: "rgb(var(--accent-rgb) / <alpha-value>)",
                warm: "rgb(var(--warm-rgb) / <alpha-value>)",
                success: "rgb(var(--success-rgb) / <alpha-value>)",
                danger: "rgb(var(--danger-rgb) / <alpha-value>)",
                line: "rgb(255 255 255 / 0.07)",
            },
            animation: {
                'grain': 'grain 0.8s steps(1) infinite',
                'marquee': 'marquee 28s linear infinite',
            },
            keyframes: {
                grain: {
                    '0%, 100%': { transform: 'translate(0, 0)' },
                    '25%': { transform: 'translate(-3%, -5%)' },
                    '50%': { transform: 'translate(-5%, 3%)' },
                    '75%': { transform: 'translate(3%, -5%)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};
export default config;
