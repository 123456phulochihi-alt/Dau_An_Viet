-- Di San Sai Gon: schema ban dau
create extension if not exists pgcrypto;

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'visitor' check (role in ('visitor', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.monuments (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.regions(id),
  slug text unique not null,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  construction_period text,
  basic_info text,
  introduction text,
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.monument_tags (
  monument_id uuid not null references public.monuments(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (monument_id, tag_id)
);

create table if not exists public.monument_images (
  id uuid primary key default gen_random_uuid(),
  monument_id uuid not null references public.monuments(id) on delete cascade,
  image_url text not null,
  caption text,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.regions enable row level security;
alter table public.profiles enable row level security;
alter table public.monuments enable row level security;
alter table public.tags enable row level security;
alter table public.monument_tags enable row level security;
alter table public.monument_images enable row level security;

create policy "Public reads regions" on public.regions for select using (true);
create policy "Admins manage regions" on public.regions for all using (public.is_admin()) with check (public.is_admin());

create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Admins update profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create policy "Public reads published monuments" on public.monuments for select using (status = 'published' or public.is_admin());
create policy "Admins insert monuments" on public.monuments for insert with check (public.is_admin());
create policy "Admins update monuments" on public.monuments for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete monuments" on public.monuments for delete using (public.is_admin());

create policy "Public reads tags" on public.tags for select using (true);
create policy "Admins manage tags" on public.tags for all using (public.is_admin()) with check (public.is_admin());

create policy "Public reads monument tags" on public.monument_tags for select using (
  exists (select 1 from public.monuments m where m.id = monument_id and m.status = 'published')
  or public.is_admin()
);
create policy "Admins manage monument tags" on public.monument_tags for all using (public.is_admin()) with check (public.is_admin());

create policy "Public reads monument images" on public.monument_images for select using (
  exists (select 1 from public.monuments m where m.id = monument_id and m.status = 'published')
  or public.is_admin()
);
create policy "Admins manage monument images" on public.monument_images for all using (public.is_admin()) with check (public.is_admin());

insert into public.regions (name, code, description)
values ('Thành phố Hồ Chí Minh', 'HCMC', 'Khu vực triển khai đầu tiên của bản đồ di sản.')
on conflict (code) do nothing;

insert into public.monuments
(region_id, slug, name, address, latitude, longitude, construction_period, basic_info, introduction, image_url, status)
select
  r.id,
  'dinh-doc-lap',
  'Dinh Độc Lập',
  '135 Nam Kỳ Khởi Nghĩa, phường Bến Thành, TP. Hồ Chí Minh',
  10.7770,
  106.6953,
  '1962–1966',
  'Công trình do kiến trúc sư Ngô Viết Thụ thiết kế, là một địa điểm gắn với nhiều dấu mốc quan trọng của lịch sử Việt Nam hiện đại.',
  '',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Independence_Palace%2C_Ho_Chi_Minh_City.jpg?width=1600',
  'published'
from public.regions r
where r.code = 'HCMC'
on conflict (slug) do nothing;

insert into public.tags (name) values
('Di tích lịch sử'), ('Kiến trúc'), ('Dấu mốc 1975'), ('Biểu tượng TP.HCM')
on conflict (name) do nothing;

insert into public.monument_tags (monument_id, tag_id)
select m.id, t.id
from public.monuments m
cross join public.tags t
where m.slug = 'dinh-doc-lap'
and t.name in ('Di tích lịch sử', 'Kiến trúc', 'Dấu mốc 1975', 'Biểu tượng TP.HCM')
on conflict do nothing;

-- Tao bucket anh cong khai. Chi tai khoan admin duoc upload.
insert into storage.buckets (id, name, public)
values ('monument-images', 'monument-images', true)
on conflict (id) do nothing;

create policy "Public can view monument images"
on storage.objects for select
using (bucket_id = 'monument-images');

create policy "Admins upload monument images"
on storage.objects for insert
with check (bucket_id = 'monument-images' and public.is_admin());

create policy "Admins update monument images"
on storage.objects for update
using (bucket_id = 'monument-images' and public.is_admin())
with check (bucket_id = 'monument-images' and public.is_admin());

create policy "Admins delete monument images"
on storage.objects for delete
using (bucket_id = 'monument-images' and public.is_admin());
