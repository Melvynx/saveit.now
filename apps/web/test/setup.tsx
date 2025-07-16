import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import { render } from "@testing-library/react";
import { userEvent, type UserEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { SearchInputProvider } from "../app/app/contexts/search-input-context";

export const setup = (
  jsx: ReactElement,
  options?: Omit<RenderOptions, "queries"> & {
    withSearchProvider?: boolean;
    onInputChange?: (query: string) => void;
  },
): RenderResult & { user: UserEvent; queryClient: QueryClient } => {
  const { withSearchProvider = true, onInputChange = () => {}, ...renderOptions } = options || {};

  // Create a new QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Wrap component with providers
  let wrappedJsx = jsx;

  if (withSearchProvider) {
    wrappedJsx = (
      <SearchInputProvider onInputChange={onInputChange}>
        {jsx}
      </SearchInputProvider>
    );
  }

  wrappedJsx = (
    <QueryClientProvider client={queryClient}>
      {wrappedJsx}
    </QueryClientProvider>
  );

  return {
    user: userEvent.setup(),
    ...render(wrappedJsx, renderOptions),
    queryClient, // Also expose the queryClient in case tests need to interact with it
  };
};

export const setupWithoutProviders = (
  jsx: ReactElement,
  options?: Omit<RenderOptions, "queries">,
): RenderResult & { user: UserEvent; queryClient: QueryClient } => {
  return setup(jsx, { ...options, withSearchProvider: false });
};