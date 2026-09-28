import { Link } from "react-router";
import { MinusIcon, PlusIcon } from "lucide-react";
import { formatPrice } from "../utils/format.js";
import { IK_PRESETS, imageKitOptimizedUrl } from "../lib/imagekitUrl.js";
import { useCart } from "../store/cart.js";

export function CatalogProductCard({ product }) {
  const addItem = useCart((s) => s.addItem);
  const setQty = useCart((s) => s.setQty);

  const cartItem = useCart((s) =>
    s.items.find((item) => item.productId === product.id),
  );

  return (
    <article className="card group h-full overflow-hidden border border-base-300 bg-base-100 shadow-md transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl">
      <Link
        to={`/product/${product.slug}`}
        className="relative block overflow-hidden"
      >
        <figure className="aspect-4/3 bg-base-300">
          {product.imageUrl ? (
            <img
              src={imageKitOptimizedUrl(
                product.imageUrl,
                IK_PRESETS.catalogCard,
              )}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </figure>

        <span className="badge badge-sm absolute left-3 top-3 border-0 bg-base-100/90 text-xs font-medium text-base-content/80 backdrop-blur">
          {product.category ?? "General"}
        </span>
      </Link>

      <div className="card-body grow gap-3 p-5 text-left">
        <Link
          to={`/product/${product.slug}`}
          className="card-title line-clamp-2 text-lg transition group-hover:text-primary"
        >
          {product.name}
        </Link>

        <p className="line-clamp-3 text-sm leading-relaxed text-base-content/70">
          {product.description}
        </p>

        <div className="card-actions mt-auto items-center justify-between border-t border-base-200 pt-4">
          <span className="text-lg font-bold tabular-nums text-base-content">
            {formatPrice(product.priceCents, product.currency)}
          </span>

          {cartItem ? (
            <div className="join overflow-hidden rounded-xl bg-success text-success-content shadow">
              <button
                type="button"
                className="btn btn-success btn-sm join-item min-h-10 px-3"
                onClick={() =>
                  setQty(product.id, cartItem.quantity - 1)
                }
                aria-label={
                  cartItem.quantity === 1
                    ? "Remove from cart"
                    : "Decrease quantity"
                }
              >
                <MinusIcon className="size-4" aria-hidden />
              </button>

              <span
                className="flex min-h-10 min-w-10 items-center justify-center bg-success px-2 text-base font-bold tabular-nums text-success-content"
                aria-live="polite"
              >
                {cartItem.quantity}
              </span>

              <button
                type="button"
                className="btn btn-success btn-sm join-item min-h-10 px-3"
                onClick={() =>
                  setQty(
                    product.id,
                    Math.min(99, cartItem.quantity + 1),
                  )
                }
                disabled={cartItem.quantity >= 99}
                aria-label="Increase quantity"
              >
                <PlusIcon className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addItem(product.id)}
              className="btn btn-primary btn-sm gap-1 shadow"
            >
              <PlusIcon className="size-4" aria-hidden />
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}