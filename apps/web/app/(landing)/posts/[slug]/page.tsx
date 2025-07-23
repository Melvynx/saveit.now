import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Typography } from "@workspace/ui/components/typography";
import { Calendar, Clock, ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { getPostBySlug, getAllPosts } from "@/lib/mdx/posts-manager";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { notFound } from "next/navigation";
import { rehypePlugins, remarkPlugins } from "@/lib/mdx/mdx-config";
import { Button } from "@workspace/ui/components/button";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage(props: BlogPostPageProps) {
  const params = await props.params;
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-8">
          {/* Back Link */}
          <div>
            <Button variant="ghost" asChild className="gap-2">
              <Link href="/posts">
                <ArrowLeft className="size-4" />
                Back to Blog
              </Link>
            </Button>
          </div>

          {/* Article Header */}
          <article className="max-w-4xl mx-auto w-full">
            <header className="space-y-6 pb-8 border-b">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{post.frontmatter.category}</Badge>
                {post.frontmatter.featured && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">Featured</Badge>
                )}
              </div>
              
              <Typography variant="h1" className="text-4xl md:text-5xl">
                {post.frontmatter.title}
              </Typography>
              
              <Typography variant="lead" className="text-muted-foreground">
                {post.frontmatter.description}
              </Typography>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="size-4" />
                  {post.frontmatter.author}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  {post.readingTime.text}
                </div>
              </div>

              {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {post.frontmatter.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </header>

            {/* Article Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none py-8">
              <MDXRemote
                source={post.content}
                options={{
                  mdxOptions: {
                    remarkPlugins,
                    rehypePlugins,
                  },
                }}
              />
            </div>

          </article>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}