import { useSearchParams as useNextSearchParams } from "next/navigation";
import { usePathname } from "next/navigation";
import { PostHogErrorBoundary } from "posthog-js/react";
import {
  Link,
  LinkProps,
  useNavigate,
  useSearchParams as useRouterSearchParams,
} from "react-router";

export const LinkWithQueryInner = ({ children, to, ...props }: LinkProps) => {
  const nextSearchParams = useNextSearchParams();
  const [routerSearchParams] = useRouterSearchParams();
  const pathname = usePathname();
  const isAgentsPage = pathname === "/app/agents";

  const bookmarkMatch =
    typeof to === "string" ? to.match(/^\/app\/b\/(.+)$/) : null;

  if (isAgentsPage && bookmarkMatch?.[1]) {
    const bookmarkId = bookmarkMatch[1];
    const newParams = new URLSearchParams(routerSearchParams.toString());
    newParams.set("b", bookmarkId);
    return (
      <Link to={`/app/agents?${newParams.toString()}`} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      to={to + "?" + nextSearchParams.toString()}
      state={isAgentsPage ? { from: "agents" } : undefined}
      {...props}
    >
      {children}
    </Link>
  );
};

export const LinkWithQuery = (props: LinkProps) => {
  return (
    <PostHogErrorBoundary fallback={props.children}>
      <LinkWithQueryInner {...props} />
    </PostHogErrorBoundary>
  );
};

export const useNavigateWithQuery = () => {
  const navigate = useNavigate();
  const searchParams = useNextSearchParams();
  const pathname = usePathname();
  const isAgentsPage = pathname === "/app/agents";

  return (to: string, options?: { preserveState?: boolean }) => {
    const state = isAgentsPage ? { from: "agents" } : undefined;
    navigate(to + "?" + searchParams.toString(), {
      state: options?.preserveState === false ? undefined : state,
    });
  };
};
