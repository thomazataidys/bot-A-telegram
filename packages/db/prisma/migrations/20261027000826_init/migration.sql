-- CreateEnum
CREATE TYPE "ListStatus" AS ENUM ('ASSISTINDO', 'QUERO_VER', 'COMPLETO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT,
    "username" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anime" (
    "id" TEXT NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "malId" INTEGER,
    "titleEnglish" TEXT,
    "titleRomaji" TEXT NOT NULL,
    "coverUrl" TEXT,
    "siteUrl" TEXT NOT NULL,
    "format" TEXT,
    "status" TEXT,
    "totalEpisodes" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "status" "ListStatus" NOT NULL DEFAULT 'ASSISTINDO',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiringEpisode" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "episode" INTEGER NOT NULL,
    "airingAt" TIMESTAMP(3) NOT NULL,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "AiringEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Anime_anilistId_key" ON "Anime"("anilistId");

-- CreateIndex
CREATE UNIQUE INDEX "ListEntry_userId_animeId_key" ON "ListEntry"("userId", "animeId");

-- CreateIndex
CREATE INDEX "AiringEpisode_airingAt_idx" ON "AiringEpisode"("airingAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiringEpisode_animeId_episode_key" ON "AiringEpisode"("animeId", "episode");

-- AddForeignKey
ALTER TABLE "ListEntry" ADD CONSTRAINT "ListEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListEntry" ADD CONSTRAINT "ListEntry_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiringEpisode" ADD CONSTRAINT "AiringEpisode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
