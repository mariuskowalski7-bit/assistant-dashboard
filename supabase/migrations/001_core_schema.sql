-- ============================================================
-- Claude Assistant Dashboard – Core Schema
-- Minimal, clean. No overengineering.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ENTRIES
-- Single table for all user input: events, tasks, reminders, notes.
-- type column drives routing to Apple Calendar / Reminders / internal.
-- ============================================================
create table entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  type        text not null check (type in ('event', 'task', 'reminder', 'note')),
  title       text not null,
  body        text,                       -- optional longer text / note content

  -- Scheduling (nullable for notes)
  date        date,
  time        time,
  due_date    date,                       -- for tasks

  -- Status & priority
  status      text not null default 'pending'
                check (status in ('pending', 'done', 'cancelled')),
  priority    text not null default 'medium'
                check (priority in ('low', 'medium', 'high')),

  -- Context / tagging (freeform, e.g. 'Haushalt', 'Arbeit')
  context     text,

  -- Sync state for external services
  apple_id    text,                       -- CalDAV / EventKit UID once synced
  synced_at   timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger entries_updated_at
  before update on entries
  for each row execute function set_updated_at();

-- ============================================================
-- PREFERENCES
-- Key/value store for user preferences Claude reads as context.
-- e.g. key='diet', value='glutenfrei'
-- ============================================================
create table preferences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  value       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

create trigger preferences_updated_at
  before update on preferences
  for each row execute function set_updated_at();

-- ============================================================
-- CHAT_MESSAGES
-- Persists conversation history so Claude has full context.
-- ============================================================
create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  -- Structured data Claude extracted from this message (if any)
  extracted   jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Users only ever see their own data.
-- ============================================================
alter table entries        enable row level security;
alter table preferences    enable row level security;
alter table chat_messages  enable row level security;

-- Entries
create policy "entries: own data"
  on entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Preferences
create policy "preferences: own data"
  on preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Chat messages
create policy "chat_messages: own data"
  on chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES (only what's actually needed)
-- ============================================================
create index idx_entries_user_date    on entries (user_id, date);
create index idx_entries_user_status  on entries (user_id, status);
create index idx_entries_user_type    on entries (user_id, type);
create index idx_chat_messages_user   on chat_messages (user_id, created_at desc);
create index idx_preferences_user     on preferences (user_id);
