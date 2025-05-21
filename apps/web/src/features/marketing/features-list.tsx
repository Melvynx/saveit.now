import { Typography } from "@workspace/ui/components/typography";

export const FeaturesList = () => {
  return (
    <div className="ml-auto flex flex-1 flex-col gap-6">
      <Typography variant="h2" className="font-bold">
        Never lose an important link again.
      </Typography>
      <Typography variant="lead">
        Save it now—find it in seconds, whether it’s an article, video, post, or
        tool.
      </Typography>
      <ul className="flex flex-col gap-4">
        <li className="flex items-start gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <Typography variant="large" className="font-medium">
              Instant capture
            </Typography>
            <Typography variant="muted">
              Paste any URL and it's safely stored—no friction.
            </Typography>
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <Typography variant="large" className="font-medium">
              AI summaries
            </Typography>
            <Typography variant="muted">
              Get the key takeaways of articles and videos without reopening
              them.
            </Typography>
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lg">🏷️</span>
          <div>
            <Typography variant="large" className="font-medium">
              Auto-tagging
            </Typography>
            <Typography variant="muted">
              Your library organizes itself—no folders, no mess.
            </Typography>
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lg">🔍</span>
          <div>
            <Typography variant="large" className="font-medium">
              Advanced AI Search
            </Typography>
            <Typography variant="muted">
              Type an idea; and our AI will always find the most relevant,
              guaranted.
            </Typography>
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lg">🖼️</span>
          <div>
            <Typography variant="large" className="font-medium">
              Visual previews
            </Typography>
            <Typography variant="muted">
              Thumbnails and screenshots help you spot what you need at a
              glance.
            </Typography>
          </div>
        </li>
      </ul>
    </div>
  );
};
