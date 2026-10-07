#!/usr/bin/env node
/**
 * Beta invite links for invite-only launch mode.
 *
 *   pnpm beta:invite create --label "Maya, Atlanta" [--uses 1] [--days 30]
 *   pnpm beta:invite list
 *   pnpm beta:invite revoke <code>
 *
 * Runs against the DATABASE_URL in apps/web/.env.local (see package.json).
 * Prints the full link using NEXT_PUBLIC_APP_URL, or --base https://porobook.com.
 */
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../packages/db/node_modules/@prisma/client");
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

function makeCode(len = 10) {
  // Unambiguous lowercase alphabet, no 0/o/1/l.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function baseUrl() {
  const base = flag("base", process.env.NEXT_PUBLIC_APP_URL || "https://porobook.com");
  return base.replace(/\/$/, "");
}

async function main() {
  if (cmd === "create") {
    const label = flag("label");
    if (!label) throw new Error('--label "who this is for" is required');
    const maxUses = Number(flag("uses", "1"));
    const days = flag("days");
    const expiresAt = days ? new Date(Date.now() + Number(days) * 86400_000) : null;
    const invite = await prisma.betaInvite.create({
      data: { code: makeCode(), label, maxUses, expiresAt },
    });
    console.log(`\nInvite for ${invite.label}`);
    console.log(`  ${baseUrl()}/invite/${invite.code}`);
    console.log(`  uses: ${invite.maxUses}  expires: ${expiresAt ? expiresAt.toDateString() : "never"}\n`);
    return;
  }

  if (cmd === "list") {
    const invites = await prisma.betaInvite.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    });
    if (invites.length === 0) {
      console.log("No invites yet. Create one: pnpm beta:invite create --label \"Name\"");
      return;
    }
    for (const i of invites) {
      const status = i.revokedAt
        ? "revoked"
        : i.expiresAt && i.expiresAt < new Date()
          ? "expired"
          : i._count.redemptions >= i.maxUses
            ? "used up"
            : "open";
      console.log(
        `${i.code}  ${status.padEnd(8)}  ${i._count.redemptions}/${i.maxUses} used  ${i.label}  ${baseUrl()}/invite/${i.code}`
      );
    }
    return;
  }

  if (cmd === "revoke") {
    const code = args[1];
    if (!code) throw new Error("usage: revoke <code>");
    await prisma.betaInvite.update({ where: { code }, data: { revokedAt: new Date() } });
    console.log(`Revoked ${code}. Anyone who already redeemed it keeps access.`);
    return;
  }

  console.log(`usage:
  pnpm beta:invite create --label "Name" [--uses 1] [--days 30] [--base https://porobook.com]
  pnpm beta:invite list
  pnpm beta:invite revoke <code>`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
