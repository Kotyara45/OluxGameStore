create table games (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  genre text,
  price int4,
  author text,
  release_year int4,
  specs text,
  img_url text,
  description text,
  created_at timestamp with time zone default now()
);

create table support_messages (
  id uuid default uuid_generate_v4() primary key,
  message text not null,
  is_from_admin boolean default false,
  created_at timestamp with time zone default now()
);

create table admin_status (
  id int primary key default 1,
  is_online boolean default false
);

insert into admin_status (id, is_online) values (1, false) on conflict (id) do nothing;
