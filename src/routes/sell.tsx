import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL — kept so old links keep working after the SEO-friendly rename. */
export const Route = createFileRoute("/sell")({
  beforeLoad: () => {
    throw redirect({ to: "/sell-your-phone", statusCode: 301 });
  },
});
