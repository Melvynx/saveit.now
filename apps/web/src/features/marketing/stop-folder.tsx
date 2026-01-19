/* eslint-disable @next/next/no-img-element */
import { Input } from "@workspace/ui/components/input";
import { Typography } from "@workspace/ui/components/typography";
import { MaxWidthContainer } from "../page/page";

export const StopFolder = () => {
  return (
    <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
      <div>
        <Typography variant="h2">Folders are dead.</Typography>
        <Typography variant="lead">Welcome to agentic bookmarking</Typography>
      </div>
      <div className="w-full flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col border rounded-lg p-4 border-destructive/20 bg-destructive/5">
          <Typography variant="h3" className="text-muted-foreground">
            Traditional: You do all the work
          </Typography>
          <Typography variant="muted">
            Organize into folders. Tag everything. Search with exact keywords.
            Still can't find anything.
          </Typography>
          <div className="h-42 relative w-full">
            <img
              src="/images/landing/folder.png"
              alt="Folder"
              className="size-32 -rotate-12 absolute top-10 left-10"
            />
            <img
              src="/images/landing/mess.png"
              alt="Folder"
              className="size-32 rotate-3 absolute top-10 left-1/2 -translate-x-1/2"
            />
            <img
              src="/images/landing/tags.png"
              alt="Folder"
              className="size-32 rotate-12 absolute top-10 right-10"
            />
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke="red"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="0"
                x2="0"
                y2="100"
                stroke="red"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 flex flex-col border rounded-lg p-4 border-primary/20 bg-primary/5">
          <Typography variant="h3" className="text-primary">
            Agentic: Your agent does the work
          </Typography>
          <Typography variant="muted">
            Just describe what you're looking for. Your agent finds it
            instantly.
          </Typography>
          <div className="h-42 relative w-full mt-12">
            <Input
              className="text-2xl lg:text-xl h-12"
              placeholder="That article about productivity..."
            />
          </div>
        </div>
      </div>
    </MaxWidthContainer>
  );
};
