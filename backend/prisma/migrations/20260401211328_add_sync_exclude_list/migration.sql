-- CreateTable
CREATE TABLE "sync_exclude_list" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "fullName" TEXT,
    "reason" TEXT NOT NULL DEFAULT 'PERMANENTLY_DELETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_exclude_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_exclude_list_companyId_email_idx" ON "sync_exclude_list"("companyId", "email");

-- CreateIndex
CREATE INDEX "sync_exclude_list_companyId_phone_idx" ON "sync_exclude_list"("companyId", "phone");

-- AddForeignKey
ALTER TABLE "sync_exclude_list" ADD CONSTRAINT "sync_exclude_list_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
