import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { getAllPosts, getFeaturedPosts } from "@/lib/mdx/posts-manager";
import { Typography } from "@workspace/ui/components/typography";
import { PostCard } from "./post-card";

export default async function BlogPage() {
  const [allPosts, featuredPosts] = await Promise.all([
    getAllPosts(),
    getFeaturedPosts(),
  ]);

  const featuredPost = featuredPosts[0];
  const regularPosts = allPosts.filter((post) => !post.frontmatter.featured);

  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-16">
          {/* Header Section */}
          <div className="text-center space-y-6">
            <Typography variant="h1" className="max-w-3xl mx-auto">
              Insights, tips, and updates from the SaveIt team
            </Typography>
          </div>

          {/* Featured Post */}
          {featuredPost && <PostCard post={featuredPost} large />}

          {/* Recent Posts */}
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

          {/* Coming Soon */}
          {allPosts.length === 0 && (
            <div className="text-center space-y-4 py-8">
              <Typography variant="h3" className="text-muted-foreground">
                Articles coming soon
              </Typography>
              <Typography variant="muted" className="max-w-md mx-auto">
                We're working on helpful content about productivity, bookmark
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
