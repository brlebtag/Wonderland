-- AlterTable
ALTER TABLE "Character" ADD COLUMN "tags" JSONB;


-- Personagens existentes começam sem tags.
UPDATE "Character" SET "tags" = json('[]') WHERE "tags" IS NULL;
