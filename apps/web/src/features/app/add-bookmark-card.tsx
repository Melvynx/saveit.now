import { LoadingButton } from "@/features/form/loading-button";
import { useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useCreateBookmarkAction } from "./use-create-bookmark";

export function AddBookmarkCard({ url }: { url: string }) {
  const navigate = useNavigate();
  const action = useCreateBookmarkAction({
    onSuccess: () => {
      toast.success("Bookmark added");
      void navigate({
        to: "/app",
        search: (previous) => ({ ...previous, query: undefined }) as never,
      });
    },
  });

  return (
    <Card className="w-full p-4 gap-0 overflow-hidden aspect-[384/290] flex flex-col">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center gap-2">
          <Bookmark className="text-primary size-4" />
          <CardTitle>Add this bookmark ?</CardTitle>
        </div>
        <CardDescription className="break-all line-clamp-3">
          Save <b>{url}</b> to your library.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end px-0 pb-0">
        <LoadingButton
          size="sm"
          className="w-full"
          loading={action.isPending}
          onClick={() => action.execute({ url })}
        >
          Add bookmark
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
