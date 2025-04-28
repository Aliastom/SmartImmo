-- Ajoute une colonne pour le type de remboursement du prêt
ALTER TABLE loans
ADD COLUMN repayment_type VARCHAR(20) NOT NULL DEFAULT 'amortissable';

-- Valeurs possibles : 'amortissable' (classique) ou 'in_fine'
