import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Typography } from "@workspace/ui/components/typography";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="w-full md:w-1/2 flex justify-center">
            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary">
              <Image
                src="/images/melvyn.jpeg"
                alt="Melvyn, founder of SaveIt"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <Typography variant="h1" className="mb-4">
              About SaveIt
            </Typography>
            <Typography variant="lead" className="mb-6">
              Building a better way to remember the web
            </Typography>

            <div className="space-y-6">
              <Typography className="text-lg">
                We believe that bookmarks should be retrievable, fast, and
                reliable. The web is important, and the links we discover are
                valuable parts of our digital journey.
              </Typography>

              <Typography className="text-lg">
                For content creators, designers, or CEOs, we visit thousands of
                websites and should be able to remember and find them again
                without friction. That's why we built SaveIt - to make your
                digital knowledge accessible again.
              </Typography>

              <Typography className="text-lg">
                Our mission is simple: help you save everything instantly and
                find it when you need it, with powerful AI that understands what
                you're looking for even when you can't remember the exact
                keywords.
              </Typography>
            </div>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}
