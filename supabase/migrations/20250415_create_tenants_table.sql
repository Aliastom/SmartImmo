-- Create tenants table
create table if not exists public.tenants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create updated_at trigger if it doesn't exist
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger for tenants
create trigger handle_tenants_updated_at
  before update on public.tenants
  for each row
  execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.tenants enable row level security;

-- Create policies
create policy "Users can view their own tenants"
  on public.tenants for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tenants"
  on public.tenants for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tenants"
  on public.tenants for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tenants"
  on public.tenants for delete
  using (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX idx_tenants_last_name ON public.tenants(last_name);
