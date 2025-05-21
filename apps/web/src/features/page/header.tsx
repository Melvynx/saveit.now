import { getUser } from "@/lib/auth-session";

import Link from "next/link";
import { ModeToggle } from "../dark-mode/mode-toggle";
import { HeaderUser } from "./header-user";
import { MaxWidthContainer } from "./page";

export const Header = async () => {
  const user = await getUser();

  return (
    <header className="border-b py-2 bg-background">
      <MaxWidthContainer className="flex items-center gap-2 px-4">
        <div className="border bg-muted/50 hover:bg-muted/80 transition rounded-sm px-2 py-0.5">
          <Link href="/app">
            SaveIt<span className="text-primary font-bold">.now</span>
          </Link>
        </div>
        <div className="flex-1"></div>
        <ModeToggle />
        <HeaderUser />
      </MaxWidthContainer>
    </header>
  );
};
