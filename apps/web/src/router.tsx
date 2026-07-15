import { createRouter } from "@tanstack/react-router";
import { DefaultError } from "./components/default-error";
import { DefaultNotFound } from "./components/default-not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultErrorComponent: DefaultError,
    defaultNotFoundComponent: DefaultNotFound,
  });
}
