import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting checklist status migration...");

  // 1. Create ChecklistStatus enum if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ChecklistStatus" AS ENUM ('PENDING', 'REQUESTED', 'RECEIVED', 'REVIEWING', 'REVISION', 'COMPLETED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("ChecklistStatus enum created or already exists");

  // 2. Add status column if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist"
    ADD COLUMN IF NOT EXISTS "status" "ChecklistStatus" NOT NULL DEFAULT 'PENDING';
  `);
  console.log("status column added");

  // 3. Migrate data: isChecked=true -> COMPLETED, isChecked=false -> PENDING
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "Checklist"
    SET "status" = CASE
      WHEN "isChecked" = true THEN 'COMPLETED'::"ChecklistStatus"
      ELSE 'PENDING'::"ChecklistStatus"
    END
    WHERE "isChecked" IS NOT NULL;
  `);
  console.log(`Migrated ${result} rows`);

  // 4. Add new columns for status tracking
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist"
    ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist"
    ADD COLUMN IF NOT EXISTS "statusChangedById" TEXT;
  `);
  console.log("statusChangedAt and statusChangedById columns added");

  // 5. Copy data from old columns to new columns
  await prisma.$executeRawUnsafe(`
    UPDATE "Checklist"
    SET
      "statusChangedAt" = "checkedAt",
      "statusChangedById" = "checkedById"
    WHERE "checkedAt" IS NOT NULL OR "checkedById" IS NOT NULL;
  `);
  console.log("Copied data from old columns to new columns");

  // 6. Drop old columns
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist" DROP COLUMN IF EXISTS "isChecked";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist" DROP COLUMN IF EXISTS "checkedAt";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist" DROP COLUMN IF EXISTS "checkedById";
  `);
  console.log("Dropped old columns");

  // 7. Add foreign key constraint
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist"
    DROP CONSTRAINT IF EXISTS "Checklist_statusChangedById_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Checklist"
    ADD CONSTRAINT "Checklist_statusChangedById_fkey"
    FOREIGN KEY ("statusChangedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  `);
  console.log("Foreign key constraint added");

  console.log("Migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
