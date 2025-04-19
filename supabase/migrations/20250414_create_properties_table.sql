-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;

-- Create properties table
create table if not exists public.properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text not null,
  area integer not null check (area > 0),
  bedrooms integer not null check (bedrooms >= 0),
  bathrooms integer not null check (bathrooms >= 0),
  status text not null check (status in ('vacant', 'rented')),
  rent numeric(10, 2) not null check (rent > 0),
  value numeric(12, 2) not null check (value > 0),
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_properties_updated_at
  before update on public.properties
  for each row
  execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.properties enable row level security;

-- Create policies
create policy "Users can view their own properties"
  on public.properties for select
  using (auth.uid() = user_id);

create policy "Users can insert their own properties"
  on public.properties for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own properties"
  on public.properties for update
  using (auth.uid() = user_id);

create policy "Users can delete their own properties"
  on public.properties for delete
  using (auth.uid() = user_id);

-- Create indexes
DROP INDEX IF EXISTS idx_properties_user_id;
DROP INDEX IF EXISTS idx_properties_status;
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_properties_status ON public.properties(status);
