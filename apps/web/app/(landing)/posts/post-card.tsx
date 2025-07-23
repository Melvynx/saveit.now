/* eslint-disable @next/next/no-img-element */
import type { Post } from "@/lib/mdx/posts-manager";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";

import { cn } from "@workspace/ui/lib/utils";

export function PostCard(props: { post: Post; large?: boolean }) {
  const { post, large } = props;
  return (
    <Link href={`/posts/${post.slug}`} className="block group">
      <Card
        className={cn(
          "overflow-hidden p-0 border-none hover:bg-card transition shadow-none bg-transparent group-hover:shadow-md p-2",
          large && "mb-8",
        )}
      >
        {post.frontmatter.banner && (
          <img
            src={post.frontmatter.banner}
            alt={post.frontmatter.title}
            className={cn(
              "w-full object-cover rounded-lg",
              large ? "h-64 md:h-96" : "h-40",
            )}
            loading="lazy"
          />
        )}
        <div className={cn("p-4", large ? "py-8" : "py-4")}>
          <Typography
            variant={large ? "h2" : "h3"}
            className="mb-2 line-clamp-2"
          >
            {post.frontmatter.title}
          </Typography>
          <div className="text-sm text-muted-foreground">
            {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </Card>
    </Link>
  );
}
