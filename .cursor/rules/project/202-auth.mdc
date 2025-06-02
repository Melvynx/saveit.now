---
description: EXPLAIN how authentification work and HOW to use it
globs: *.tsx, *.ts
alwaysApply: false
---
## Context

* We use NextAuth to handle authentification in our application.
* Our application create helper to simplify the usage of retreiving the user.

## Example Server Side

To get the current user, you must use `auth` function :

```ts
import { getUser } from "@/lib/auth/helper";

// user is optional
const user = await getUser();
// throw an error if user is not defined
const user = await getRequiredUser();
```

`requiredAuth` will throw an `unauthorized` method that will be catch by `unauthorized.tsx`. You can check [105-nextjs-routes.mdc](mdc:.cursor/rules/general/105-nextjs-routes.mdc)

## Exemple Client Side

Use `useSession` from [212-better-auth.mdc](mdc:.cursor/rules/project/212-better-auth.mdc) and [auth-client.ts](mdc:src/lib/auth-client.ts) !

```ts
import { useSession } from "@/lib/auth-client";

const Component = () => {
  const session = useSession();
}
```

## Mutation data

To mutate data from the `authClient` you must always use the following syntaxe : 

```tsx
import { unwrapSafePromise } from "@/lib/promises";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";

const Component = () => {
  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      return unwrapSafePromise(
        authClient.sendVerificationEmail({
          email: defaultValues.email,
          callbackURL: "/account",
        }),
      );
    },
    onSuccess: () => {
      toast.success("Verification email sent");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <LoadingButton
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => verifyEmailMutation.mutate()}
      loading={verifyEmailMutation.isPending}
    >
      Verify email
    </LoadingButton>
  )
}

