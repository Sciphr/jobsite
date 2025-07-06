/*
  Warnings:

  - Added the required column `email` to the `applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_userId_fkey";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "name" TEXT;
ALTER TABLE "applications" ADD COLUMN "email" TEXT;
ALTER TABLE "applications" ADD COLUMN "phone" TEXT;
ALTER TABLE "applications" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
