"use client";

import { AvatarUploader } from "@/features/auth/avatar-uploader";
import { authClient, useSession } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@workspace/ui/components/input";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { updateProfileAction } from "./update-profile.action";

const ProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.string().url().optional(),
});

type ProfileFormProps = {
  onSuccess?: () => void;
};

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const { data: session } = useSession();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useZodForm({
    schema: ProfileSchema,
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (session?.user) {
      form.reset({
        name: session.user.name || "",
      });
    }
  }, [session, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof ProfileSchema>) => {
      return unwrapSafePromise(
        authClient.updateUser({
          name: values.name,
        })
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      onSuccess?.();
    },
  });

  const action = useAction(updateProfileAction, {
    onSuccess(args) {
      form.setValue("image", args.data?.url);
    },
  });

  const handleSubmit = async (data: z.infer<typeof ProfileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-center mb-6">
        <AvatarUploader
          onImageChange={(file) => {
            const formData = new FormData();
            formData.append("file", file);
            action.execute({ formData });
          }}
        />
      </div>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Your name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={updateProfileMutation.isPending || !form.formState.isDirty}
      >
        {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
      </Button>
    </Form>
  );
}
