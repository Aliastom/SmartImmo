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
  city text not null,
  postal_code text,
  country text default 'France',
  property_type text not null,
  rooms integer,
  area numeric(10, 2),
  rent numeric(10, 2) not null check (rent > 0),
  status text default 'vacant' check (status in ('vacant', 'rented')),
  purchase_date date,
  purchase_price numeric(10, 2),
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

-- Create trigger for properties
DROP TRIGGER IF EXISTS handle_properties_updated_at ON public.properties;
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
