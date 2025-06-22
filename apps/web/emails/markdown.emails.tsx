import { Markdown, Preview } from "@react-email/components";
import { EmailLayout } from "./email-layout";

export default function MarkdownEmail(props: {
  markdown: string;
  preview?: string;
  disabledSignature?: boolean;
}) {
  // Normalize markdown by removing leading/trailing spaces from each line
  props.markdown = props.markdown
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return (
    <EmailLayout disableTailwind>
      <Preview>{props.preview ?? "You receive a markdown email."}</Preview>
      <Markdown
        markdownCustomStyles={{
          p: {
            fontSize: "1.125rem",
            lineHeight: "1.5rem",
          },
          li: {
            fontSize: "1.125rem",
            lineHeight: "1.5rem",
          },
          link: {
            color: "#6366f1",
          },
        }}
      >
        {props.markdown}
      </Markdown>
    </EmailLayout>
  );
}
