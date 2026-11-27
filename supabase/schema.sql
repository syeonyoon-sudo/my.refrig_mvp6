-- 냉장고 한 끼: 사용자별 데이터 테이블
-- Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여 넣고 Run 을 누르세요.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 행 단위 보안(RLS): 로그인한 본인 데이터만 읽고 쓸 수 있음
alter table public.user_data enable row level security;

drop policy if exists "본인 데이터 조회" on public.user_data;
drop policy if exists "본인 데이터 추가" on public.user_data;
drop policy if exists "본인 데이터 수정" on public.user_data;
drop policy if exists "본인 데이터 삭제" on public.user_data;

create policy "본인 데이터 조회" on public.user_data for select using (auth.uid() = user_id);
create policy "본인 데이터 추가" on public.user_data for insert with check (auth.uid() = user_id);
create policy "본인 데이터 수정" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "본인 데이터 삭제" on public.user_data for delete using (auth.uid() = user_id);
