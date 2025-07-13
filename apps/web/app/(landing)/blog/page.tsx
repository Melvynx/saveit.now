import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight, Calendar, Clock, Sparkles } from "lucide-react";
import Link from "next/link";

// Mock blog posts data - in a real implementation, this would come from your CMS or MDX files
const blogPosts = [
  {
    id: "1",
    title: "The Future of Bookmark Management with AI",
    description: "Discover how artificial intelligence is revolutionizing the way we save, organize, and retrieve our digital bookmarks.",
    date: "2024-01-15",
    readTime: "5 min read",
    category: "AI & Innovation",
    featured: true,
  },
  {
    id: "2", 
    title: "5 Productivity Tips for Content Creators",
    description: "Learn how to organize your research and resources more effectively with advanced bookmark management techniques.",
    date: "2024-01-10",
    readTime: "7 min read",
    category: "Productivity",
    featured: false,
  },
  {
    id: "3",
    title: "Building Your Digital Knowledge Base",
    description: "Transform scattered bookmarks into a powerful knowledge management system that grows with you.",
    date: "2024-01-05",
    readTime: "6 min read", 
    category: "Knowledge Management",
    featured: false,
  },
];

export default function BlogPage() {
  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

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
                    <Badge variant="secondary">{featuredPost.category}</Badge>
                    <Badge className="bg-primary/10 text-primary border-primary/20">Featured</Badge>
                  </div>
                  <CardTitle className="text-2xl">{featuredPost.title}</CardTitle>
                  <CardDescription className="text-lg">{featuredPost.description}</CardDescription>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-4" />
                      {new Date(featuredPost.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long", 
                        day: "numeric"
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-4" />
                      {featuredPost.readTime}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href={`/blog/${featuredPost.id}`}>
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
                <Card key={post.id} className="h-fit hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{post.category}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="size-3" />
                        {post.readTime}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                    <CardDescription className="line-clamp-3">{post.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </div>
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/blog/${post.id}`}>
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
          <div className="text-center space-y-4 py-8">
            <Typography variant="h3" className="text-muted-foreground">More articles coming soon</Typography>
            <Typography variant="muted" className="max-w-md mx-auto">
              We're working on more helpful content about productivity, bookmark management, and digital organization.
            </Typography>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}