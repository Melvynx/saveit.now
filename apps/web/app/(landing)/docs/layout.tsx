import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { getGroupedDocs } from "@/lib/mdx/docs-manager";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const groupedDocs = await getGroupedDocs();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <DocsSidebar groupedDocs={groupedDocs} />
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
