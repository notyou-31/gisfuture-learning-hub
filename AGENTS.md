<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (GISFuture)
- Sign-in is phone number + passkey only (no OTP): `phoneSignIn` server fn validates the passkey with the admin client, creates the user with a synthetic email from `phoneToAuthEmail`, rotates a random password and returns session tokens for `supabase.auth.setSession`. Why: Cloud Auth needs an email credential; public sign-up is disabled so the passkey cannot be bypassed.
- Roles live only in `user_roles`; the passkey used on first sign-in fixes the role, and a phone can never switch role. The first account ever created becomes super admin.
- Students never read `questions` directly; tests load via `get_test_for_student` and are graded in `submit_attempt` (SQL, security definer). Why: answers must never reach the browser before submission.
- "Reattempt" archives the attempt (`archived = true`) instead of deleting it; leaderboard and reports only count non-archived attempts.
- Study files live in the private `school-files` bucket and are opened through short-lived signed URLs (`src/lib/files.ts`).
