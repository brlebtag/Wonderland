-- AlterTable
ALTER TABLE "Event" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Event" ADD COLUMN "locationKind" TEXT;

-- CreateTable
CREATE TABLE "Ethnicity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#8a6ad8',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Ethnicity_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoryMap_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Character_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Character_ethnicityId_fkey" FOREIGN KEY ("ethnicityId") REFERENCES "Ethnicity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("attributes", "createdAt", "deletedAt", "id", "name", "nickname", "storyId", "updatedAt") SELECT "attributes", "createdAt", "deletedAt", "id", "name", "nickname", "storyId", "updatedAt" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE INDEX "Character_storyId_idx" ON "Character"("storyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Ethnicity_storyId_idx" ON "Ethnicity"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryMap_storyId_key" ON "StoryMap"("storyId");

