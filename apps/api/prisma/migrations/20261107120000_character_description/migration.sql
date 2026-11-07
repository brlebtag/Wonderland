-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
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

