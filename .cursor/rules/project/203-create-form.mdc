---
description: Create a form using NextJS / React Hook Form / Server Actions.
globs: *.tsx
---
## Context

* Creating a form should always use Shadcn/UI [input.tsx](mdc:src/components/ui/input.tsx) and [label.tsx](mdc:src/components/ui/label.tsx) and [form.tsx](mdc:src/components/ui/form.tsx)
* We must always use [208-server-actions.mdc](mdc:.cursor/rules/project/208-server-actions.mdc) or [201-api-route.mdc](mdc:.cursor/rules/project/201-api-route.mdc) to handle the action and [210-use-mutation.mdc](mdc:.cursor/rules/project/210-use-mutation.mdc)

## Example

```tsx
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@/components/ui/form";
import { z } from "zod";
import { action } from "./action.ts"
import { resolveActionResult } from "@/lib/actions/actions-utils";
import { useMutation } from "@tanstack/react-query";

const Schema = z.object({
  name: z.string(),
});

export const Form = () => {
  const form = useZodForm({
    schema: Schema,
    defaultValues: {
      name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ someParams }: { someParams: string }) => {
      return resolveActionResult(action({ someParams }));
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success("Invoice marked as paid");
    },
  });

  return (
    <Form form={form} onSubmit={async (data) => onSubmit(data)}>
       <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </Form>
  );
};
```

Then you can create an server-action follow [208-server-actions.mdc](mdc:.cursor/rules/project/208-server-actions.mdc)

Please use the following files :

* [form.tsx](mdc:src/components/ui/form.tsx)
* [actions-utils.ts](mdc:src/lib/actions/actions-utils.ts)


