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
  // First check our local database
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existingUser) {
    return existingUser;
  }

  // User is authenticated in Clerk but not synced to our DB yet.
  // Fetch the user directly from Clerk and create the local record.
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

  const role = parseRole(clerkUser.publicMetadata?.role);

  const [createdUser] = await db
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

  return createdUser;
}