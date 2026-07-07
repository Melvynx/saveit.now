import {
  Link,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { PostHogErrorBoundary } from "posthog-js/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkWithQueryProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  to: string;
  children?: ReactNode;
};

export const LinkWithQueryInner = ({
  children,
  to,
  ...props
}: LinkWithQueryProps) => {
  const routerSearchParams = useSearch({ strict: false });
  const pathname = useLocation().pathname;
  const isAgentsPage = pathname === "/app/agents";

  const bookmarkMatch =
    typeof to === "string" ? to.match(/^\/app\/b\/(.+)$/) : null;

  if (isAgentsPage && bookmarkMatch?.[1]) {
    const bookmarkId = bookmarkMatch[1];

    return (
      <Link
        to="/app/agents"
        search={(previous) => ({ ...previous, b: bookmarkId }) as any}
        resetScroll={false}
        {...props}
      >
        {children}
      </Link>
    );
  }

  if (bookmarkMatch?.[1]) {
    const bookmarkId = bookmarkMatch[1];

    return (
      <Link
        to="/app"
        search={(previous) => ({ ...previous, bookmarkId }) as any}
        mask={{
          to: "/app/b/$bookmarkId",
          params: { bookmarkId },
          unmaskOnReload: true,
        }}
        resetScroll={false}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link to={to as any} search={routerSearchParams as any} {...props}>
      {children}
    </Link>
  );
};

export const LinkWithQuery = (props: LinkWithQueryProps) => {
  return (
    <PostHogErrorBoundary fallback={<>{props.children}</>}>
      <LinkWithQueryInner {...props} />
    </PostHogErrorBoundary>
  );
};

export const useNavigateWithQuery = () => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const pathname = useLocation().pathname;
  const isAgentsPage = pathname === "/app/agents";

  return (to: string, options?: { preserveState?: boolean }) => {
    const state = isAgentsPage ? { from: "agents" } : undefined;
    void state;
    void options;
    void navigate({
      to: to as any,
      search: searchParams as any,
    });
  };
};
