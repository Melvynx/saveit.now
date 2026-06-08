import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import type { Post } from "@/lib/mdx/posts-manager";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";

const getPostsData = createServerFn({ method: "GET" }).handler(async () => {
  const { getAllPosts, getFeaturedPosts } = await import(
    "@/lib/mdx/posts-manager"
  );
  const [allPosts, featuredPosts] = await Promise.all([
    getAllPosts(),
    getFeaturedPosts(),
  ]);

  return {
    allPosts,
    featuredPost: featuredPosts[0] ?? null,
    regularPosts: allPosts.filter((post) => !post.frontmatter.featured),
  };
});

export const Route = createFileRoute("/posts")({
  loader: () => getPostsData(),
  component: BlogPage,
});

function BlogPage() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { allPosts, featuredPost, regularPosts } = Route.useLoaderData();

  if (pathname !== "/posts") {
    return <Outlet />;
  }

  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-16">
          <div className="text-center space-y-6">
            <Typography variant="h1" className="max-w-3xl mx-auto">
              Insights, tips, and updates from the SaveIt team
            </Typography>
          </div>

          {featuredPost && <PostCard post={featuredPost} large />}

          <div className="space-y-8">
            <Typography variant="h2" className="text-center">
              Recent Articles
            </Typography>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </div>

          {allPosts.length === 0 && (
            <div className="text-center space-y-4 py-8">
              <Typography variant="h3" className="text-muted-foreground">
                Articles coming soon
              </Typography>
              <Typography variant="muted" className="max-w-md mx-auto">
                We are working on helpful content about productivity, bookmark
                management, and digital organization.
              </Typography>
            </div>
          )}
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}

function PostCard(props: { post: Post; large?: boolean }) {
  const { post, large } = props;

  return (
    <a href={`/posts/${post.slug}`} className="block group">
      <Card
        className={cn(
          "overflow-hidden border-none hover:bg-card transition shadow-none bg-transparent group-hover:shadow-md p-2",
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
    </a>
  );
}
