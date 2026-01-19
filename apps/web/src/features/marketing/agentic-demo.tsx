import { Badge } from "@workspace/ui/components/badge";
import { Typography } from "@workspace/ui/components/typography";
import { MaxWidthContainer } from "../page/page";

export const AgenticDemo = () => {
  return (
    <MaxWidthContainer spacing="default" className="py-16">
      <div className="text-center mb-8 flex flex-col gap-2 items-center mx-auto max-w-2xl">
        <Badge variant="outline">See It In Action</Badge>
        <Typography variant="h2">
          Watch Your{" "}
          <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            Agent Work
          </span>
        </Typography>
        <Typography variant="lead">
          See how your agent captures, organizes, and retrieves—all
          autonomously. No folders. No friction. Just agentic bookmarking.
        </Typography>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="-m-2 rounded-xl bg-muted/50 p-2 ring-1 ring-border lg:-m-4 lg:rounded-2xl lg:p-4">
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
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
        </div>
      </div>
    </MaxWidthContainer>
  );
};
