import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { getEnv } from "./env.js";
import { parseRole } from "./roles.js";

const env = getEnv();

const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});

export async function getLocalUser(clerkUserId: string) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  // Always fetch the latest user information from Clerk.
  // This keeps the local email synced with the actual Clerk account.
  const clerkUser = await clerkClient.users.getUser(clerkUserId);

  const email =
    clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;

  const displayName =
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ") ||
    clerkUser.username ||
    null;

  // Keep an existing local role.
  // For a new user, use the role from Clerk metadata.
  const role =
    existingUser?.role ??
    parseRole(clerkUser.publicMetadata?.role);

  const [syncedUser] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email,
      displayName,
      role,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email,
        displayName,
        updatedAt: new Date(),
      },
    })
    .returning();

  return syncedUser;
}