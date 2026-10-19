import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CommandPaletteMode = "search" | "add";

type OpenOptions = {
  mode?: CommandPaletteMode;
  query?: string;
};

type CommandPaletteContextValue = {
  isOpen: boolean;
  mode: CommandPaletteMode;
  initialQuery: string;
  open: (options?: OpenOptions) => void;
  close: () => void;
  toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CommandPaletteMode>("search");
  const [initialQuery, setInitialQuery] = useState("");

  const open = useCallback((options?: OpenOptions) => {
    setMode(options?.mode ?? "search");
    setInitialQuery(options?.query ?? "");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    setIsOpen((current) => {
      if (!current) {
        setMode("search");
        setInitialQuery("");
      }
      return !current;
    });
  }, []);

  const value = useMemo(
    () => ({ isOpen, mode, initialQuery, open, close, toggle }),
    [isOpen, mode, initialQuery, open, close, toggle],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

const noop = () => {};

/**
 * Opens the global Cmd+K palette mounted by the /app shell. Outside the shell
 * the returned functions are no-ops.
 */
export function useCommandPalette() {
  const value = useContext(CommandPaletteContext);
  return (
    value ?? {
      isOpen: false,
      mode: "search" as CommandPaletteMode,
      initialQuery: "",
      open: noop as (options?: OpenOptions) => void,
      close: noop,
      toggle: noop,
    }
  );
}
