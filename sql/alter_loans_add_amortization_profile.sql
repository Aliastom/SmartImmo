-- Ajoute la colonne pour le profil d'amortissement (classique vs constant)
ALTER TABLE loans ADD COLUMN amortization_profile VARCHAR(16) DEFAULT 'classique';
