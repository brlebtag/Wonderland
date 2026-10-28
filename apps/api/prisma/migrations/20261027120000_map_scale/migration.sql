-- Mapas criados antes da escala em km: assume 17 km por célula (escala continental)
-- e rotação do planeta e ventos como os da Terra (de oeste para leste).
UPDATE "StoryMap"
SET "data" = json_set(
  "data",
  '$.meta',
  json_object(
    'widthKm', json_extract("data", '$.width') * 17,
    'heightKm', json_extract("data", '$.height') * 17,
    'rotation', 'prograde',
    'winds', 'prograde'
  )
)
WHERE json_extract("data", '$.meta') IS NULL;
