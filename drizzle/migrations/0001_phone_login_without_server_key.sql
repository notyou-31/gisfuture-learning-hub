create table public.phone_logins (
  phone text primary key check (phone ~ '^[6-9][0-9]{9}$'),
  user_id uuid unique,
  role public.app_role not null,
  full_name text not null,
  secret text not null,
  setup_passkey text,
  created_at timestamptz not null default now()
);
grant all on public.phone_logins to service_role;
alter table public.phone_logins enable row level security;
-- No policies: only the security-definer functions below read or write this table.

insert into public.phone_logins (phone, user_id, role, full_name, secret)
select p.phone, p.id, r.role, p.full_name, encode(extensions.gen_random_bytes(24), 'hex')
from public.profiles p
join lateral (select ur.role from public.user_roles ur where ur.user_id = p.id limit 1) r on true
where p.phone ~ '^[6-9][0-9]{9}$'
on conflict do nothing;

create or replace function public.portal_needs_setup()
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.user_roles where role = 'super_admin')
$$;
revoke all on function public.portal_needs_setup() from public;
grant execute on function public.portal_needs_setup() to anon, authenticated;

create or replace function public.phone_login(_phone text, _passkey text, _full_name text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_setup boolean;
  v_role public.app_role;
  v_row public.phone_logins;
  v_name text := nullif(btrim(coalesce(_full_name, '')), '');
  v_pass text := btrim(coalesce(_passkey, ''));
  v_label text;
  v_email text;
begin
  if _phone is null or _phone !~ '^[6-9][0-9]{9}$' then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid 10-digit mobile number.');
  end if;
  if v_pass = '' or length(v_pass) > 100 then
    return jsonb_build_object('ok', false, 'error', 'Enter your passkey.');
  end if;
  if exists (select 1 from public.blocked_phones where phone = _phone) then
    return jsonb_build_object('ok', false, 'error', 'This number has been removed by the school administrator.');
  end if;

  v_email := 'p' || _phone || '@phone.gisfuture.app';
  v_setup := not exists (select 1 from public.user_roles where role = 'super_admin');
  if v_setup then
    if length(v_pass) < 6 then
      return jsonb_build_object('ok', false, 'error', 'Choose a master key of at least 6 characters.');
    end if;
    v_role := 'super_admin';
  else
    select role into v_role from public.passkeys where code = v_pass and is_active limit 1;
    if v_role is null then
      return jsonb_build_object('ok', false, 'error', 'That passkey is not valid. Ask your school for the current key.');
    end if;
  end if;

  select * into v_row from public.phone_logins where phone = _phone for update;

  if found then
    if v_row.role <> v_role then
      v_label := case when v_row.role = 'super_admin' then 'super admin' else v_row.role::text end;
      return jsonb_build_object('ok', false, 'error',
        format('This number is already registered as a %s. Use the %s passkey.', v_label, v_label));
    end if;

    -- Account row vanished (or registration never finished): start a fresh registration.
    if v_row.user_id is null or not exists (select 1 from auth.users where id = v_row.user_id) then
      update public.phone_logins
        set user_id = null,
            secret = encode(extensions.gen_random_bytes(24), 'hex'),
            full_name = coalesce(v_name, full_name),
            setup_passkey = case when v_setup then v_pass else null end
        where phone = _phone
        returning * into v_row;
      return jsonb_build_object('ok', true, 'mode', 'signup', 'email', v_email, 'password', v_row.secret);
    end if;

    -- Removed earlier and since unblocked: restore access with the same role.
    if not exists (select 1 from public.profiles where id = v_row.user_id) then
      insert into public.profiles (id, phone, full_name)
        values (v_row.user_id, _phone, coalesce(v_name, v_row.full_name))
        on conflict (id) do nothing;
      insert into public.user_roles (user_id, role) values (v_row.user_id, v_row.role)
        on conflict do nothing;
    end if;

    return jsonb_build_object('ok', true, 'mode', 'signin', 'email', v_email, 'password', v_row.secret);
  end if;

  if v_name is null or length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'needsName', true);
  end if;
  if length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'Name is too long.');
  end if;

  insert into public.phone_logins (phone, role, full_name, secret, setup_passkey)
    values (_phone, v_role, v_name, encode(extensions.gen_random_bytes(24), 'hex'),
            case when v_setup then v_pass else null end)
    returning * into v_row;

  return jsonb_build_object('ok', true, 'mode', 'signup', 'email', v_email, 'password', v_row.secret);
end $$;
revoke all on function public.phone_login(text, text, text) from public;
grant execute on function public.phone_login(text, text, text) to anon, authenticated;

-- Only numbers that just passed phone_login, using the exact code they were given, can create an account.
create or replace function public.guard_phone_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone text;
  v_row public.phone_logins;
begin
  v_phone := substring(new.email from '^p([6-9][0-9]{9})@phone\.gisfuture\.app$');
  if v_phone is null then
    raise exception 'Accounts can only be created from the GISFuture sign-in page';
  end if;
  select * into v_row from public.phone_logins where phone = v_phone;
  if not found or v_row.user_id is not null then
    raise exception 'Sign-up not allowed for this number';
  end if;
  if new.encrypted_password is null or new.encrypted_password = ''
     or extensions.crypt(v_row.secret, new.encrypted_password) <> new.encrypted_password then
    raise exception 'Sign-up not allowed for this number';
  end if;
  return new;
end $$;
revoke all on function public.guard_phone_signup() from public, anon, authenticated;

create or replace function public.finish_phone_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone text;
  v_row public.phone_logins;
begin
  v_phone := substring(new.email from '^p([6-9][0-9]{9})@phone\.gisfuture\.app$');
  select * into v_row from public.phone_logins where phone = v_phone;
  if not found then return new; end if;
  update public.phone_logins set user_id = new.id, setup_passkey = null where phone = v_phone;
  insert into public.profiles (id, phone, full_name) values (new.id, v_phone, v_row.full_name)
    on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, v_row.role)
    on conflict do nothing;
  if v_row.role = 'super_admin' and v_row.setup_passkey is not null then
    insert into public.passkeys (role, code, label) values ('super_admin', v_row.setup_passkey, 'Master key')
      on conflict (code) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.finish_phone_signup() from public, anon, authenticated;

drop trigger if exists guard_phone_signup on auth.users;
create trigger guard_phone_signup before insert on auth.users
  for each row execute function public.guard_phone_signup();
drop trigger if exists finish_phone_signup on auth.users;
create trigger finish_phone_signup after insert on auth.users
  for each row execute function public.finish_phone_signup();

create or replace function public.record_login()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_p public.profiles;
  v_role public.app_role;
begin
  if auth.uid() is null then return; end if;
  update public.profiles
    set last_login_at = now(), last_seen_at = now(), login_count = login_count + 1
    where id = auth.uid()
    returning * into v_p;
  if not found then return; end if;
  select role into v_role from public.user_roles where user_id = auth.uid() limit 1;
  insert into public.login_events (user_id, phone, full_name, role)
    values (auth.uid(), v_p.phone, v_p.full_name, v_role);
end $$;
revoke all on function public.record_login() from public, anon;
grant execute on function public.record_login() to authenticated;

create or replace function public.remove_member(_user_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_p public.profiles;
begin
  if not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'Only the super admin can do this.';
  end if;
  if _user_id = auth.uid() then
    raise exception 'You cannot remove yourself.';
  end if;
  select * into v_p from public.profiles where id = _user_id;
  if found then
    insert into public.blocked_phones (phone, full_name, reason, blocked_by)
      values (v_p.phone, v_p.full_name, left(_reason, 200), auth.uid())
      on conflict (phone) do update
        set full_name = excluded.full_name, reason = excluded.reason,
            blocked_by = excluded.blocked_by, blocked_at = now();
  end if;
  delete from public.attempts where user_id = _user_id;
  delete from public.user_roles where user_id = _user_id;
  delete from public.profiles where id = _user_id;
end $$;
revoke all on function public.remove_member(uuid, text) from public, anon;
grant execute on function public.remove_member(uuid, text) to authenticated;