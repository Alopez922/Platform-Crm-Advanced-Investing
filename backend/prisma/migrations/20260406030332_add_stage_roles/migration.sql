-- CreateEnum
CREATE TYPE "StageRole" AS ENUM ('ENTRY', 'CONTACTED', 'FOLLOW_UP', 'WON', 'LOST', 'DEFAULT');

-- AlterTable
ALTER TABLE "lead_stages" ADD COLUMN     "role" "StageRole" NOT NULL DEFAULT 'DEFAULT';
