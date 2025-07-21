import { useSearchParams, useRouter } from "next/navigation";
import { PostHogErrorBoundary } from "posthog-js/react";
import Link from "next/link";
import { ComponentProps } from "react";

type LinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { to: string };

export const LinkWithQueryInner = ({ children, to, ...props }: LinkProps) => {
  const searchParams = useSearchParams();

  return (
    <Link href={to + "?" + searchParams.toString()} {...props}>
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
  const router = useRouter();
  const searchParams = useSearchParams();

  return (to: string) => {
    router.push(to + "?" + searchParams.toString());
  };
};
