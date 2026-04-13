-- AlterTable
ALTER TABLE "company_sheet_connections" ADD COLUMN     "sheetTabs" JSONB NOT NULL DEFAULT '[]';
