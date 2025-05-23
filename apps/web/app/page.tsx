import { LandingHero } from "@/features/marketing/landing-hero";
import { StopFolder } from "@/features/marketing/stop-folder";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";

export default function Home() {
  return (
    <div>
      <Header />
      <LandingHero />
      <StopFolder />
      <Footer />
    </div>
  );
}
