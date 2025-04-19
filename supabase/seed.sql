-- Insérer un bien de test
insert into public.properties (
  name,
  address,
  area,
  bedrooms,
  bathrooms,
  rent,
  value,
  status,
  image_url,
  user_id
) values (
  'Appartement Lumineux',
  '123 Avenue des Champs-Élysées, Paris',
  75,
  2,
  1,
  1200,
  350000,
  'vacant',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3',
  auth.uid() -- Ceci insérera automatiquement l'ID de l'utilisateur connecté
);
