import { InterceptDialog } from "@/components/intercept-dialog";
import { getRequiredUser } from "@/lib/auth-session";
import { prisma } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { DialogContent } from "@workspace/ui/components/dialog";
import { Typography } from "@workspace/ui/components/typography";
import {
  ExternalLink,
  Image,
  LucideIcon,
  Sparkle,
  TagIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "./delete-button";
import { BackButton, CopyLinkButton } from "./utils";

export default async function RoutePage(props: {
  params: Promise<{ bookmarkId: string }>;
}) {
  const params = await props.params;
  const user = await getRequiredUser();

  const bookmark = await prisma.bookmark.findUnique({
    where: {
      id: params.bookmarkId,
      userId: user.id,
    },
    include: {
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!bookmark) {
    return notFound();
  }

  const domainName = new URL(bookmark.url).hostname;

  return (
    <InterceptDialog>
      <DialogContent
        disableClose
        className=" p-0 flex flex-col gap-0"
        style={{ maxWidth: "min(calc(100vw - 32px), 1000px)" }}
      >
        <header className="px-6 pt-6 flex items-center gap-2">
          <div className="flex-1"></div>
          <Button size="icon" variant="outline" className="size-8" asChild>
            <Link href={bookmark.url} target="_blank">
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          </Button>
          <CopyLinkButton url={bookmark.url} />
          <BackButton />
        </header>
        <main className="p-6 flex flex-col gap-4 lg:gap-6">
          <Card className="p-4">
            <div className="flex items-start gap-2">
              <div className="size-8 border rounded items-center justify-center flex">
                <img
                  src={bookmark.faviconUrl ?? ""}
                  alt="favicon"
                  className="size-5"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="large">{domainName}</Typography>
                <Typography variant="muted">{bookmark.title}</Typography>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle icon={Sparkle} text="Summary" />
            <div className="flex flex-col gap-2">
              <Typography variant="muted">{bookmark.summary}</Typography>
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle icon={Image} text="Screenshot" />
            <img
              src={bookmark.preview ?? ""}
              alt="screenshot"
              className="rounded-md"
            />
          </Card>
          <Card className="p-4">
            <SectionTitle icon={TagIcon} text="Tags" />
            <div className="flex flex-col gap-2">
              <Typography variant="muted">AI Generated</Typography>
              <div className="flex flex-wrap gap-2">
                {bookmark.tags
                  .filter((tag) => tag.tag.type === "IA")
                  .map((tag) => (
                    <Tag key={tag.tag.id} name={tag.tag.name} />
                  ))}
              </div>
            </div>
          </Card>
        </main>
        <footer className="p-6 flex items-center gap-2 border-t-2">
          <div className="flex-1"></div>

          <DeleteButton bookmarkId={bookmark.id} />
          <Button variant="default" asChild>
            <Link href={bookmark.url} target="_blank">
              <ExternalLink className="size-4" />
              <span>Open</span>
            </Link>
          </Button>
        </footer>
      </DialogContent>
    </InterceptDialog>
  );
}

const SectionTitle = (props: { icon: LucideIcon; text: string }) => {
  return (
    <div className="flex items-center gap-2">
      <props.icon className="text-primary size-4" />
      <Typography variant="muted">{props.text}</Typography>
    </div>
  );
};

const Tag = (props: { name: string }) => {
  return <Badge variant="outline">{props.name}</Badge>;
};
