import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/phone";

type LoginGrant =
  | { ok: true; mode: "signin" | "signup"; email: string; password: string }
  | { ok: false; needsName?: boolean; error?: string };

export type PhoneSignInResult = { ok: true } | { ok: false; needsName?: boolean; error?: string };

/** Is the portal waiting for its first (super admin) account? */
export async function getSetupStatus() {
  const { data, error } = await supabase.rpc("portal_needs_setup");
  if (error) throw error;
  return { needsSetup: data === true };
}

/**
 * Phone + passkey sign-in. The database checks the passkey, blocked numbers and role lock
 * (`phone_login`), then hands back this number's private sign-in code.
 */
export async function signInWithPhone(input: { phone: string; passkey: string; fullName?: string | undefined }): Promise<PhoneSignInResult> {
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "Enter a valid 10-digit mobile number." };

  const name = input.fullName?.trim();
  const { data, error } = await supabase.rpc("phone_login", {
    _phone: phone,
    _passkey: input.passkey.trim(),
    ...(name ? { _full_name: name } : {}),
  });
  if (error) {
    console.error("phone_login failed", error);
    return { ok: false, error: "Could not reach the school server. Please try again." };
  }
  const grant = data as unknown as LoginGrant;
  if (!grant.ok) return grant;

  if (grant.mode === "signup") {
    const { data: up, error: upErr } = await supabase.auth.signUp({ email: grant.email, password: grant.password });
    if (upErr || !up.session) {
      console.error("signUp failed", upErr);
      return { ok: false, error: "Could not create your account. Please try again." };
    }
  } else {
    const { error: inErr } = await supabase.auth.signInWithPassword({ email: grant.email, password: grant.password });
    if (inErr) {
      console.error("signIn failed", inErr);
      return { ok: false, error: "Sign-in failed. Please try again." };
    }
  }
  await supabase.rpc("record_login");
  return { ok: true };
}
