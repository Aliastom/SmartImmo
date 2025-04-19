-- Créer la table leases sans supprimer les tables existantes
CREATE TABLE IF NOT EXISTS public.leases (
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

-- Créer le déclencheur pour la mise à jour automatique
DROP TRIGGER IF EXISTS handle_leases_updated_at ON public.leases;
CREATE TRIGGER handle_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Activer la sécurité au niveau des lignes
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- Créer les politiques de sécurité
DROP POLICY IF EXISTS "Users can view their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can insert their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can update their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can delete their own leases" ON public.leases;

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
CREATE INDEX IF NOT EXISTS idx_leases_user_id ON public.leases(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON public.leases(property_id);

-- Modifier la table des locataires pour supprimer les colonnes obsolètes
ALTER TABLE public.tenants DROP COLUMN IF EXISTS property_id;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS lease_start;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS lease_end;
