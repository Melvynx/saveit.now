import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { Fragment } from "react";
import { SHORTCUT_SCOPES, SHORTCUTS, formatShortcutKey } from "./shortcuts";
import { useAppShell } from "./use-app-shell";

export function ShortcutKeys({ keys }: { keys: readonly string[] }) {
  return (
    <KbdGroup>
      {keys.map((key, index) => (
        <Fragment key={`${key}-${index}`}>
          {index > 0 && keys.length === 2 && keys[0] === "J" ? (
            <span className="px-0.5 text-[11px] text-muted-foreground">/</span>
          ) : null}
          <Kbd>{formatShortcutKey(key)}</Kbd>
        </Fragment>
      ))}
    </KbdGroup>
  );
}

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useAppShell();

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="gap-0 overflow-hidden rounded-[14px] p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b border-border px-5 pt-4 pb-3.5">
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Move through your library without leaving the keyboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[min(70vh,560px)] gap-x-8 gap-y-5 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          {SHORTCUT_SCOPES.map((scope) => (
            <section key={scope} className="flex flex-col gap-1">
              <h3 className="pb-1 text-[11px] font-medium text-muted-foreground">
                {scope}
              </h3>
              {SHORTCUTS.filter((shortcut) => shortcut.scope === scope).map(
                (shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex h-8 items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="text-foreground">{shortcut.label}</span>
                    <ShortcutKeys keys={shortcut.keys} />
                  </div>
                ),
              )}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
