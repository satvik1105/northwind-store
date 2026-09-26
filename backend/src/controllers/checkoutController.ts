import type { Request, Response, NextFunction } from "express";
import { getEnv } from "../lib/env";
import z from "zod";
import { getAuth } from "@clerk/express";
import { getLocalUser } from "../lib/users";
import { db } from "../db";
import {
  CheckoutSessionLine,
  checkoutSessions,
  orderItems,
  orders,
  products,
} from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { polarCreateCheckout } from "../lib/polar";

const env = getEnv();

const cartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function createCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    // Only signed-in users can start checkout
    const { userId, isAuthenticated } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = cartSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid cart",
        details: parsed.error.flatten(),
      });
      return;
    }

    // In production, Polar payment configuration is required.
    // In development, we use a local test checkout instead.
    if (env.NODE_ENV !== "development" && !env.POLAR_ACCESS_TOKEN) {
      res.status(503).json({ error: "Payments are not configured" });
      return;
    }

    const localUser = await getLocalUser(userId);

    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const ids = parsed.data.items.map((i) => i.productId);

    // Load every cart product that exists, is active,
    // and matches the IDs we asked for.
    const prodRows = await db
      .select()
      .from(products)
      .where(and(inArray(products.id, ids), eq(products.active, true)));

    if (prodRows.length !== ids.length) {
      res.status(400).json({ error: "One or more products are invalid" });
      return;
    }

    const byId = new Map(prodRows.map((p) => [p.id, p]));

    let totalCents = 0;
    const lines: CheckoutSessionLine[] = [];

    for (const line of parsed.data.items) {
      const p = byId.get(line.productId)!;

      totalCents += p.priceCents * line.quantity;

      lines.push({
        productId: p.id,
        quantity: line.quantity,
        unitPriceCents: p.priceCents,
      });
    }

    if (totalCents < 10) {
      res.status(400).json({
        error: "Total below minimum checkout amount",
      });
      return;
    }

    // Create a checkout session first.
    const [session] = await db
      .insert(checkoutSessions)
      .values({
        userId: localUser.id,
        lines,
        totalCents,
        currency: "usd",
      })
      .returning();

    // ---------------------------------------------------------
    // LOCAL DEVELOPMENT CHECKOUT
    // ---------------------------------------------------------
    // No real payment is processed in development.
    // This creates a paid test order so we can test:
    // Orders -> Support Chat -> Video.
    if (env.NODE_ENV === "development") {
      const [order] = await db
        .insert(orders)
        .values({
          userId: localUser.id,
          status: "paid",
          totalCents,
          polarCheckoutId: null,
        })
        .returning();

      if (lines.length) {
        await db.insert(orderItems).values(
          lines.map((line) => ({
            orderId: order.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
          })),
        );
      }

      // The checkout session is no longer needed
      // because the local test order has been created.
      await db
        .delete(checkoutSessions)
        .where(eq(checkoutSessions.id, session.id));

      res.json({
        checkoutUrl: `${env.FRONTEND_URL}/orders`,
      });

      return;
    }

    // ---------------------------------------------------------
    // PRODUCTION POLAR CHECKOUT
    // ---------------------------------------------------------

    const successUrl =
      `${env.FRONTEND_URL}/checkout/return?checkout_id={CHECKOUT_ID}`;

    const returnUrl = `${env.FRONTEND_URL}/cart`;

    const checkout = await polarCreateCheckout(env, {
      products: [env.POLAR_CHECKOUT_PRODUCT_ID!],
      prices: {
        [env.POLAR_CHECKOUT_PRODUCT_ID!]: [
          {
            amount_type: "fixed",
            price_currency: "usd",
            price_amount: totalCents,
          },
        ],
      },

      success_url: successUrl,
      return_url: returnUrl,
      external_customer_id: userId,
      metadata: {
        checkout_session_id: session.id,
      },
    });

    await db
      .update(checkoutSessions)
      .set({
        polarCheckoutId: checkout.id,
      })
      .where(eq(checkoutSessions.id, session.id));

    res.json({
      checkoutUrl: checkout.url,
    });
  } catch (e) {
    next(e);
  }
}