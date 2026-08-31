import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { useState } from "react";

import { AuthShell } from "@/components/admin/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset staff password | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "Request a password reset link for the Phone Shop Ormskirk staff shop system.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Reset staff password | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Request a password reset link for the staff shop system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    // Always show the same confirmation so we never reveal which emails exist.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    setSent(true);
  }

  return (
    <AuthShell
      title="Forgotten password"
      subtitle="Phone Shop Ormskirk — staff only"
      footer={
        <Link to="/auth" className="font-semibold underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="admin-card space-y-3 p-6 text-center">
          <MailCheck className="mx-auto size-8 text-primary" />
          <p className="text-sm font-bold">Check your email</p>
          <p className="text-sm text-muted-foreground">
            If an account exists for that email we&rsquo;ve sent password reset
            instructions. The link stays valid for a short time only.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="admin-card space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
