"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@workspace/ui/components/form";
import { Textarea } from "@workspace/ui/components/textarea";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { z } from "zod";
import { importBookmarksAction } from "./imports.action";

const Schema = z.object({
  text: z.string().min(1),
});

export default function ImportPage() {
  const form = useZodForm({
    schema: Schema,
    defaultValues: {
      text: "",
    },
  });

  const { execute, status } = useAction(importBookmarksAction, {
    onSuccess: ({ data }) => {
      if (!data) return;
      toast.success(
        `Created ${data.createdBookmarks} bookmarks from ${data.totalUrls} URLs`,
      );
      form.reset();
    },
    onError: ({ error }) => {
      if (error.serverError) {
        toast.error(error.serverError);
      } else if (error.validationErrors?._errors) {
        toast.error(error.validationErrors._errors.join(", "));
      }
    },
  });

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold">Import Bookmarks</h1>

        <Form form={form} onSubmit={async (data) => execute(data)}>
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paste your text containing URLs</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Paste any text containing URLs here..."
                    className="min-h-[200px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="mt-4"
            disabled={status === "executing"}
          >
            {status === "executing" ? "Importing..." : "Import URLs"}
          </Button>
        </Form>
      </div>
    </div>
  );
}
