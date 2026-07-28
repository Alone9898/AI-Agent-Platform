/*
  Warnings:

  - You are about to drop the column `api_key_id` on the `agents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "models" ADD COLUMN "api_key_value" TEXT;
ALTER TABLE "models" ADD COLUMN "provider_key" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system_prompt" TEXT,
    "model_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "agents_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_agents" ("created_at", "description", "id", "model_id", "name", "system_prompt", "updated_at") SELECT "created_at", "description", "id", "model_id", "name", "system_prompt", "updated_at" FROM "agents";
DROP TABLE "agents";
ALTER TABLE "new_agents" RENAME TO "agents";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
