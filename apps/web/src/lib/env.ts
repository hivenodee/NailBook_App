/**
 * Environment variable validation and typed accessors.
 *
 * Call `validateEnv()` once at startup (e.g. in root layout) to surface
 * missing vars early. Optional vars log grouped warnings; missing required
 * vars throw a single error listing every gap.
 */

// ---------------------------------------------------------------------------
// Required vars — the app cannot function without these
// ---------------------------------------------------------------------------
const REQUIRED_VARS = {
  DATABASE_URL: "PostgreSQL connection string",
  CLERK_SECRET_KEY: "Clerk authentication secret",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "Clerk publishable key",
  NEXT_PUBLIC_APP_URL: "Public application URL",
  STRIPE_SECRET_KEY: "Stripe secret key",
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: "Stripe publishable key",
  STRIPE_WEBHOOK_SECRET: "Stripe webhook signing secret",
} as const;

// ---------------------------------------------------------------------------
// Optional vars — grouped by feature for clearer warnings
// ---------------------------------------------------------------------------
interface OptionalVarDef {
  description: string;
  feature: string;
}

const OPTIONAL_VARS: Record<string, OptionalVarDef> = {
  RESEND_API_KEY: { description: "Email sending (Resend)", feature: "Email" },
  EMAIL_FROM: { description: "Email from address", feature: "Email" },
  TWILIO_ACCOUNT_SID: { description: "SMS sending (Twilio)", feature: "SMS" },
  TWILIO_AUTH_TOKEN: { description: "SMS sending (Twilio)", feature: "SMS" },
  TWILIO_FROM_NUMBER: { description: "SMS from number", feature: "SMS" },
  REDIS_URL: { description: "Redis cache (Upstash)", feature: "Cache" },
  REDIS_TOKEN: { description: "Redis auth token", feature: "Cache" },
  R2_ACCOUNT_ID: { description: "Cloudflare account ID (R2)", feature: "Storage" },
  R2_ACCESS_KEY_ID: { description: "Storage access key (R2)", feature: "Storage" },
  R2_SECRET_ACCESS_KEY: { description: "Storage secret key (R2)", feature: "Storage" },
  R2_BUCKET_NAME: { description: "Storage bucket name (R2)", feature: "Storage" },
  R2_PUBLIC_URL: { description: "Storage public URL (R2)", feature: "Storage" },
  SENTRY_DSN: { description: "Error monitoring", feature: "Monitoring" },
};

// ---------------------------------------------------------------------------
// Module-level guard — ensures validation only runs once
// ---------------------------------------------------------------------------
let validated = false;

// ---------------------------------------------------------------------------
// validateEnv
// ---------------------------------------------------------------------------
export function validateEnv(): void {
  if (validated) return;
  validated = true;

  // ---- Required vars ----
  const missing: string[] = [];

  for (const [name, desc] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      missing.push(`  - ${name}: ${desc}`);
    }
  }

  // ---- Optional vars (grouped by feature) ----
  const missingByFeature: Record<string, string[]> = {};

  for (const [name, { description, feature }] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      if (!missingByFeature[feature]) {
        missingByFeature[feature] = [];
      }
      missingByFeature[feature].push(`${name} — ${description}`);
    }
  }

  if (Object.keys(missingByFeature).length > 0) {
    const lines: string[] = [
      "[env] Optional environment variables missing (features will degrade gracefully):",
    ];
    for (const [feature, vars] of Object.entries(missingByFeature)) {
      lines.push(`  ${feature}:`);
      for (const v of vars) {
        lines.push(`    - ${v}`);
      }
    }
    console.warn(lines.join("\n"));
  }

  if (missing.length > 0) {
    const message = [
      `[env] Missing ${missing.length} required environment variable(s):`,
      ...missing,
      "",
      "Set these in .env.local or your deployment environment.",
    ].join("\n");

    console.error(message);
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Typed accessors
// ---------------------------------------------------------------------------
type RequiredKey = keyof typeof REQUIRED_VARS;
type OptionalKey = keyof typeof OPTIONAL_VARS;

type EnvAccessors = {
  [K in RequiredKey]: string;
} & {
  [K in OptionalKey]: string | undefined;
};

/**
 * Typed env accessor. Required vars return `string`; optional vars return
 * `string | undefined`.
 *
 * Usage: `env.DATABASE_URL`, `env.REDIS_URL`
 */
export const env: EnvAccessors = new Proxy({} as EnvAccessors, {
  get(_target, prop: string) {
    return process.env[prop] ?? undefined;
  },
});
