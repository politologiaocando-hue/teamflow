-- TeamFlow – Schema completo para Supabase
-- Ejecuta en: Supabase → SQL Editor → New query → Run

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null default 'engineer',
  color       text not null default 'blue',
  initials    text not null default '??',
  specialty   text,
  created_at  timestamptz default now()
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text default '',
  leader_id   uuid references public.profiles(id),
  engineer_id uuid references public.profiles(id),
  status      text not null default 'todo',
  priority    text not null default 'medium',
  impact      int  not null default 5 check (impact between 1 and 10),
  effort      int  not null default 5 check (effort between 1 and 10),
  due_date    date,
  tag         text default 'Backend',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz default now()
);

create table if not exists public.history (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  actor_id    uuid not null references public.profiles(id),
  message     text not null,
  created_at  timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role, initials)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'engineer'),
    upper(substring(coalesce(new.raw_user_meta_data->>'full_name', new.email), 1, 2))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles  enable row level security;
alter table public.tasks     enable row level security;
alter table public.comments  enable row level security;
alter table public.history   enable row level security;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
create policy "tasks_select"    on public.tasks for select using (auth.role() = 'authenticated');
create policy "tasks_insert"    on public.tasks for insert with check (auth.role() = 'authenticated');
create policy "tasks_update"    on public.tasks for update using (auth.role() = 'authenticated');
create policy "tasks_delete"    on public.tasks for delete using (auth.uid() = created_by or exists (select 1 from public.profiles where id = auth.uid() and role = 'leader'));
create policy "comments_select" on public.comments for select using (auth.role() = 'authenticated');
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "history_select"  on public.history for select using (auth.role() = 'authenticated');
create policy "history_insert"  on public.history for insert with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.history;
