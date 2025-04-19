-- Create leases table (relation entre locataires et biens)
create table if not exists public.leases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  lease_start date not null,
  lease_end date,
  rent numeric(10, 2) not null check (rent > 0),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Contrainte unique pour éviter les doublons
  unique(tenant_id, property_id)
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

create trigger handle_leases_updated_at
  before update on public.leases
  for each row
  execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.leases enable row level security;

-- Create policies
create policy "Users can view their own leases"
  on public.leases for select
  using (auth.uid() = user_id);

create policy "Users can insert their own leases"
  on public.leases for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own leases"
  on public.leases for update
  using (auth.uid() = user_id);

create policy "Users can delete their own leases"
  on public.leases for delete
  using (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_leases_user_id ON public.leases(user_id);
CREATE INDEX idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX idx_leases_property_id ON public.leases(property_id);

-- Modifier la table des locataires pour supprimer la référence directe aux biens
ALTER TABLE public.tenants DROP COLUMN IF EXISTS property_id;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS lease_start;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS lease_end;
