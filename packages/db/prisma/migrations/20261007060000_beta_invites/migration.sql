-- CreateTable
CREATE TABLE "BetaInvite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaRedemption" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaInvite_code_key" ON "BetaInvite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BetaRedemption_clerkUserId_key" ON "BetaRedemption"("clerkUserId");

-- CreateIndex
CREATE INDEX "BetaRedemption_inviteId_idx" ON "BetaRedemption"("inviteId");

-- AddForeignKey
ALTER TABLE "BetaRedemption" ADD CONSTRAINT "BetaRedemption_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "BetaInvite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

