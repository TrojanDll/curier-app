-- CreateTable
CREATE TABLE "app_releases" (
    "id" UUID NOT NULL,
    "version_code" INTEGER NOT NULL,
    "version_name" TEXT NOT NULL,
    "release_notes" TEXT,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "git_commit" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_releases_version_code_key" ON "app_releases"("version_code");
