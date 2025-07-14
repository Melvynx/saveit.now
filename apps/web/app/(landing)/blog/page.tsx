import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight, Calendar, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { getAllPosts, getFeaturedPosts } from "@/lib/mdx/posts-manager";

export default async function BlogPage() {
  const [allPosts, featuredPosts] = await Promise.all([
    getAllPosts(),
    getFeaturedPosts(),
  ]);
  
  const featuredPost = featuredPosts[0];
  const regularPosts = allPosts.filter(post => !post.frontmatter.featured);

  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-16">
          {/* Header Section */}
          <div className="text-center space-y-6">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Sparkles className="size-3 mr-1" />
              Latest Updates
            </Badge>
            <Typography variant="h1" className="max-w-3xl mx-auto">
              Insights, tips, and updates from the SaveIt team
            </Typography>
            <Typography variant="lead" className="max-w-2xl mx-auto text-muted-foreground">
              Stay up-to-date with the latest features, productivity tips, and insights about bookmark management and digital organization.
            </Typography>
          </div>

          {/* Featured Post */}
          {featuredPost && (
            <div className="space-y-6">
              <Typography variant="h2" className="text-center">Featured Article</Typography>
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{featuredPost.frontmatter.category}</Badge>
                    <Badge className="bg-primary/10 text-primary border-primary/20">Featured</Badge>
                  </div>
                  <CardTitle className="text-2xl">{featuredPost.frontmatter.title}</CardTitle>
                  <CardDescription className="text-lg">{featuredPost.frontmatter.description}</CardDescription>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-4" />
                      {new Date(featuredPost.frontmatter.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long", 
                        day: "numeric"
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-4" />
                      {featuredPost.readingTime.text}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href={`/blog/${featuredPost.slug}`}>
                      Read Article
                      <ArrowRight className="size-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Posts */}
          <div className="space-y-8">
            <Typography variant="h2" className="text-center">Recent Articles</Typography>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post) => (
                <Card key={post.slug} className="h-fit hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{post.frontmatter.category}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="size-3" />
                        {post.readingTime.text}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2">{post.frontmatter.title}</CardTitle>
                    <CardDescription className="line-clamp-3">{post.frontmatter.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </div>
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/blog/${post.slug}`}>
                        Read More
                        <ArrowRight className="size-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Coming Soon */}
          {allPosts.length === 0 && (
            <div className="text-center space-y-4 py-8">
              <Typography variant="h3" className="text-muted-foreground">Articles coming soon</Typography>
              <Typography variant="muted" className="max-w-md mx-auto">
                We're working on helpful content about productivity, bookmark management, and digital organization.
              </Typography>
            </div>
          )}
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}