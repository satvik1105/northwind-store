import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type OrderEmailData = {
  to: string;
  orderId: string;
  totalCents: number;
};

export async function sendOrderConfirmationEmail({
  to,
  orderId,
  totalCents,
}: OrderEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not configured");
    return;
  }

  const total = (totalCents / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });

  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:5174";

  const orderUrl = `${frontendUrl}/orders/${orderId}`;

  try {
    const { error } = await resend.emails.send({
      from: "Northwind Store <onboarding@resend.dev>",
      to,
      subject: `Order Confirmed #${orderId.slice(0, 8)}`,

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 24px;
            color: #222;
          "
        >
          <div
            style="
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 32px;
            "
          >
            <h1 style="margin: 0 0 10px; font-size: 28px;">
              🎉 Order Confirmed!
            </h1>

            <p style="color: #666; margin-bottom: 28px;">
              Thank you for shopping with Northwind Store.
              Your order has been successfully placed.
            </p>

            <div
              style="
                background: #f5f5f5;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 28px;
              "
            >
              <p style="margin: 0 0 12px;">
                <strong>Order ID:</strong>
                #${orderId.slice(0, 8)}
              </p>

              <p style="margin: 0;">
                <strong>Total:</strong>
                ${total}
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a
                href="${orderUrl}"
                style="
                  display: inline-block;
                  background: #570df8;
                  color: #ffffff;
                  text-decoration: none;
                  padding: 13px 24px;
                  border-radius: 10px;
                  font-weight: bold;
                "
              >
                View Your Order
              </a>
            </div>

            <p
              style="
                color: #888;
                font-size: 13px;
                margin-top: 30px;
              "
            >
              You can view your order details, contact support,
              and access your order chat from your account.
            </p>

            <p
              style="
                margin-top: 28px;
                font-weight: bold;
              "
            >
              Northwind Store
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend email error:", error);
      return;
    }

    console.log(`Order confirmation email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
}