-- Optional Kilobyte cloud. The static site works with none of this applied.
-- Run it in the Supabase SQL editor on a free project, then create a public
-- storage bucket named "games".

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null check (char_length(handle) between 2 and 24),
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 280),
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id text primary key,
  owner uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  blurb text not null default '',
  description text not null default '',
  genres text[] not null default '{}',
  age text not null default 'all' check (age in ('all', '10', '13', '16')),
  engine text not null default 'javascript',
  bytes integer not null default 0 check (bytes >= 0 and bytes <= 41943040),
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  stars integer not null check (stars between 1 and 5),
  review text not null default '' check (char_length(review) <= 500),
  primary key (user_id, game_id)
);

create table if not exists public.plays (
  id bigint generated always as identity primary key,
  game_id text not null,
  user_id uuid references public.profiles (id) on delete set null,
  played_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  primary key (user_id, game_id)
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  game_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100000),
  created_at timestamptz not null default now()
);

create table if not exists public.lobbies (
  id text primary key,
  host_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  status text not null default 'open' check (status in ('open', 'live', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  message text not null check (char_length(message) <= 500),
  path text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.ratings enable row level security;
alter table public.plays enable row level security;
alter table public.favorites enable row level security;
alter table public.scores enable row level security;
alter table public.lobbies enable row level security;
alter table public.client_errors enable row level security;

create policy profiles_read on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id);

create policy games_read on public.games for select using (true);
create policy games_write on public.games for insert with check (auth.uid() = owner);
create policy games_update on public.games for update using (auth.uid() = owner);
create policy games_delete on public.games for delete using (auth.uid() = owner);

create policy ratings_read on public.ratings for select using (true);
create policy ratings_write on public.ratings for insert with check (auth.uid() = user_id);
create policy ratings_update on public.ratings for update using (auth.uid() = user_id);

create policy plays_read on public.plays for select using (true);
create policy plays_write on public.plays for insert with check (auth.uid() = user_id);

create policy favorites_read on public.favorites for select using (auth.uid() = user_id);
create policy favorites_write on public.favorites for insert with check (auth.uid() = user_id);
create policy favorites_delete on public.favorites for delete using (auth.uid() = user_id);

create policy scores_read on public.scores for select using (true);
create policy scores_write on public.scores for insert with check (auth.uid() = user_id);

create policy lobbies_read on public.lobbies for select using (true);
create policy lobbies_write on public.lobbies for insert with check (auth.uid() = host_id);
create policy lobbies_update on public.lobbies for update using (auth.uid() = host_id);

create policy errors_write on public.client_errors for insert with check (char_length(message) > 0);
create policy errors_read on public.client_errors for select using (false);

-- Storage: after creating the "games" bucket, allow a signed-in user to write
-- only under their own folder, and let anyone read. 40 MB is also enforced here.
create policy games_bucket_read on storage.objects
  for select using (bucket_id = 'games');
create policy games_bucket_write on storage.objects
  for insert with check (
    bucket_id = 'games'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy games_bucket_update on storage.objects
  for update using (bucket_id = 'games' and auth.uid()::text = (storage.foldername(name))[1]);
create policy games_bucket_delete on storage.objects
  for delete using (bucket_id = 'games' and auth.uid()::text = (storage.foldername(name))[1]);
