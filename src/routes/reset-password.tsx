import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell, PasswordInput } from "@/components/admin/AuthShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/admin/db";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Phone Shop Ormskirk" },
      {
        name: "description",
        content: "Choose a new password for your Phone Shop Ormskirk staff account.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Set a new password | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Choose a new password for your staff account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkValid, setLinkValid] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase turns the recovery link into a session as the page loads.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setLinkValid(Boolean(data.session));
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setLinkValid(true);
        setReady(true);
      }
    });
    void check();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || mismatch) return;
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Your password has been updated successfully.");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="New password"
      subtitle="Phone Shop Ormskirk — staff only"
      footer={
        <Link to="/auth" className="font-semibold underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!ready ? (
        <div className="admin-card grid h-40 place-items-center p-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : done ? (
        <div className="admin-card space-y-4 p-6 text-center">
          <CheckCircle2 className="mx-auto size-8 text-primary" />
          <p className="text-sm font-bold">Your password has been updated successfully.</p>
          <Button className="w-full" size="lg" onClick={() => navigate({ to: "/admin" })}>
            Go to the shop system
          </Button>
        </div>
      ) : !linkValid ? (
        <div className="admin-card space-y-3 p-6 text-center">
          <p className="text-sm font-bold">This reset link is no longer valid</p>
          <p className="text-sm text-muted-foreground">
            Reset links expire after a short time. Request a fresh one and try again.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="admin-card space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            {tooShort && (
              <p className="text-xs font-semibold text-primary">
                Please use at least 8 characters.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            {mismatch && (
              <p className="text-xs font-semibold text-primary">
                Both passwords need to match.
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || password.length < 8 || password !== confirm}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
