-- Création de la table des régimes fiscaux immobiliers
CREATE TABLE IF NOT EXISTS property_regimes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  location_type VARCHAR(100),
  rental_type VARCHAR(100),
  revenue_threshold VARCHAR(100),
  flat_deduction VARCHAR(100),
  real_expenses_deduction BOOLEAN,
  property_amortization BOOLEAN,
  capital_gain_duration VARCHAR(100),
  accounting_type VARCHAR(100),
  advantages TEXT,
  disadvantages TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajout d'une colonne à la table des propriétés pour stocker le régime fiscal
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_regime_id UUID REFERENCES property_regimes(id);

-- Vider la table des régimes fiscaux pour éviter les doublons
TRUNCATE TABLE property_regimes CASCADE;

-- Insertion des données de base pour les régimes fiscaux
INSERT INTO property_regimes (name, location_type, rental_type, revenue_threshold, flat_deduction, real_expenses_deduction, property_amortization, capital_gain_duration, accounting_type, advantages, disadvantages) VALUES
('Location nue - Micro-foncier', 'Non meublée', 'Pas de limite', '15 000 €/an', '30%', false, false, 'Exonération (RP)', 'Micro', 'Simple, pas de paperasse', 'Pas d''amortissement'),
('Location nue - Réel', 'Non meublée', 'Pas de limite', 'Pas de limite', 'Non', true, false, 'Exonération (RP)', 'Réel', 'Déduction charges réelles', 'Pas d''amortissement'),
('LMNP - Micro-BIC', 'Meublée', '< 77 700 €/an', '< 77 700 €/an', '50%', false, false, 'Exonération (RP)', 'Micro', 'Simple, abattement élevé', 'Pas d''amortissement'),
('LMNP - Réel simplifié', 'Meublée', '< 77 700 €/an', '< 77 700 €/an', 'Non', true, true, 'Exonération (RP)', 'Réel', 'Amortissement possible, charges déductibles', 'Comptabilité plus complexe'),
('LMNP - Réel normal', 'Meublée', '> 77 700 €/an', '> 77 700 €/an', 'Non', true, true, 'Exonération (RP)', 'Réel', 'Amortissement possible, charges déductibles', 'Comptabilité complexe'),
('LMP', 'Meublée', '> 23 000 € et > 50% des revenus', '> 23 000 € et > 50% des revenus', 'Non', true, true, 'Exonération sous conditions', 'Réel', 'Imputation fiscale, statut professionnel', 'Imposition sociale, cotisations'),
('Para-hôtelière', 'Non meublée', 'Pas de limite', 'Pas de limite', 'Non', true, true, 'Taxée', 'Réel', 'Récupération TVA, statut professionnel', 'Pas d''amortissement, imposition classique'),
('SCI à l''IS', 'Non meublée', 'Pas de limite', 'Pas de limite', 'Non', true, true, 'Taxée', 'Réel [IS]', 'Transparence fiscale, statut en famille', 'Pas d''amortissement, imposition classique'),
('SCPI', 'Non meublée', 'Pas de location directe', 'Pas de limite', 'Non', true, false, 'Taxée', 'Réel', 'Gestion passive', 'Pas de levier, rendement'),
('Pinel', 'Non meublée', 'Plafonds de loyers', 'Pas de limite', 'Non', true, false, 'Réduction d''impôt', 'Réel', 'Réduction fiscale pendant engagement', 'Pas de levier, plafonds'),
('Malraux', 'Non meublée', 'Pas de location directe N/A', 'Pas de limite', 'Non', true, false, 'Réduction d''impôt', 'Réel', 'Réduction fiscale importante', 'Contraintes architecturales');

-- Création d'un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_properties_regime ON properties(property_regime_id);
