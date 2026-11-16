import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, KeyRound, Phone, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSetupStatus, phoneSignIn } from "@/lib/auth.functions";
import { Brand } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — GISFuture" },
      { name: "description", content: "Sign in to GISFuture with your phone number and school passkey." },
      { property: "og:title", content: "Sign in — GISFuture" },
      { property: "og:description", content: "Gayatri International School students and teachers sign in here." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signIn = useServerFn(phoneSignIn);
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: () => getSetupStatus() });
  const needsSetup = setup.data?.needsSetup ?? false;

  const [phone, setPhone] = useState("");
  const [passkey, setPasskey] = useState("");
  const [fullName, setFullName] = useState("");
  const [askName, setAskName] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const showName = askName || needsSetup;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn({ data: { phone, passkey, fullName: showName ? fullName : undefined } });
      if (!res.ok) {
        if (res.needsName) {
          setAskName(true);
          setError("Welcome! Looks like this is your first visit — please enter your full name.");
        } else setError(res.error ?? "Sign-in failed.");
        return;
      }
      const { error: sErr } = await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      if (sErr) throw sErr;
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Signed in");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-foreground lg:flex">
        <Brand tone="light" />
        <div>
          <h2 className="text-4xl font-semibold leading-tight">
            One phone number.<br />One account.<br /><span className="text-saffron">Every chapter.</span>
          </h2>
          <p className="mt-4 max-w-sm text-ink-foreground/70">
            Students and teachers have different passkeys. Ask your class teacher or the school office for yours.
          </p>
        </div>
        <p className="text-xs text-ink-foreground/50">Gayatri International School · GISFuture</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12 paper-grid">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <div className="rounded-3xl border bg-card p-7 shadow-soft sm:p-9">
            {needsSetup ? (
              <div className="mb-6">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-saffron-soft px-3 py-1 text-xs font-semibold text-saffron-foreground">
                  <ShieldCheck className="size-3.5" /> First-time setup
                </div>
                <h1 className="text-3xl font-semibold">Create the super admin</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  You're the first person here, so this account will control GISFuture. Choose a master key — you'll use it to sign in from now on.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <h1 className="text-3xl font-semibold">Sign in</h1>
                <p className="mt-2 text-sm text-muted-foreground">Use your mobile number and the passkey from your school.</p>
              </div>
            )}

            <form method="post" onSubmit={onSubmit} className="space-y-4">
              <Field label="Mobile number">
                <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                  <span className="flex items-center gap-1.5 border-r px-3 text-sm text-muted-foreground">
                    <Phone className="size-4" /> +91
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="h-10 w-full bg-transparent px-3 text-sm outline-none"
                  />
                </div>
              </Field>

              {showName && (
                <Field label="Full name">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Aarav Sharma" className="h-10 pl-9" />
                  </div>
                </Field>
              )}

              <Field label={needsSetup ? "Create master key" : "Passkey"} hint={needsSetup ? "At least 6 characters. Keep it private." : undefined}>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    required
                    type={show ? "text" : "password"}
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    className="h-10 pl-9 pr-10"
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide passkey" : "Show passkey"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              {error && <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!hydrated || busy || setup.isLoading}>
                {busy ? "Please wait…" : needsSetup ? "Create super admin" : "Continue"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Each mobile number can have only one account.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
