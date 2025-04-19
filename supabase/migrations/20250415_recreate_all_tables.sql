-- Supprimer les tables existantes (dans l'ordre inverse des dépendances)
DROP TABLE IF EXISTS public.leases;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.properties;

-- Recréer la table properties
CREATE TABLE public.properties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text,
  country text DEFAULT 'France',
  property_type text NOT NULL,
  rooms integer,
  area numeric(10, 2),
  rent numeric(10, 2) NOT NULL CHECK (rent > 0),
  status text DEFAULT 'vacant' CHECK (status IN ('vacant', 'rented')),
  purchase_date date,
  purchase_price numeric(10, 2),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Recréer la table tenants
CREATE TABLE public.tenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Recréer la table leases
CREATE TABLE public.leases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  lease_start date NOT NULL,
  lease_end date,
  rent numeric(10, 2) NOT NULL CHECK (rent > 0),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, property_id)
);

-- Créer la fonction de mise à jour automatique
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Créer les déclencheurs pour chaque table
DROP TRIGGER IF EXISTS handle_properties_updated_at ON public.properties;
CREATE TRIGGER handle_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_tenants_updated_at ON public.tenants;
CREATE TRIGGER handle_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_leases_updated_at ON public.leases;
CREATE TRIGGER handle_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Activer la sécurité au niveau des lignes pour toutes les tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;

DROP POLICY IF EXISTS "Users can view their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can insert their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete their own tenants" ON public.tenants;

DROP POLICY IF EXISTS "Users can view their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can insert their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can update their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can delete their own leases" ON public.leases;

-- Créer les nouvelles politiques pour properties
CREATE POLICY "Users can view their own properties"
  ON public.properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
  ON public.properties FOR DELETE
  USING (auth.uid() = user_id);

-- Créer les nouvelles politiques pour tenants
CREATE POLICY "Users can view their own tenants"
  ON public.tenants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenants"
  ON public.tenants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenants"
  ON public.tenants FOR DELETE
  USING (auth.uid() = user_id);

-- Créer les nouvelles politiques pour leases
CREATE POLICY "Users can view their own leases"
  ON public.leases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leases"
  ON public.leases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leases"
  ON public.leases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leases"
  ON public.leases FOR DELETE
  USING (auth.uid() = user_id);

-- Créer les index pour améliorer les performances
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX idx_tenants_last_name ON public.tenants(last_name);
CREATE INDEX idx_leases_user_id ON public.leases(user_id);
CREATE INDEX idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX idx_leases_property_id ON public.leases(property_id);
