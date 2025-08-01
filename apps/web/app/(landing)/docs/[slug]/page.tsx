import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import {
  getAllDocs,
  getDocBySlug,
  getGroupedDocs,
} from "@/lib/mdx/docs-manager";
import { rehypePlugins, remarkPlugins } from "@/lib/mdx/mdx-config";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowLeft, ArrowRight, Book, Clock, FileText } from "lucide-react";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";

interface DocPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const docs = await getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

export const dynamic = "force-static";

export default async function DocPage(props: DocPageProps) {
  const params = await props.params;
  const doc = await getDocBySlug(params.slug);
  const groupedDocs = await getGroupedDocs();

  if (!doc) {
    notFound();
  }

  // Find docs in the same category for sidebar
  const categoryDocs =
    groupedDocs.find((group) => group.category === doc.frontmatter.category)
      ?.docs || [];

  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex gap-12">
          <DocsSidebar currentDoc={doc} />

          {/* Main Content */}
          <article className="flex-1 max-w-4xl">
            {/* Mobile breadcrumb */}
            <div className="lg:hidden mb-6">
              <Button variant="ghost" asChild className="gap-2">
                <Link href="/docs">
                  <ArrowLeft className="size-4" />
                  All Docs
                </Link>
              </Button>
            </div>

            <header className="space-y-6 pb-8 border-b">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  <Book className="size-3 mr-1" />
                  {doc.frontmatter.category}
                </Badge>
                {doc.frontmatter.subcategory && (
                  <Badge variant="outline">{doc.frontmatter.subcategory}</Badge>
                )}
              </div>

              <Typography variant="h1" className="text-4xl md:text-5xl">
                {doc.frontmatter.title}
              </Typography>

              <Typography variant="lead" className="text-muted-foreground">
                {doc.frontmatter.description}
              </Typography>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                {doc.readingTime.text}
              </div>

              {doc.frontmatter.tags && doc.frontmatter.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {doc.frontmatter.tags.map((tag) => (
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
                source={doc.content}
                options={{
                  mdxOptions: {
                    remarkPlugins,
                    rehypePlugins,
                  },
                }}
              />
            </div>

            {/* Navigation Footer */}
            <footer className="pt-8 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previous Doc */}
                {(() => {
                  const currentIndex = categoryDocs.findIndex(
                    (d) => d.slug === doc.slug,
                  );
                  const prevDoc =
                    currentIndex > 0 ? categoryDocs[currentIndex - 1] : null;

                  return prevDoc ? (
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <Link
                          href={`/docs/${prevDoc.slug}`}
                          className="flex items-center gap-3"
                        >
                          <ArrowLeft className="size-5 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Previous
                            </div>
                            <div className="font-medium">
                              {prevDoc.frontmatter.title}
                            </div>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}

                {/* Next Doc */}
                {(() => {
                  const currentIndex = categoryDocs.findIndex(
                    (d) => d.slug === doc.slug,
                  );
                  const nextDoc =
                    currentIndex < categoryDocs.length - 1
                      ? categoryDocs[currentIndex + 1]
                      : null;

                  return nextDoc ? (
                    <Card className="hover:shadow-md transition-shadow md:ml-auto">
                      <CardContent className="p-4">
                        <Link
                          href={`/docs/${nextDoc.slug}`}
                          className="flex items-center gap-3 text-right"
                        >
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                              Next
                            </div>
                            <div className="font-medium">
                              {nextDoc.frontmatter.title}
                            </div>
                          </div>
                          <ArrowRight className="size-5 text-muted-foreground" />
                        </Link>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}
              </div>

              {/* Help CTA */}
              <div className="mt-8 text-center">
                <Typography variant="muted" className="mb-4">
                  Was this page helpful?
                </Typography>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" asChild>
                    <Link href="/contact">Contact Support</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/help">
                      <FileText className="size-4 mr-2" />
                      Browse Help Center
                    </Link>
                  </Button>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}
