import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") + "Aa1!";
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Public: is the school portal set up yet (does a super admin exist)? */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await getAdmin();
  const { count } = await admin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin");
  return { needsSetup: (count ?? 0) === 0 };
});

const signInSchema = z.object({
  phone: z.string().min(1).max(20),
  passkey: z.string().trim().min(1).max(100),
  fullName: z.string().trim().max(80).optional(),
});

type SignInResult =
  | { ok: true; access_token: string; refresh_token: string; role: Role }
  | { ok: false; needsName?: boolean; error?: string };

/** Public: sign in (or register on first visit) with phone number + passkey. */
export const phoneSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signInSchema.parse(input))
  .handler(async ({ data }): Promise<SignInResult> => {
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, error: "Enter a valid 10-digit mobile number." };
    const admin = await getAdmin();

    const { data: blocked } = await admin.from("blocked_phones").select("phone").eq("phone", phone).maybeSingle();
    if (blocked) return { ok: false, error: "This number has been removed by the school administrator." };

    const { count: superCount } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    const setupMode = (superCount ?? 0) === 0;

    let role: Role;
    if (setupMode) {
      if (data.passkey.length < 6) return { ok: false, error: "Choose a master key of at least 6 characters." };
      role = "super_admin";
    } else {
      const { data: key } = await admin
        .from("passkeys")
        .select("role")
        .eq("code", data.passkey)
        .eq("is_active", true)
        .maybeSingle();
      if (!key) return { ok: false, error: "That passkey is not valid. Ask your school for the current key." };
      role = key.role;
    }

    const { data: profile } = await admin.from("profiles").select("id, full_name").eq("phone", phone).maybeSingle();
    let userId: string;
    let fullName: string;

    if (profile) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", profile.id);
      const existing = roles?.[0]?.role;
      if (existing && existing !== role) {
        const label = existing === "super_admin" ? "super admin" : existing;
        return { ok: false, error: `This number is already registered as a ${label}. Use the ${label} passkey.` };
      }
      userId = profile.id;
      fullName = profile.full_name;
    } else {
      if (!data.fullName || data.fullName.length < 2) return { ok: false, needsName: true };
      fullName = data.fullName;
      const { data: created, error } = await admin.auth.admin.createUser({
        email: phoneToAuthEmail(phone),
        password: randomPassword(),
        email_confirm: true,
        user_metadata: { full_name: fullName, phone },
      });
      if (error || !created.user) {
        console.error("createUser failed", error);
        return { ok: false, error: "Could not create your account. Please try again." };
      }
      userId = created.user.id;
      const { error: pErr } = await admin.from("profiles").insert({ id: userId, phone, full_name: fullName });
      if (pErr) {
        await admin.auth.admin.deleteUser(userId);
        return { ok: false, error: "This number is already registered." };
      }
      await admin.from("user_roles").insert({ user_id: userId, role });
      if (setupMode) {
        await admin.from("passkeys").insert({ role: "super_admin", code: data.passkey, label: "Master key" });
      }
    }

    // Rotate a one-time password and exchange it for a session.
    const password = randomPassword();
    const { error: upErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (upErr) {
      console.error("updateUser failed", upErr);
      return { ok: false, error: "Sign-in failed. Please try again." };
    }
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const pub = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: sess, error: sErr } = await pub.auth.signInWithPassword({ email: phoneToAuthEmail(phone), password });
    if (sErr || !sess.session) {
      console.error("signIn failed", sErr);
      return { ok: false, error: "Sign-in failed. Please try again." };
    }

    const { data: prof } = await admin.from("profiles").select("login_count").eq("id", userId).single();
    await admin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), login_count: (prof?.login_count ?? 0) + 1 })
      .eq("id", userId);
    await admin.from("login_events").insert({ user_id: userId, phone, full_name: fullName, role });

    return { ok: true, access_token: sess.session.access_token, refresh_token: sess.session.refresh_token, role };
  });

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!data) throw new Error("Only the super admin can do this.");
}

/** Super admin: remove a user and block their number. */
export const removeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; reason?: string }) =>
    z.object({ userId: z.string().uuid(), reason: z.string().max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot remove yourself.");
    const admin = await getAdmin();
    const { data: profile } = await admin.from("profiles").select("phone, full_name").eq("id", data.userId).maybeSingle();
    if (profile) {
      await admin.from("blocked_phones").upsert({
        phone: profile.phone,
        full_name: profile.full_name,
        reason: data.reason ?? null,
        blocked_by: context.userId,
      });
    }
    await admin.from("attempts").delete().eq("user_id", data.userId);
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Could not remove this user.");
    return { ok: true };
  });
