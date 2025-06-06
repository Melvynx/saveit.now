import { useSearchParams } from "next/navigation";
import { Link, LinkProps, useNavigate } from "react-router";

export const LinkWithQuery = ({ children, to, ...props }: LinkProps) => {
  const searchParams = useSearchParams();

  return (
    <Link to={to + "?" + searchParams.toString()} {...props}>
      {children}
    </Link>
  );
};

export const useNavigateWithQuery = () => {
  const navigate = useNavigate();
  const searchParams = useSearchParams();

  return (to: string) => {
    navigate(to + "?" + searchParams.toString());
  };
};
