-- Script pour corriger les incohérences entre les biens et les baux
-- Exécuter ce script pour synchroniser l'état des biens avec les baux

-- 1. Mettre à jour tous les biens qui sont marqués comme disponibles mais qui ont un bail actif
UPDATE properties
SET status = 'rented'
WHERE id IN (
  SELECT property_id FROM leases
  WHERE lease_end IS NULL OR lease_end > CURRENT_DATE
)
AND status = 'vacant';

-- 2. Mettre à jour tous les biens qui sont marqués comme loués mais qui n'ont pas de bail actif
UPDATE properties
SET status = 'vacant'
WHERE id NOT IN (
  SELECT property_id FROM leases
  WHERE lease_end IS NULL OR lease_end > CURRENT_DATE
)
AND status = 'rented';

-- 3. Supprimer les baux qui ont une date de fin dans le passé
DELETE FROM leases
WHERE lease_end < CURRENT_DATE;

-- 4. Vérifier et corriger les incohérences dans les ID utilisateur
-- S'assurer que tous les baux ont le même ID utilisateur que le bien associé
UPDATE leases
SET user_id = (
  SELECT user_id FROM properties WHERE properties.id = leases.property_id
)
WHERE user_id != (
  SELECT user_id FROM properties WHERE properties.id = leases.property_id
);

-- 5. S'assurer que tous les baux ont le même ID utilisateur que le locataire associé
UPDATE leases
SET user_id = (
  SELECT user_id FROM tenants WHERE tenants.id = leases.tenant_id
)
WHERE user_id != (
  SELECT user_id FROM tenants WHERE tenants.id = leases.tenant_id
);
