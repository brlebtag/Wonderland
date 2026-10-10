-- AlterTable
ALTER TABLE "Character" ADD COLUMN "birthLocationId" TEXT;
ALTER TABLE "Character" ADD COLUMN "birthLocationKind" TEXT;


-- A ficha não tem mais "idade" (calculada pela data de nascimento) nem "lugar de nascimento"
-- em texto (agora é um local do mapa): remove os valores antigos do JSON.
UPDATE "Character" SET "attributes" = json_remove("attributes", '$.age', '$.birthPlace');
