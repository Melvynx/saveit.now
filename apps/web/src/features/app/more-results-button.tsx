import { LoadingButton } from "@/features/form/loading-button";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Plus } from "lucide-react";

export function MoreResultsButton() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as {
    query?: string;
    matchingDistance?: string | number;
  };
  const currentMatchingDistance = parseFloat(
    String(searchParams.matchingDistance ?? "0.1"),
  );
  const query = searchParams.query;

  if (!query || query.trim() === "") {
    return null;
  }

  const handleMoreResults = () => {
    const nextMatchingDistance = currentMatchingDistance + 0.1;
    void navigate({
      to: "/app",
      search: (previous) =>
        ({
          ...previous,
          matchingDistance: nextMatchingDistance.toFixed(1),
        }) as never,
    });
  };

  return (
    <Card className="w-full p-4 gap-0 overflow-hidden aspect-[384/290] flex flex-col">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center gap-2">
          <Plus className="text-primary size-4" />
          <CardTitle>Show more results ?</CardTitle>
        </div>
        <CardDescription>
          By default, we only show the <b>best result(s)</b> for your query. But
          you can increase the matching distance to show more results.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end px-0 pb-0">
        <LoadingButton
          size="sm"
          className="w-full"
          onClick={handleMoreResults}
        >
          Increase matching distance
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
