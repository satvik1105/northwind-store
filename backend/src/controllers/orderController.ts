import { getAuth } from "@clerk/express";
import type { NextFunction, Response, Request } from "express";
import { getLocalUser } from "../lib/users";
import { isStaff } from "../lib/roles";
import { db } from "../db";
import { orderItems, orders, products, users } from "../db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  getStreamChatServer,
  streamChatDisplayName,
  streamUserId,
} from "../lib/stream";
import { getEnv } from "../lib/env";

const env = getEnv();

export async function listOrders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId, isAuthenticated } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const localUser = await getLocalUser(userId);

    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const rows = isStaff(localUser.role)
      ? await db.select().from(orders).orderBy(desc(orders.createdAt))
      : await db
          .select()
          .from(orders)
          .where(eq(orders.userId, localUser.id))
          .orderBy(desc(orders.createdAt));

    const orderIds = rows.map((r) => r.id);
    const previewByOrder = new Map();

    if (orderIds.length > 0) {
      const itemRows = await db
        .select({
          orderId: orderItems.orderId,
          quantity: orderItems.quantity,
          name: products.name,
          slug: products.slug,
          imageUrl: products.imageUrl,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(inArray(orderItems.orderId, orderIds))
        .orderBy(asc(orderItems.id));

      for (const row of itemRows) {
        const list = previewByOrder.get(row.orderId) ?? [];

        list.push({
          name: row.name,
          slug: row.slug,
          imageUrl: row.imageUrl,
          quantity: row.quantity,
        });

        previewByOrder.set(row.orderId, list);
      }
    }

    const ordersPayload = rows.map((o) => ({
      ...o,
      previewItems: previewByOrder.get(o.id) ?? [],
    }));

    res.json({ orders: ordersPayload });
  } catch (e) {
    next(e);
  }
}

export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId, isAuthenticated } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const localUser = await getLocalUser(userId);

    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, req.params.id as string))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const canAccess =
      order.userId === localUser.id || isStaff(localUser.role);

    if (!canAccess) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const items = await db
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        unitPriceCents: orderItems.unitPriceCents,
        product: products,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    res.json({ order, items });
  } catch (e) {
    next(e);
  }
}

export async function createStreamChannel(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId, isAuthenticated } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const server = getStreamChatServer(env);

    const localUser = await getLocalUser(userId);

    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, req.params.id as string))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const isOwner = order.userId === localUser.id;

    if (!isOwner && !isStaff(localUser.role)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (order.status !== "paid") {
      res.status(403).json({
        error: "Order must be paid to open support chat",
      });
      return;
    }

    const streamChatUserId = streamUserId(userId);

    await server.upsertUser({
      id: streamChatUserId,
      name: streamChatDisplayName(
        localUser.role,
        localUser.displayName,
        localUser.email,
      ),
    });

    const channelId = `order-${order.id}`;

    const channel = server.channel("messaging", channelId, {
      name: `Support · order ${order.id.slice(0, 8)}`,
      created_by_id: streamChatUserId,
    });

    try {
      await channel.create();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (!message.toLowerCase().includes("already exists")) {
        throw error;
      }
    }

    const state = await channel.query();

    const existingMemberIds = new Set(
      (state.members ?? [])
        .map((member) => member.user_id)
        .filter((id): id is string => Boolean(id)),
    );

    if (!existingMemberIds.has(streamChatUserId)) {
      await channel.addMembers([streamChatUserId]);
    }

    res.json({
      channelType: "messaging",
      channelId,
      streamUserId: streamChatUserId,
    });
  } catch (e) {
    console.error("STREAM CHANNEL ERROR:", e);
    next(e);
  }
}

export async function createVideoInvite(
  req: Request,
  res: Response,
) {
  try {
    const { userId, isAuthenticated } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const server = getStreamChatServer(env);

    const localUser = await getLocalUser(userId);

    if (!localUser) {
      res.status(503).json({
        error: "Account not synced yet",
      });
      return;
    }

    // Only support/admin can send video invites
    if (!isStaff(localUser.role)) {
      res.status(403).json({
        error: "Only support or admin can send a video invite",
      });
      return;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, req.params.id as string))
      .limit(1);

    if (!order || order.status !== "paid") {
      res.status(404).json({
        error: "Order not found or not paid",
      });
      return;
    }

    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, order.userId))
      .limit(1);

    if (!owner) {
      res.status(404).json({
        error: "Order owner not found",
      });
      return;
    }

    const customerSid = streamUserId(owner.clerkUserId);
    const staffStreamUserId = streamUserId(userId);

    // Make sure customer exists in Stream
    await server.upsertUser({
      id: customerSid,
      name: owner.displayName ?? owner.email ?? "Customer",
    });

    // Make sure staff/admin exists in Stream
    await server.upsertUser({
      id: staffStreamUserId,
      name: streamChatDisplayName(
        localUser.role,
        localUser.displayName,
        localUser.email,
      ),
    });

    const channelId = `order-${order.id}`;

    const channel = server.channel("messaging", channelId);

    // Create channel only if needed
    try {
      await channel.create();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (!message.toLowerCase().includes("already exists")) {
        throw error;
      }
    }

    // Check existing members before adding
    const state = await channel.query();

    const existingMemberIds = new Set(
      (state.members ?? [])
        .map((member) => member.user_id)
        .filter((id): id is string => Boolean(id)),
    );

    const membersToAdd = [
      customerSid,
      staffStreamUserId,
    ].filter(
      (id, index, array) =>
        !existingMemberIds.has(id) &&
        array.indexOf(id) === index,
    );

    if (membersToAdd.length > 0) {
      await channel.addMembers(membersToAdd);
    }

    const joinUrl = `${env.FRONTEND_URL.replace(
      /\/+$/,
      "",
    )}/orders/${order.id}/call`;

    // Send invite message
    await channel.sendMessage({
      text: `Video call — tap Join below (same link for everyone): ${joinUrl}`,
      user_id: staffStreamUserId,
      custom: {
        video_invite: true,
        join_url: joinUrl,
      },
    });

    res.json({
      ok: true,
      joinUrl,
    });
  } catch (e) {
    console.error("VIDEO INVITE ERROR:", e);

    const message =
      e instanceof Error ? e.message : String(e);

    res.status(500).json({
      error: "Video invite failed",
      details: message,
    });
  }
}