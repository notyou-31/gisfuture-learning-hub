create type public.app_role as enum ('super_admin','teacher','student');
create type public.resource_type as enum ('video','notes','pdf','ncert','important','revision','practice','mock');
create type public.question_type as enum ('mcq','integer');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  full_name text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  last_seen_at timestamptz,
  login_count integer not null default 0
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('teacher','super_admin'))
$$;

create or replace function public.is_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "Read own or staff reads all profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "Read own or staff reads all roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- PASSKEYS
create table public.passkeys (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  code text not null unique check (char_length(code) >= 4),
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.passkeys to authenticated;
grant all on public.passkeys to service_role;
alter table public.passkeys enable row level security;
create policy "Super admin manages passkeys" on public.passkeys for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

-- BLOCKED PHONES
create table public.blocked_phones (
  phone text primary key,
  full_name text,
  reason text,
  blocked_at timestamptz not null default now(),
  blocked_by uuid
);
grant select, delete on public.blocked_phones to authenticated;
grant all on public.blocked_phones to service_role;
alter table public.blocked_phones enable row level security;
create policy "Super admin reads blocked" on public.blocked_phones for select to authenticated using (public.has_role(auth.uid(),'super_admin'));
create policy "Super admin unblocks" on public.blocked_phones for delete to authenticated using (public.has_role(auth.uid(),'super_admin'));

-- LOGIN EVENTS
create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  phone text not null,
  full_name text,
  role public.app_role,
  created_at timestamptz not null default now()
);
grant select on public.login_events to authenticated;
grant all on public.login_events to service_role;
alter table public.login_events enable row level security;
create policy "Super admin reads sign-ins" on public.login_events for select to authenticated using (public.has_role(auth.uid(),'super_admin'));

-- SUBJECTS / CHAPTERS
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- RESOURCES
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  kind public.resource_type not null,
  title text not null,
  description text,
  url text,
  file_path text,
  file_name text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- TESTS / QUESTIONS
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  duration_minutes integer not null default 30,
  is_published boolean not null default false,
  question_count integer not null default 0,
  total_marks numeric not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  qtype public.question_type not null default 'mcq',
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer,
  correct_value numeric,
  marks numeric not null default 4,
  negative_marks numeric not null default 0,
  explanation text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  user_id uuid not null,
  answers jsonb not null default '{}'::jsonb,
  score numeric not null default 0,
  max_score numeric not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  skipped_count integer not null default 0,
  total_questions integer not null default 0,
  time_taken_seconds integer,
  submitted_at timestamptz not null default now(),
  archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid
);
create unique index attempts_one_active on public.attempts(test_id, user_id) where not archived;
create index attempts_user_idx on public.attempts(user_id);

-- NOTICES
create table public.homework (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject_id uuid references public.subjects(id) on delete set null,
  due_date date,
  file_path text,
  file_name text,
  link_url text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  is_pinned boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  exam_date date not null,
  start_time text,
  syllabus text,
  created_by uuid,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.subjects, public.chapters, public.resources, public.tests, public.questions, public.homework, public.announcements, public.exams to authenticated;
grant all on public.subjects, public.chapters, public.resources, public.tests, public.questions, public.homework, public.announcements, public.exams, public.attempts to service_role;
grant select, update, delete on public.attempts to authenticated;

alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.resources enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.homework enable row level security;
alter table public.announcements enable row level security;
alter table public.exams enable row level security;

-- members read content, staff write
create policy "Members read subjects" on public.subjects for select to authenticated using (public.is_member(auth.uid()));
create policy "Staff write subjects" on public.subjects for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Members read chapters" on public.chapters for select to authenticated using (public.is_member(auth.uid()));
create policy "Staff write chapters" on public.chapters for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Members read resources" on public.resources for select to authenticated using (public.is_member(auth.uid()));
create policy "Staff write resources" on public.resources for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Members read published tests" on public.tests for select to authenticated using ((is_published and public.is_member(auth.uid())) or public.is_staff(auth.uid()));
create policy "Staff write tests" on public.tests for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff manage questions" on public.questions for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Members read homework" on public.homework for select to authenticated using (public.is_member(auth.uid()));
create policy "Staff write homework" on public.homework for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Members read announcements" on public.announcements for select to authenticated using (public.is_member(auth.uid()));
create policy "Staff write announcements" on public.announcements for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Members read exams" on public.exams for select to authenticated using (public.is_member(auth.uid()));
create policy "Staff write exams" on public.exams for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "Own or staff read attempts" on public.attempts for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "Super admin resets attempts" on public.attempts for update to authenticated using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));
create policy "Super admin deletes attempts" on public.attempts for delete to authenticated using (public.has_role(auth.uid(),'super_admin'));

-- keep test totals in sync
create or replace function public.refresh_test_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare _tid uuid := coalesce(new.test_id, old.test_id);
begin
  update public.tests t set
    question_count = (select count(*) from public.questions q where q.test_id = _tid),
    total_marks = coalesce((select sum(marks) from public.questions q where q.test_id = _tid), 0)
  where t.id = _tid;
  return null;
end $$;
create trigger questions_totals after insert or update or delete on public.questions
  for each row execute function public.refresh_test_totals();

-- presence heartbeat
create or replace function public.touch_last_seen()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update public.profiles set last_seen_at = now() where id = auth.uid();
  return found;
end $$;

-- student-safe test fetch (no answers)
create or replace function public.get_test_for_student(_test_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t public.tests;
begin
  if auth.uid() is null or not public.is_member(auth.uid()) then raise exception 'Please sign in'; end if;
  select * into t from public.tests where id = _test_id;
  if not found or (not t.is_published and not public.is_staff(auth.uid())) then raise exception 'This test is not available'; end if;
  return jsonb_build_object(
    'test', to_jsonb(t),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'qtype', q.qtype, 'prompt', q.prompt, 'options', q.options,
        'marks', q.marks, 'negative_marks', q.negative_marks) order by q.sort, q.created_at)
      from public.questions q where q.test_id = _test_id), '[]'::jsonb),
    'existing_attempt', (select a.id from public.attempts a where a.test_id = _test_id and a.user_id = auth.uid() and not a.archived limit 1)
  );
end $$;

-- grading happens here
create or replace function public.submit_attempt(_test_id uuid, _answers jsonb, _time_taken integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.tests; q record; v_ans text; v_ok boolean;
  v_score numeric := 0; v_max numeric := 0; v_c int := 0; v_w int := 0; v_s int := 0; v_n int := 0;
  v_detail jsonb := '{}'::jsonb; v_id uuid;
begin
  if auth.uid() is null or not public.is_member(auth.uid()) then raise exception 'Please sign in'; end if;
  select * into t from public.tests where id = _test_id;
  if not found or not t.is_published then raise exception 'This test is not available'; end if;
  if exists (select 1 from public.attempts where test_id = _test_id and user_id = auth.uid() and not archived) then
    raise exception 'You have already attempted this test';
  end if;
  for q in select * from public.questions where test_id = _test_id order by sort, created_at loop
    v_n := v_n + 1; v_max := v_max + q.marks;
    v_ans := nullif(trim(coalesce(_answers ->> q.id::text, '')), '');
    if v_ans is null then
      v_s := v_s + 1; v_ok := null;
    elsif q.qtype = 'mcq' then
      v_ok := v_ans ~ '^\d+$' and v_ans::int = q.correct_index;
    else
      v_ok := v_ans ~ '^-?\d+(\.\d+)?$' and v_ans::numeric = q.correct_value;
    end if;
    if v_ok is true then v_c := v_c + 1; v_score := v_score + q.marks;
    elsif v_ok is false then v_w := v_w + 1; v_score := v_score - q.negative_marks; end if;
    v_detail := v_detail || jsonb_build_object(q.id::text, jsonb_build_object('answer', v_ans, 'correct', v_ok));
  end loop;
  insert into public.attempts(test_id, user_id, answers, score, max_score, correct_count, wrong_count, skipped_count, total_questions, time_taken_seconds)
  values (_test_id, auth.uid(), v_detail, v_score, v_max, v_c, v_w, v_s, v_n, _time_taken)
  returning id into v_id;
  return v_id;
end $$;

-- review with answers (owner or staff only, after submission)
create or replace function public.get_attempt_review(_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.attempts;
begin
  select * into a from public.attempts where id = _attempt_id;
  if not found or (a.user_id <> auth.uid() and not public.is_staff(auth.uid())) then raise exception 'Result not found'; end if;
  return jsonb_build_object(
    'attempt', to_jsonb(a),
    'test', (select to_jsonb(t) from public.tests t where t.id = a.test_id),
    'questions', coalesce((select jsonb_agg(to_jsonb(q) order by q.sort, q.created_at) from public.questions q where q.test_id = a.test_id), '[]'::jsonb)
  );
end $$;

-- public leaderboard (names + scores only)
create or replace function public.get_leaderboard(_test_id uuid default null)
returns table(rank bigint, full_name text, total_score numeric, tests_taken bigint, accuracy numeric)
language sql stable security definer set search_path = public as $$
  select rank() over (order by sum(a.score) desc) as rank,
         p.full_name, sum(a.score) as total_score, count(*) as tests_taken,
         round(100.0 * sum(a.correct_count) / nullif(sum(a.correct_count + a.wrong_count), 0), 1) as accuracy
  from public.attempts a
  join public.profiles p on p.id = a.user_id
  join public.user_roles r on r.user_id = a.user_id and r.role = 'student'
  where not a.archived and (_test_id is null or a.test_id = _test_id)
  group by p.id, p.full_name
  order by total_score desc
  limit 100
$$;
create or replace function public.get_leaderboard_tests()
returns table(id uuid, title text)
language sql stable security definer set search_path = public as $$
  select id, title from public.tests where is_published order by created_at desc
$$;
grant execute on function public.get_leaderboard(uuid) to anon, authenticated;
grant execute on function public.get_leaderboard_tests() to anon, authenticated;

-- storage policies
create policy "Members read school files" on storage.objects for select to authenticated
  using (bucket_id = 'school-files' and public.is_member(auth.uid()));
create policy "Staff upload school files" on storage.objects for insert to authenticated
  with check (bucket_id = 'school-files' and public.is_staff(auth.uid()));
create policy "Staff update school files" on storage.objects for update to authenticated
  using (bucket_id = 'school-files' and public.is_staff(auth.uid()));
create policy "Staff delete school files" on storage.objects for delete to authenticated
  using (bucket_id = 'school-files' and public.is_staff(auth.uid()));

-- seed Class 10 subjects
insert into public.subjects (name, slug, sort) values
  ('Mathematics','maths',1),('Science','science',2),('Social Science','social-science',3),
  ('English','english',4),('Hindi','hindi',5),('Information Technology','it',6);

insert into public.chapters (subject_id, name, sort)
select s.id, v.name, v.sort from public.subjects s join (values
  ('maths','Real Numbers',1),('maths','Polynomials',2),('maths','Pair of Linear Equations in Two Variables',3),
  ('maths','Quadratic Equations',4),('maths','Arithmetic Progressions',5),('maths','Triangles',6),
  ('maths','Coordinate Geometry',7),('maths','Introduction to Trigonometry',8),('maths','Some Applications of Trigonometry',9),
  ('maths','Circles',10),('maths','Areas Related to Circles',11),('maths','Surface Areas and Volumes',12),
  ('maths','Statistics',13),('maths','Probability',14),
  ('science','Chemical Reactions and Equations',1),('science','Acids, Bases and Salts',2),('science','Metals and Non-metals',3),
  ('science','Carbon and its Compounds',4),('science','Life Processes',5),('science','Control and Coordination',6),
  ('science','How do Organisms Reproduce?',7),('science','Heredity',8),('science','Light – Reflection and Refraction',9),
  ('science','The Human Eye and the Colourful World',10),('science','Electricity',11),
  ('science','Magnetic Effects of Electric Current',12),('science','Our Environment',13),
  ('social-science','History: The Rise of Nationalism in Europe',1),('social-science','History: Nationalism in India',2),
  ('social-science','History: The Making of a Global World',3),('social-science','History: The Age of Industrialisation',4),
  ('social-science','History: Print Culture and the Modern World',5),('social-science','Geography: Resources and Development',6),
  ('social-science','Geography: Forest and Wildlife Resources',7),('social-science','Geography: Water Resources',8),
  ('social-science','Geography: Agriculture',9),('social-science','Geography: Minerals and Energy Resources',10),
  ('social-science','Geography: Manufacturing Industries',11),('social-science','Geography: Lifelines of National Economy',12),
  ('social-science','Political Science: Power Sharing',13),('social-science','Political Science: Federalism',14),
  ('social-science','Political Science: Gender, Religion and Caste',15),('social-science','Political Science: Political Parties',16),
  ('social-science','Political Science: Outcomes of Democracy',17),('social-science','Economics: Development',18),
  ('social-science','Economics: Sectors of the Indian Economy',19),('social-science','Economics: Money and Credit',20),
  ('social-science','Economics: Globalisation and the Indian Economy',21),('social-science','Economics: Consumer Rights',22)
) as v(slug, name, sort) on s.slug = v.slug;