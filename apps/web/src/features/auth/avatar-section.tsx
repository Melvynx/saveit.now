"use client";

import { AvatarUploader } from "@/features/auth/avatar-uploader";
import { useSession } from "@/lib/auth-client";
import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface AvatarSectionProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

async function uploadAvatar({ file }: { file: File }) {
  const formData = new FormData();
  formData.append("file", file);

  return upfetch(`/api/user/avatar`, {
    method: "POST",
    body: formData,
    schema: z.object({
      avatarUrl: z.string(),
      success: z.boolean(),
    }),
  });
}

export function AvatarSection({ user }: AvatarSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const session = useSession();

  const uploadMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      toast.success("Avatar updated successfully!");
      void session.refetch();
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar. Please try again.");
    },
  });

  const hasChanges = selectedFile !== null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Your avatar</CardTitle>
          <CardDescription>
            Upload a profile image for your account menu.
          </CardDescription>
        </div>
        <AvatarUploader
          onImageChange={setSelectedFile}
          currentAvatar={user.image}
        />
      </CardHeader>
      <CardFooter className="flex flex-col items-start justify-between gap-3 border-t sm:flex-row sm:items-center">
        {selectedFile && (
          <p className="text-muted-foreground text-sm">
            Ready to upload: {selectedFile.name}
          </p>
        )}
        {!selectedFile && (
          <p className="text-muted-foreground text-sm">
            Square images work best.
          </p>
        )}
        <Button
          onClick={() => selectedFile && uploadMutation.mutate({ file: selectedFile })}
          disabled={!hasChanges || uploadMutation.isPending}
          size="sm"
          variant="outline"
        >
          {uploadMutation.isPending && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          {uploadMutation.isPending ? "Uploading..." : "Save avatar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
