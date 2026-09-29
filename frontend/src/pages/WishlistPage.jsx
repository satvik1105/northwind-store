import { useState } from "react";
import { Link } from "react-router";
import {
  HeartIcon,
  ShoppingCartIcon,
  Trash2Icon,
  CheckIcon,
} from "lucide-react";
import { useWishlist } from "../store/wishlist.js";
import { useCart } from "../store/cart.js";
import { formatPrice } from "../utils/format.js";
import {
  IK_PRESETS,
  imageKitOptimizedUrl,
} from "../lib/imagekitUrl.js";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";

function WishlistPage() {
  const wishlistItems = useWishlist((s) => s.items);
  const toggleItem = useWishlist((s) => s.toggleItem);
  const addItem = useCart((s) => s.addItem);

  const [addedProduct, setAddedProduct] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch("/api/products"),
  });

  const products = data?.products ?? [];

  const wishlistProducts = products.filter((product) =>
    wishlistItems.includes(product.id),
  );

  function handleAddToCart(product) {
    // Add product to cart
    addItem(product.id);

    // Remove product from wishlist
    toggleItem(product.id);

    // Show success state
    setAddedProduct(product.name);

    setTimeout(() => {
      setAddedProduct(null);
    }, 1800);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="alert alert-error">
          <span>Unable to load wishlist products.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-error/15 text-error">
              <HeartIcon
                className="size-6 fill-current"
                aria-hidden
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-base-content">
                My Wishlist
              </h1>

              <p className="mt-1 text-sm text-base-content/60">
                {wishlistProducts.length}{" "}
                {wishlistProducts.length === 1
                  ? "product"
                  : "products"}{" "}
                saved
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="btn btn-outline btn-sm gap-2"
        >
          Continue Shopping
        </Link>
      </div>

      {/* EMPTY WISHLIST */}
      {wishlistProducts.length === 0 ? (
        <div className="flex min-h-105 flex-col items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 text-center shadow-sm">
          <div className="flex size-20 items-center justify-center rounded-full bg-error/10 text-error">
            <HeartIcon
              className="size-10"
              aria-hidden
            />
          </div>

          <h2 className="mt-5 text-2xl font-bold text-base-content">
            Your wishlist is empty
          </h2>

          <p className="mt-2 max-w-md text-sm leading-relaxed text-base-content/60">
            Save products you love by clicking the heart icon on any
            product.
          </p>

          <Link
            to="/"
            className="btn btn-primary mt-6 gap-2 rounded-xl px-6"
          >
            <ShoppingCartIcon
              className="size-4"
              aria-hidden
            />
            Start Shopping
          </Link>
        </div>
      ) : (
        /* WISHLIST PRODUCTS */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlistProducts.map((product) => (
            <article
              key={product.id}
              className="group card overflow-hidden border border-base-300 bg-base-100 shadow-md transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl"
            >
              {/* IMAGE */}
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
                      alt={product.name}
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

              {/* CONTENT */}
              <div className="card-body gap-3 p-5">
                <Link
                  to={`/product/${product.slug}`}
                  className="card-title line-clamp-2 text-lg transition hover:text-primary"
                >
                  {product.name}
                </Link>

                <p className="line-clamp-2 text-sm leading-relaxed text-base-content/65">
                  {product.description}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-base-200 pt-4">
                  <span className="text-lg font-bold tabular-nums text-base-content">
                    {formatPrice(
                      product.priceCents,
                      product.currency,
                    )}
                  </span>

                  {/* REMOVE FROM WISHLIST */}
                  <button
                    type="button"
                    onClick={() => toggleItem(product.id)}
                    className="btn btn-ghost btn-sm gap-2 text-error hover:bg-error/10"
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    <Trash2Icon
                      className="size-4"
                      aria-hidden
                    />

                    Remove
                  </button>
                </div>

                {/* ADD TO CART */}
                <button
                  type="button"
                  onClick={() => handleAddToCart(product)}
                  className={`btn w-full gap-2 rounded-xl transition-all duration-200 ${
                    addedProduct === product.name
                      ? "btn-success"
                      : "btn-primary"
                  }`}
                >
                  {addedProduct === product.name ? (
                    <>
                      <CheckIcon
                        className="size-4"
                        aria-hidden
                      />

                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCartIcon
                        className="size-4"
                        aria-hidden
                      />

                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* CART TOAST */}
      {addedProduct ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center">
          <div className="alert alert-success w-fit max-w-md rounded-xl px-5 py-3 shadow-xl">
            <CheckIcon
              className="size-5"
              aria-hidden
            />

            <span className="font-medium">
              {addedProduct} added to cart
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default WishlistPage;