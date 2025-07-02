import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { APP_LINKS } from "@/lib/app-links";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

export default async function RouteLayout() {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            You are not authorized to access this page.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={APP_LINKS.signin}>Sign in</Link>
        </CardFooter>
      </Card>
      <Footer />
    </div>
  );
}
