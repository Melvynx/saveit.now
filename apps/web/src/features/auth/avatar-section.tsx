"use client";

import { AvatarUploader } from "@/features/auth/avatar-uploader";
import { useSession } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import { useConvexAction } from "@convex-dev/react-query";
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

interface AvatarSectionProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export function AvatarSection({ user }: AvatarSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const session = useSession();
  const uploadAvatarAction = useConvexAction(api.users.actions.uploadAvatar);

  const uploadMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const fileData = await file.arrayBuffer();
      return uploadAvatarAction({
        fileData,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
    },
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
