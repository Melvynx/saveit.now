"use client";

import { toast } from "sonner";
import { create } from "zustand";
import type { DialogManagerRendererDialogProps } from "./dialog-manager-dialog";
import { isStandardDialog } from "./dialog-manager-dialog";

export type DialogManagerType = DialogManagerRendererDialogProps & {
  id: string;
  loading?: boolean;
};

type DialogManagerStore = {
  dialogs: DialogManagerType[];
  addDialog: (dialog: DialogManagerRendererDialogProps) => string;
  removeDialog: (dialogId: string) => void;
};

export const useDialogManager = create<DialogManagerStore>((set, get) => ({
  dialogs: [],
  addDialog: (dialog) => {
    const id = Math.random().toString(36).slice(2, 9);
    const { removeDialog } = get();

    const newDialog: DialogManagerType = isStandardDialog(dialog)
      ? {
          ...dialog,
          cancel: {
            label: dialog.cancel?.label ?? "Cancel",
            onClick: () => {
              if (dialog.cancel && "onClick" in dialog.cancel) {
                void dialog.cancel.onClick();
                return;
              }
              removeDialog(id);
            },
          },
          action:
            dialog.action && "onClick" in dialog.action
              ? {
                  label: dialog.action.label || "",
                  onClick: (value?: string) => {
                    if (dialog.action && "onClick" in dialog.action === false) {
                      console.error("Invalid dialog action");
                      removeDialog(id);
                      return;
                    }

                    // check if it's a promise
                    const onClickReturn = dialog.action?.onClick(value);

                    if (onClickReturn instanceof Promise) {
                      set((state) => {
                        const dialogIndex = state.dialogs.findIndex(
                          (dialog) => dialog.id === id,
                        );

                        if (dialogIndex !== -1) {
                          const dialogCopy = {
                            ...state.dialogs[dialogIndex],
                          } as DialogManagerType;
                          dialogCopy.loading = true;
                          state.dialogs[dialogIndex] = dialogCopy;
                        }

                        return { dialogs: [...state.dialogs] };
                      });

                      onClickReturn
                        .then(() => {
                          removeDialog(id);
                        })
                        .catch((e) => {
                          toast.error("Some error occurred", {
                            description: e.message,
                          });
                        });
                    } else {
                      removeDialog(id);
                    }
                  },
                }
              : dialog.action,
          loading: false,
          id,
        }
      : { ...dialog, id: id };

    set((state) => ({ dialogs: [...state.dialogs, newDialog] }));

    return id;
  },
  removeDialog: (dialogId) =>
    set((state) => ({
      dialogs: state.dialogs.filter((dialog) => dialog.id !== dialogId),
    })),
}));

export const dialogManager = {
  add: (dialog: DialogManagerRendererDialogProps) =>
    useDialogManager.getState().addDialog(dialog),
  remove: (dialogId: string) =>
    useDialogManager.getState().removeDialog(dialogId),
};
