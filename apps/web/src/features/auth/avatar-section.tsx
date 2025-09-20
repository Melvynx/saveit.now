"use client";

import { AvatarUploader } from "@/features/auth/avatar-uploader";
import { useSession } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { upfetch } from "src/lib/up-fetch";
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

  const response = await upfetch(`/api/user/avatar`, {
    method: "POST",
    body: formData,
    schema: z.object({
      avatarUrl: z.string(),
      success: z.boolean(),
    }),
  });

  return response;
}

export function AvatarSection({ user }: AvatarSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();
  const session = useSession();

  const uploadMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      toast.success("Avatar updated successfully!");
      router.refresh();
      session.refetch();
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar. Please try again.");
    },
  });

  const handleImageChange = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile });
    }
  };

  const hasChanges = selectedFile !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatar</CardTitle>
        <CardDescription>
          Upload a profile picture to personalize your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <AvatarUploader
          onImageChange={handleImageChange}
          currentAvatar={user.image}
        />
        {selectedFile && (
          <p className="text-muted-foreground text-sm">
            Ready to upload: {selectedFile.name}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={!hasChanges || uploadMutation.isPending}
        >
          {uploadMutation.isPending && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          {uploadMutation.isPending ? "Uploading..." : "Save Avatar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
