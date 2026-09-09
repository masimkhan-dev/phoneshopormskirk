import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const ADMIN_HOSTNAMES = new Set(["admin.phonestoreormskirk.co.uk", "admin.localhost"]);

const PUBLIC_HOSTNAMES = new Set(["phonestoreormskirk.co.uk", "www.phonestoreormskirk.co.uk"]);

function isAdminHost(hostname: string): boolean {
  return ADMIN_HOSTNAMES.has(hostname.toLowerCase());
}

function isPublicHost(hostname: string): boolean {
  return PUBLIC_HOSTNAMES.has(hostname.toLowerCase());
}

function isAuthPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return (
    p === "/auth" ||
    p.startsWith("/auth/") ||
    p === "/forgot-password" ||
    p.startsWith("/forgot-password/") ||
    p === "/reset-password" ||
    p.startsWith("/reset-password/")
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    dehydrate: (() => ({
      queryClientState: dehydrate(queryClient),
    })) as never,
    hydrate: (dehydrated: unknown) => {
      const state = dehydrated as { queryClientState?: Parameters<typeof hydrate>[1] } | undefined;
      if (state?.queryClientState) {
        hydrate(queryClient, state.queryClientState);
      }
    },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => {
        const host = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // Block admin authentication routes on public domains by rewriting to home
        if (isPublicHost(host) && isAuthPath(pathname)) {
          const nextUrl = new URL(url);
          nextUrl.pathname = "/";
          return nextUrl;
        }

        if (!isAdminHost(host)) return url;

        // Do not rewrite framework assets, server functions, auth pages, or files with extensions
        if (
          pathname.startsWith("/_") ||
          pathname.startsWith("/assets/") ||
          isAuthPath(pathname) ||
          /\.[a-zA-Z0-9]+$/.test(pathname)
        ) {
          return url;
        }

        const alreadyAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

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
