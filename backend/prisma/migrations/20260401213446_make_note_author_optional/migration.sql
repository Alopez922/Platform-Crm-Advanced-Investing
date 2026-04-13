-- DropForeignKey
ALTER TABLE "lead_notes" DROP CONSTRAINT "lead_notes_authorId_fkey";

-- AlterTable
ALTER TABLE "lead_notes" ALTER COLUMN "authorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
