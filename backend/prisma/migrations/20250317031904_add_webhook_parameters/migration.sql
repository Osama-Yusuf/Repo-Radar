-- CreateTable
CREATE TABLE "webhook_parameters" (
    "id" SERIAL NOT NULL,
    "action_id" INTEGER NOT NULL,
    "branch" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_parameters_action_id_branch_name_key" ON "webhook_parameters"("action_id", "branch", "name");

-- AddForeignKey
ALTER TABLE "webhook_parameters" ADD CONSTRAINT "webhook_parameters_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
