/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,tsx}", "./src/**/*.{js,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ["DMSans_400Regular", "System", "sans-serif"],
        "sans-medium": ["DMSans_500Medium", "System", "sans-serif"],
        "sans-semibold": ["DMSans_600SemiBold", "System", "sans-serif"],
        "sans-bold": ["DMSans_700Bold", "System", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        success: "#10B981",
        warning: "#F59E0B",
        disabled: "var(--disabled)",
        "disabled-foreground": "var(--disabled-foreground)",
      },
    },
  },
  plugins: [],
};
