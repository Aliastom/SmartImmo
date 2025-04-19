-- Ajouter le champ catégorie à la table des propriétés
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Bien locatif' CHECK (category IN ('Résidence principale', 'Résidence secondaire', 'Bien locatif', 'Autre'));

-- Créer la table des emprunts
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  interest_rate numeric(5, 3) NOT NULL,
  insurance_rate numeric(5, 3),
  start_date date NOT NULL,
  end_date date,
  monthly_payment numeric(10, 2),
  remaining_capital numeric(12, 2),
  payment_day integer CHECK (payment_day >= 1 AND payment_day <= 31),
  loan_type text NOT NULL CHECK (loan_type IN ('Prêt immobilier', 'Prêt travaux', 'Prêt personnel', 'Autre')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Créer un trigger pour mettre à jour le champ updated_at
DROP TRIGGER IF EXISTS handle_loans_updated_at ON public.loans;
CREATE TRIGGER handle_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Activer Row Level Security
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Créer les politiques de sécurité
CREATE POLICY "Users can view their own loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loans"
  ON public.loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loans"
  ON public.loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loans"
  ON public.loans FOR DELETE
  USING (auth.uid() = user_id);

-- Créer les index
CREATE INDEX idx_loans_user_id ON public.loans(user_id);
CREATE INDEX idx_loans_property_id ON public.loans(property_id);
