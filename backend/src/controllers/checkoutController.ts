import type { Request, Response, NextFunction } from "express";
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

export async function createCheckout(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Only signed-in users can checkout
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

    const localUser = await getLocalUser(userId);

    if (!localUser) {
      res.status(503).json({
        error: "Account not synced yet",
      });
      return;
    }

    const ids = parsed.data.items.map((item) => item.productId);

    // Load active products from database
    const prodRows = await db
      .select()
      .from(products)
      .where(
        and(
          inArray(products.id, ids),
          eq(products.active, true),
        ),
      );

    if (prodRows.length !== ids.length) {
      res.status(400).json({
        error: "One or more products are invalid",
      });
      return;
    }

    const byId = new Map(
      prodRows.map((product) => [product.id, product]),
    );

    let totalCents = 0;

    const lines: CheckoutSessionLine[] = [];

    for (const line of parsed.data.items) {
      const product = byId.get(line.productId);

      if (!product) {
        res.status(400).json({
          error: "Product not found",
        });
        return;
      }

      totalCents += product.priceCents * line.quantity;

      lines.push({
        productId: product.id,
        quantity: line.quantity,
        unitPriceCents: product.priceCents,
      });
    }

    if (totalCents <= 0) {
      res.status(400).json({
        error: "Invalid checkout amount",
      });
      return;
    }

    // Create checkout session for tracking
    const [session] = await db
      .insert(checkoutSessions)
      .values({
        userId: localUser.id,
        lines,
        totalCents,
        currency: "inr",
      })
      .returning();

    /*
     * DEMO / CASH ON DELIVERY CHECKOUT
     *
     * No real payment is processed.
     * The order is created as "paid"
     * to preserve the same flow as local development.
     */
    const [order] = await db
      .insert(orders)
      .values({
        userId: localUser.id,
        status: "paid",
        totalCents,
        polarCheckoutId: null,
      })
      .returning();

    // Create order items
    if (lines.length > 0) {
      await db.insert(orderItems).values(
        lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
        })),
      );
    }

    // Checkout session is no longer needed
    await db
      .delete(checkoutSessions)
      .where(eq(checkoutSessions.id, session.id));

    /*
     * Redirect to orders page.
     *
     * Demo checkout:
     * No payment gateway is involved.
     */
    res.json({
      checkoutUrl: `${process.env.FRONTEND_URL}/orders`,
      orderId: order.id,
      status: "paid",
    });
  } catch (e) {
    next(e);
  }
}