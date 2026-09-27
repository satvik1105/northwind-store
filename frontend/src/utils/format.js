export function formatPrice(cents, currency = "inr") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatOrderWhen(iso, opts = {}) {
  const { dateStyle = "medium" } = opts;

  if (!iso) return "";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle,
    timeStyle: "short",
  }).format(date);
}