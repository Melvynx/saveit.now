"use client";

import { AvatarUploader } from "@/features/auth/avatar-uploader";
import { useSession } from "@/lib/auth-client";
import { useAsyncTask } from "@/lib/use-async-task";
import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useAction } from "convex/react";
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
  const uploadAvatar = useAction(api.users.actions.uploadAvatar);

  const uploadTask = useAsyncTask(
    async (file: File) => {
      const fileData = await file.arrayBuffer();
      return uploadAvatar({
        fileData,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
    },
    {
      onSuccess: () => {
        toast.success("Avatar updated successfully!");
        void session.refetch();
        setSelectedFile(null);
      },
      onError: (error) => {
        console.error("Upload error:", error);
        toast.error("Failed to upload avatar. Please try again.");
      },
    },
  );

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
          onClick={() => selectedFile && void uploadTask.run(selectedFile)}
          disabled={!hasChanges || uploadTask.isPending}
          size="sm"
          variant="outline"
        >
          {uploadTask.isPending && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          {uploadTask.isPending ? "Uploading..." : "Save avatar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
