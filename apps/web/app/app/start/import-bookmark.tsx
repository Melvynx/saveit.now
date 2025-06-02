import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ImportForm } from "../imports/import-form";

export type ImportBookmarkProps = {};

type BookmarkSource = "chrome" | "mymind";

export const ImportBookmark = (props: ImportBookmarkProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import bookmarks</CardTitle>
        <CardDescription>
          Import your bookmarks from text files, URLs, or by pasting them
          directly. We'll extract all valid URLs and create bookmarks for you.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ImportForm />
      </CardContent>
    </Card>
  );
};
