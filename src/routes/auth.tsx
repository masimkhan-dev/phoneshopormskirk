import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell, PasswordInput } from "@/components/admin/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/admin/db";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "Private staff sign in for the Phone Shop Ormskirk counter and shop management system.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Staff sign in | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Private staff sign in for the Phone Shop Ormskirk shop system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          // Generic wording for bad credentials so we never confirm which emails exist.
          throw new Error(
            error.status === 400 || /invalid login/i.test(error.message)
              ? "Incorrect email or password."
              : friendlyError(error),
          );
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/admin" });
      } else {
        toast.success("Check your email to confirm the account, then sign in.");
        setMode("signin");
      }
    } catch (error) {
      const message = friendlyError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Shop system"
      subtitle="Phone Shop Ormskirk — staff only"
      footer={
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setFormError(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin"
            ? "First time here? Create the owner account"
            : "Already have an account? Sign in"}
        </button>
      }
    >
      <form onSubmit={onSubmit} className="admin-card space-y-4 p-6" noValidate>
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
        )}
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
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            {mode === "signin" && (
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Forgotten password?
              </Link>
            )}
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>
        {formError && (
          <p role="alert" className="text-sm font-semibold text-primary">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create staff account"}
        </Button>
      </form>
    </AuthShell>
  );
}
