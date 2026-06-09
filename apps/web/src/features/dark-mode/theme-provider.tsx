import * as React from "react";

type Theme = "dark" | "light" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: Theme) {
  if (theme !== "system") return theme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: React.PropsWithChildren<{ defaultTheme?: Theme }>) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return (localStorage.getItem("theme") as Theme | null) ?? defaultTheme;
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.toggle("dark", resolveTheme(theme) === "dark");
    };

    apply();

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = React.useCallback((nextTheme: Theme) => {
    localStorage.setItem("theme", nextTheme);
    setThemeState(nextTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = React.useContext(ThemeContext);

  if (!value) {
    return {
      theme: "system" as Theme,
      setTheme: () => {},
    };
  }

  return value;
}
