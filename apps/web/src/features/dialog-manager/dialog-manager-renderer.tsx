import { DialogManagerRendererDialog } from "./dialog-manager-dialog";
import type { DialogManagerType } from "./dialog-manager-store";
import { useDialogManager } from "./dialog-manager-store";

export const DialogManagerRenderer = () => {
  const dialog = useDialogManager((state) => state.dialogs[0]) as
    | DialogManagerType
    | undefined;

  if (dialog) {
    return <DialogManagerRendererDialog {...dialog} />;
  }

  return null;
};
