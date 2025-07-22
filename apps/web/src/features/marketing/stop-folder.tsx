/* eslint-disable @next/next/no-img-element */
import { Input } from "@workspace/ui/components/input";
import { Typography } from "@workspace/ui/components/typography";
import { MaxWidthContainer } from "../page/page";

export const StopFolder = () => {
  return (
    <MaxWidthContainer spacing="sm" className="flex flex-col gap-8 lg:gap-12">
      <div>
        <Typography variant="h2">Embrass the mess.</Typography>
        <Typography variant="lead">And say goodbye to folder</Typography>
      </div>
      <div className="w-full flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col border rounded-lg p-4">
          <Typography variant="h3">
            Organizing into folder ? For what ?
          </Typography>
          <Typography variant="muted">
            Never going to find anything, and you know it.
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
        <div className="flex-1 flex flex-col border rounded-lg p-4">
          <Typography variant="h3">
            Say welcome to <b>Intelligent Search™</b>
          </Typography>
          <Typography variant="muted">
            Just write what you remember about the website and I'll find it.
          </Typography>
          <div className="h-42 relative w-full mt-12">
            <Input
              className="text-2xl lg:text-xl h-12"
              placeholder="The magic append ✨"
            />
          </div>
        </div>
      </div>
      <Typography variant="h2">30 secondes demo 👇</Typography>
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
        <iframe
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
          src="https://www.tella.tv/video/cmbbtucsq00000bl78kz905hf/embed?b=0&title=1&a=1&loop=0&t=0&muted=0&wt=0"
          allowFullScreen
        />
      </div>
    </MaxWidthContainer>
  );
};
