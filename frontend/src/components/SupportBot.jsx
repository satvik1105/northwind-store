import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Link } from "react-router";

import {
  BotIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  PackageIcon,
  TruckIcon,
  CreditCardIcon,
  RotateCcwIcon,
  ShoppingBagIcon,
  UserIcon,
  HeadphonesIcon,
} from "lucide-react";

import { apiFetch } from "../lib/api.js";
import { formatPrice } from "../utils/format.js";

const FAQS = {
  order: {
    question: "📦 My Order",
  },

  delivery: {
    question: "🚚 Delivery",
    answer:
      "Standard delivery usually takes 3–5 business days. For your specific order, ask me about your order and I'll show you the latest order details.",
  },

  checkout: {
    question: "💳 Checkout",
    answer:
      "Our checkout is currently a demo/COD-style flow for this portfolio store. No real payment is processed.",
  },

  return: {
    question: "🔄 Return / Refund",
    answer:
      "For return or refund questions, please contact our support team with your order details so they can assist you.",
  },

  product: {
    question: "🛍️ Product Help",
    answer:
      "You can open any product to view its price, category, description and other available information.",
  },

  account: {
    question: "👤 Account",
    answer:
      "Your account and authentication are securely handled through Clerk. If you are having trouble signing in or accessing your orders, our support team can help.",
  },
};

function formatOrderDetails(order) {
  const items = order.previewItems ?? [];

  const itemLines =
    items.length > 0
      ? items
          .map((item) => `• ${item.name} × ${item.quantity}`)
          .join("\n")
      : "• No product details available";

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Unknown";

  return `📦 Order #${order.id.slice(0, 8)}

Status: ${order.status}
Total: ${formatPrice(order.totalCents, "inr")}

Items:
${itemLines}

Order placed: ${orderDate}`;
}

function getOrderDate(order) {
  return order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Unknown";
}

function getChatStorageKey(userId) {
  const path =
    typeof window !== "undefined"
      ? window.location.pathname
      : "unknown";

  return `northwind-support-chat:${userId}:${path}`;
}

function loadSavedMessages(userId) {
  if (!userId || typeof window === "undefined") {
    return [
      {
        id: 1,
        type: "bot",
        text: "Hi! 👋 I'm Northwind Assistant. How can I help you?",
      },
    ];
  }

  try {
    const key = getChatStorageKey(userId);
    const saved = localStorage.getItem(key);

    if (!saved) {
      return [
        {
          id: 1,
          type: "bot",
          text: "Hi! 👋 I'm Northwind Assistant. How can I help you?",
        },
      ];
    }

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error("Could not load saved support chat:", error);
  }

  return [
    {
      id: 1,
      type: "bot",
      text: "Hi! 👋 I'm Northwind Assistant. How can I help you?",
    },
  ];
}

function SupportBot({ onTalkToSupport }) {
  const { getToken, isSignedIn, userId } = useAuth();

  const [messages, setMessages] = useState(() =>
    loadSavedMessages(userId),
  );

  const [input, setInput] = useState("");

  const messagesContainerRef = useRef(null);
  const chatLoadedRef = useRef(false);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["support-bot-orders"],
    queryFn: () => apiFetch("/api/orders", { getToken }),
    enabled: Boolean(isSignedIn),
  });

  const orders = ordersData?.orders ?? [];

  useEffect(() => {
    if (!userId) return;

    const savedMessages = loadSavedMessages(userId);

    setMessages(savedMessages);
    chatLoadedRef.current = true;
  }, [userId]);

  useEffect(() => {
    if (!userId || !chatLoadedRef.current) return;

    try {
      const key = getChatStorageKey(userId);

      localStorage.setItem(
        key,
        JSON.stringify(messages),
      );
    } catch (error) {
      console.error("Could not save support chat:", error);
    }
  }, [messages, userId]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function addBotMessage(
    text,
    orderId = null,
    orderList = null,
    showHumanSupport = false,
  ) {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        type: "bot",
        text,
        orderId,
        orderList,
        showHumanSupport,
      },
    ]);
  }

  function addUserMessage(text) {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        type: "user",
        text,
      },
    ]);
  }

  function getLatestOrder() {
    if (!orders.length) return null;

    return orders[0];
  }

  function isAllOrdersQuestion(text = "") {
    const normalized = text.toLowerCase();

    return (
      normalized.includes("all order") ||
      normalized.includes("my orders") ||
      normalized.includes("orders list") ||
      normalized.includes("order history") ||
      normalized.includes("all my") ||
      normalized.includes("mere orders") ||
      normalized.includes("mere order") ||
      normalized.includes("order dikhao") ||
      normalized.includes("orders dikhao") ||
      normalized.includes("orders dikh")
    );
  }

  function handleOrderQuestion(text = "") {
    const normalized = text.toLowerCase();

    if (!isSignedIn) {
      return {
        text: "Please sign in first so I can securely check your orders. 🔐",
        orderId: null,
        orderList: null,
      };
    }

    if (ordersLoading) {
      return {
        text: "I'm checking your orders right now... ⏳",
        orderId: null,
        orderList: null,
      };
    }

    if (!orders.length) {
      return {
        text: "You don't have any orders yet. 🛍️",
        orderId: null,
        orderList: null,
      };
    }

    const latestOrder = getLatestOrder();

    if (isAllOrdersQuestion(text)) {
      return {
        text: "📋 Here are your recent orders:",
        orderId: null,
        orderList: orders.slice(0, 5),
      };
    }

    if (
      normalized.includes("status") ||
      normalized.includes("where is my order") ||
      normalized.includes("where's my order") ||
      normalized.includes("order status") ||
      normalized.includes("status kya")
    ) {
      return {
        text: `📦 Your latest order is #${latestOrder.id.slice(
          0,
          8,
        )}.

Current status: ${latestOrder.status}`,
        orderId: latestOrder.id,
        orderList: null,
      };
    }

    if (
      normalized.includes("how much") ||
      normalized.includes("total") ||
      normalized.includes("cost") ||
      normalized.includes("price of my order") ||
      normalized.includes("kitne ka") ||
      normalized.includes("kitna ka")
    ) {
      return {
        text: `💰 Your latest order #${latestOrder.id.slice(
          0,
          8,
        )} total is ${formatPrice(
          latestOrder.totalCents,
          "inr",
        )}.`,
        orderId: latestOrder.id,
        orderList: null,
      };
    }

    if (
      normalized.includes("what did i order") ||
      normalized.includes("what i ordered") ||
      normalized.includes("items") ||
      normalized.includes("products i ordered") ||
      normalized.includes("bought") ||
      normalized.includes("kya order kiya") ||
      normalized.includes("maine kya order")
    ) {
      const items = latestOrder.previewItems ?? [];

      if (!items.length) {
        return {
          text: `I found your latest order #${latestOrder.id.slice(
            0,
            8,
          )}, but product details aren't available in the order preview.`,
          orderId: latestOrder.id,
          orderList: null,
        };
      }

      return {
        text: `🛍️ Products in your latest order #${latestOrder.id.slice(
          0,
          8,
        )}:

${items
  .map((item) => `• ${item.name} × ${item.quantity}`)
  .join("\n")}`,
        orderId: latestOrder.id,
        orderList: null,
      };
    }

    return {
      text: formatOrderDetails(latestOrder),
      orderId: latestOrder.id,
      orderList: null,
    };
  }

  function handleFAQ(key) {
    const faq = FAQS[key];

    if (!faq) return;

    addUserMessage(faq.question);

    setTimeout(() => {
      if (key === "order") {
        const response = handleOrderQuestion();

        addBotMessage(
          response.text,
          response.orderId,
          response.orderList,
        );

        return;
      }

      addBotMessage(faq.answer);
    }, 300);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const text = input.trim();

    if (!text) return;

    addUserMessage(text);

    setInput("");

    const normalized = text.toLowerCase();

    /* HUMAN SUPPORT DETECTION */
    const isHumanSupportQuestion =
      normalized.includes("human") ||
      normalized.includes("real person") ||
      normalized.includes("real human") ||
      normalized.includes("agent") ||
      normalized.includes("support agent") ||
      normalized.includes("customer care") ||
      normalized.includes("customer support") ||
      normalized.includes("support team") ||
      normalized.includes("talk to support") ||
      normalized.includes("talk to the support team") ||
      normalized.includes("talk to support team") ||
      normalized.includes("chat support") ||
      normalized.includes("human se baat") ||
      normalized.includes("insaan se baat") ||
      normalized.includes("person se baat") ||
      normalized.includes("support se baat") ||
      normalized.includes("agent se baat") ||
      normalized.includes("chat system") ||
      normalized.includes("chat support se baat");

    const isOrderQuestion =
      normalized.includes("order") ||
      normalized.includes("orders") ||
      normalized.includes("purchase") ||
      normalized.includes("bought") ||
      normalized.includes("what did i buy") ||
      normalized.includes("what did i order") ||
      normalized.includes("my purchase") ||
      normalized.includes("mere order") ||
      normalized.includes("mere orders");

    const isDeliveryQuestion =
      normalized.includes("delivery") ||
      normalized.includes("deliver") ||
      normalized.includes("shipping") ||
      normalized.includes("ship") ||
      normalized.includes("arrive");

    const matchedFAQ =
      normalized.includes("payment") ||
      normalized.includes("pay") ||
      normalized.includes("checkout") ||
      normalized.includes("card") ||
      normalized.includes("money")
        ? FAQS.checkout
        : normalized.includes("return") ||
            normalized.includes("refund") ||
            normalized.includes("cancel")
          ? FAQS.return
          : normalized.includes("product") ||
              normalized.includes("products") ||
              normalized.includes("item") ||
              normalized.includes("price")
            ? FAQS.product
            : normalized.includes("account") ||
                normalized.includes("login") ||
                normalized.includes("signin") ||
                normalized.includes("logout")
              ? FAQS.account
              : null;

    setTimeout(() => {
      /* HUMAN SUPPORT */
      if (isHumanSupportQuestion) {
        addBotMessage(
          "Bilkul! 👨‍💻 Aap hamare human support agent se baat kar sakte hain.",
          null,
          null,
          true,
        );

        return;
      }

      /* ORDER */
      if (isOrderQuestion) {
        const response = handleOrderQuestion(text);

        addBotMessage(
          response.text,
          response.orderId,
          response.orderList,
        );

        return;
      }

      /* DELIVERY */
      if (isDeliveryQuestion) {
        if (orders.length > 0) {
          const latestOrder = getLatestOrder();

          addBotMessage(
            `🚚 Your latest order is #${latestOrder.id.slice(
              0,
              8,
            )} and its current status is "${latestOrder.status}".

Standard delivery usually takes 3–5 business days. For specific delivery help, you can talk to our support team.`,
            latestOrder.id,
          );
        } else {
          addBotMessage(FAQS.delivery.answer);
        }

        return;
      }

      /* FAQ */
      if (matchedFAQ) {
        addBotMessage(matchedFAQ.answer);
        return;
      }

      /* UNKNOWN */
      addBotMessage(
        "I'm sorry, I couldn't understand that yet. You can ask me about your order, order status, products, checkout, delivery, returns, or account.",
      );
    }, 300);
  }

  return (
    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body p-0">

        {/* HEADER */}
        <div className="flex items-center gap-3 border-b border-base-300 px-5 py-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <BotIcon className="size-5" aria-hidden />
          </div>

          <div>
            <h3 className="font-bold text-base-content">
              Northwind Assistant
            </h3>

            <p className="text-xs text-base-content/60">
              Automated customer support
            </p>
          </div>
        </div>

        {/* MESSAGES */}
        <div
          ref={messagesContainerRef}
          className="max-h-80 space-y-3 overflow-y-auto px-5 py-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-base ${
                  message.type === "user"
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content"
                }`}
              >
                <div className="whitespace-pre-line">
                  {message.text}
                </div>

                {/* SINGLE ORDER BUTTON */}
                {message.orderId ? (
                  <Link
                    to={`/orders/${message.orderId}`}
                    className="btn btn-primary btn-sm mt-3 w-full gap-2"
                  >
                    <PackageIcon
                      className="size-4"
                      aria-hidden
                    />

                    View Order

                    <ChevronRightIcon
                      className="size-4"
                      aria-hidden
                    />
                  </Link>
                ) : null}

                {/* HUMAN SUPPORT BUTTON */}
                {message.showHumanSupport ? (
                  <button
                    type="button"
                    onClick={onTalkToSupport}
                    className="btn btn-secondary btn-sm mt-3 w-full gap-2"
                  >
                    <HeadphonesIcon
                      className="size-4"
                      aria-hidden
                    />

                    Talk to Human Support

                    <ChevronRightIcon
                      className="size-4"
                      aria-hidden
                    />
                  </button>
                ) : null}

                {/* MULTIPLE ORDER CARDS */}
                {message.orderList?.length ? (
                  <div className="mt-4 space-y-3">
                    {message.orderList.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-base-300 bg-base-100 p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-base-content">
                              Order #{order.id.slice(0, 8)}
                            </p>

                            <p className="mt-1 text-xs text-base-content/60">
                              {getOrderDate(order)}
                            </p>
                          </div>

                          <span
                            className={`badge badge-sm capitalize ${
                              order.status === "paid"
                                ? "badge-success"
                                : order.status === "failed"
                                  ? "badge-error"
                                  : "badge-warning"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-base-content">
                            {formatPrice(
                              order.totalCents,
                              "inr",
                            )}
                          </span>

                          <Link
                            to={`/orders/${order.id}`}
                            className="btn btn-primary btn-xs gap-1.5"
                          >
                            <PackageIcon
                              className="size-3.5"
                              aria-hidden
                            />

                            View Order

                            <ChevronRightIcon
                              className="size-3.5"
                              aria-hidden
                            />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* QUICK HELP */}
        <div className="border-t border-base-300 px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/50">
            Quick help
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFAQ("order")}
              className="btn btn-outline btn-sm justify-start gap-2"
            >
              <PackageIcon className="size-4" />
              My Order
            </button>

            <button
              type="button"
              onClick={() => handleFAQ("delivery")}
              className="btn btn-outline btn-sm justify-start gap-2"
            >
              <TruckIcon className="size-4" />
              Delivery
            </button>

            <button
              type="button"
              onClick={() => handleFAQ("checkout")}
              className="btn btn-outline btn-sm justify-start gap-2"
            >
              <CreditCardIcon className="size-4" />
              Checkout
            </button>

            <button
              type="button"
              onClick={() => handleFAQ("return")}
              className="btn btn-outline btn-sm justify-start gap-2"
            >
              <RotateCcwIcon className="size-4" />
              Return / Refund
            </button>

            <button
              type="button"
              onClick={() => handleFAQ("product")}
              className="btn btn-outline btn-sm justify-start gap-2"
            >
              <ShoppingBagIcon className="size-4" />
              Product Help
            </button>

            <button
              type="button"
              onClick={() => handleFAQ("account")}
              className="btn btn-outline btn-sm justify-start gap-2"
            >
              <UserIcon className="size-4" />
              Account
            </button>
          </div>
        </div>

        {/* TALK TO SUPPORT */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={onTalkToSupport}
            className="btn btn-secondary btn-sm w-full gap-2"
          >
            <HeadphonesIcon
              className="size-4"
              aria-hidden
            />

            Talk to Support

            <ChevronRightIcon
              className="ml-auto size-4"
              aria-hidden
            />
          </button>
        </div>

        {/* INPUT */}
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 border-t border-base-300 bg-base-200/40 p-4"
        >
          <div className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border border-base-300 bg-white px-4 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <MessageCircleIcon
              className="size-5 shrink-0 text-gray-400"
              aria-hidden
            />

            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask something..."
              className="h-14 w-full border-0 bg-transparent text-lg font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary min-h-14 rounded-xl px-7 text-base"
            disabled={!input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default SupportBot;