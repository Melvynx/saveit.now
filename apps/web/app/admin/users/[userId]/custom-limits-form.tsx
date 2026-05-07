"use client";

import type { AuthLimits, CustomAuthLimits } from "@/lib/auth-limits";
import { LoadingButton } from "@/features/form/loading-button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateCustomLimitsAction } from "./custom-limits.action";

type CustomLimitsFormProps = {
  userId: string;
  baseLimits: AuthLimits;
  effectiveLimits: AuthLimits;
  customLimits: CustomAuthLimits;
};

const limitFields = [
  {
    key: "bookmarks",
    label: "Total bookmarks",
    description: "Maximum saved bookmarks.",
  },
  {
    key: "monthlyBookmarkRuns",
    label: "Monthly processing runs",
    description: "Maximum bookmark processing jobs per month.",
  },
  {
    key: "monthlyChatQueries",
    label: "Monthly chat queries",
    description: "Maximum AI chat queries per month.",
  },
  {
    key: "canExport",
    label: "Can export",
    description: "Use 1 to allow export, 0 to block it.",
  },
  {
    key: "apiAccess",
    label: "API access",
    description: "Use 1 to allow API keys, 0 to block them.",
  },
] as const satisfies readonly {
  key: keyof AuthLimits;
  label: string;
  description: string;
}[];

const parseOptionalLimit = (formData: FormData, key: keyof AuthLimits) => {
  const rawValue = formData.get(key);
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  return Number(rawValue);
};

export const CustomLimitsForm = ({
  userId,
  baseLimits,
  effectiveLimits,
  customLimits,
}: CustomLimitsFormProps) => {
  const router = useRouter();
  const { execute, isExecuting } = useAction(updateCustomLimitsAction, {
    onSuccess: () => {
      toast.success("Custom limits updated");
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.message ?? "Failed to update custom limits");
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        execute({
          userId,
          bookmarks: parseOptionalLimit(formData, "bookmarks"),
          monthlyBookmarkRuns: parseOptionalLimit(
            formData,
            "monthlyBookmarkRuns",
          ),
          monthlyChatQueries: parseOptionalLimit(formData, "monthlyChatQueries"),
          canExport: parseOptionalLimit(formData, "canExport"),
          apiAccess: parseOptionalLimit(formData, "apiAccess"),
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {limitFields.map((field) => {
          const customValue = customLimits[field.key];
          const hasCustomValue = typeof customValue === "number";

          return (
            <div className="space-y-2" key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                name={field.key}
                type="number"
                min={0}
                step={1}
                placeholder={String(baseLimits[field.key])}
                defaultValue={hasCustomValue ? customValue : ""}
              />
              <p className="text-muted-foreground text-xs">
                Effective: {effectiveLimits[field.key]} · Base: {baseLimits[field.key]}
              </p>
              <p className="text-muted-foreground text-xs">{field.description}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <LoadingButton type="submit" loading={isExecuting}>
          Save custom limits
        </LoadingButton>
        <p className="text-muted-foreground text-sm">
          Leave a field empty to use the plan default.
        </p>
      </div>
    </form>
  );
};
