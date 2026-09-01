import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const ADMIN_HOSTNAMES = new Set([
  "admin.phonestoreormskirk.co.uk",
  "admin.localhost",
]);

function isAdminHost(hostname: string): boolean {
  return ADMIN_HOSTNAMES.has(hostname.toLowerCase());
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => {
        if (!isAdminHost(url.hostname)) return url;

        const pathname = url.pathname;

        // Do not rewrite framework assets, server functions, auth pages, or files with extensions
        if (
          pathname.startsWith("/_") ||
          pathname.startsWith("/assets/") ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/forgot-password") ||
          pathname.startsWith("/reset-password") ||
          /\.[a-zA-Z0-9]+$/.test(pathname)
        ) {
          return url;
        }

        const alreadyAdminPath =
          pathname === "/admin" || pathname.startsWith("/admin/");

        if (!alreadyAdminPath) {
          const nextUrl = new URL(url);
          nextUrl.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
          return nextUrl;
        }

        return url;
      },
      output: ({ url }) => {
        if (!isAdminHost(url.hostname)) return url;

        const pathname = url.pathname;
        if (pathname === "/admin" || pathname === "/admin/") {
          const nextUrl = new URL(url);
          nextUrl.pathname = "/";
          return nextUrl;
        } else if (pathname.startsWith("/admin/")) {
          const nextUrl = new URL(url);
          nextUrl.pathname = pathname.slice("/admin".length);
          return nextUrl;
        }

        return url;
      },
    },
  });

  return router;
};

