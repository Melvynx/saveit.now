import { Button } from "@workspace/ui/components/button";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { HistoryIcon, PanelRightCloseIcon, SquarePenIcon } from "lucide-react";
import { formatShortcutKey } from "../../shell/shortcuts";
import { PageHeader } from "../../shell/page-header";

type ChatHeaderProps = {
  title: string;
  historyOpen: boolean;
  canStartNew: boolean;
  onNewConversation: () => void;
  onToggleHistory: () => void;
};

export function ChatHeader({
  title,
  historyOpen,
  canStartNew,
  onNewConversation,
  onToggleHistory,
}: ChatHeaderProps) {
  return (
    <PageHeader
      title={title}
      className="shrink-0 border-border"
      actions={
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNewConversation}
                  disabled={!canStartNew}
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <SquarePenIcon />
              <span className="hidden sm:inline">New chat</span>
            </TooltipTrigger>
            <TooltipContent>
              New chat
              <KbdGroup>
                <Kbd>{formatShortcutKey("mod")}</Kbd>
                <Kbd>{formatShortcutKey("shift")}</Kbd>
                <Kbd>O</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleHistory}
            aria-pressed={historyOpen}
            aria-label={historyOpen ? "Hide history" : "Show history"}
            className="text-muted-foreground hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
          >
            {historyOpen ? <PanelRightCloseIcon /> : <HistoryIcon />}
            <span className="hidden sm:inline">History</span>
          </Button>
        </>
      }
    />
  );
}
