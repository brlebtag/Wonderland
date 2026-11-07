-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tag_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterTag" (
    "characterId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("characterId", "tagId"),
    CONSTRAINT "CharacterTag_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- Copia as tags que estavam no JSON de cada personagem: uma tag por nome na história
-- (sem diferenciar maiúsculas) e um vínculo por personagem.
INSERT INTO "Tag" ("id", "storyId", "name", "createdAt", "updatedAt")
SELECT 'c' || lower(hex(randomblob(12))), "storyId", MIN("name"),
       CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM (
  SELECT c."storyId", trim(j.value) AS "name"
  FROM "Character" c, json_each(c."tags") j
  WHERE c."tags" IS NOT NULL AND trim(j.value) <> ''
)
GROUP BY "storyId", lower("name");

INSERT OR IGNORE INTO "CharacterTag" ("characterId", "tagId")
SELECT c."id", t."id"
FROM "Character" c, json_each(c."tags") j
JOIN "Tag" t ON t."storyId" = c."storyId" AND lower(t."name") = lower(trim(j.value))
WHERE c."tags" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "attributes" JSONB NOT NULL,
    "ethnicityId" TEXT,
    "birthLocationKind" TEXT,
    "birthLocationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Character_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Character_ethnicityId_fkey" FOREIGN KEY ("ethnicityId") REFERENCES "Ethnicity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("attributes", "birthLocationId", "birthLocationKind", "createdAt", "deletedAt", "ethnicityId", "id", "name", "nickname", "storyId", "updatedAt") SELECT "attributes", "birthLocationId", "birthLocationKind", "createdAt", "deletedAt", "ethnicityId", "id", "name", "nickname", "storyId", "updatedAt" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE INDEX "Character_storyId_idx" ON "Character"("storyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tag_storyId_name_key" ON "Tag"("storyId", "name");

-- CreateIndex
CREATE INDEX "CharacterTag_tagId_idx" ON "CharacterTag"("tagId");

