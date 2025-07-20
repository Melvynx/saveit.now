import { useSearchParams } from "next/navigation";
import { PostHogErrorBoundary } from "posthog-js/react";
import { Link, LinkProps, useNavigate } from "react-router";

export const LinkWithQueryInner = ({ children, to, ...props }: LinkProps) => {
  const searchParams = useSearchParams();

  return (
    <Link to={to + "?" + searchParams.toString()} {...props}>
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
  const searchParams = useSearchParams();

  return (to: string) => {
    navigate(to + "?" + searchParams.toString());
  };
};
