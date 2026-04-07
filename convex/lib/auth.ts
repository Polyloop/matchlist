import { QueryCtx, MutationCtx } from "../_generated/server";

function extractOrgId(identity: Record<string, unknown>): string | undefined {
  // Clerk + Convex puts org info in identity.o.id
  const o = identity.o as { id?: string } | undefined;
  if (o?.id) return o.id;
  // Fallback: check top-level org_id
  if (typeof identity.org_id === "string") return identity.org_id;
  return undefined;
}

function extractOrgName(identity: Record<string, unknown>): string {
  const o = identity.o as { slg?: string } | undefined;
  return o?.slg || "Untitled";
}

export async function requireOrg(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const clerkOrgId = extractOrgId(identity as Record<string, unknown>);
  if (!clerkOrgId) throw new Error("Organization required");

  const org = await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .first();

  if (org) return { orgId: org._id, clerkOrgId };

  // Auto-create org on first access (mutation context only)
  if ("insert" in ctx.db) {
    const mutCtx = ctx as MutationCtx;
    const orgId = await mutCtx.db.insert("organizations", {
      clerkOrgId,
      name: extractOrgName(identity as Record<string, unknown>),
    });
    return { orgId, clerkOrgId };
  }

  throw new Error("Organization not found");
}

export async function getOrg(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const clerkOrgId = extractOrgId(identity as Record<string, unknown>);
  if (!clerkOrgId) return null;

  const org = await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .first();

  return org ? { orgId: org._id, clerkOrgId } : null;
}
