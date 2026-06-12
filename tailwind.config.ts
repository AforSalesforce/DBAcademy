import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ['var(--font-display)', 'sans-serif'],
                body: ['var(--font-body)', 'sans-serif'],
            },
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                accent: "var(--accent)",
                warm: "var(--warm)",
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
