import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWishlist = create(
  persist(
    (set, get) => ({
      items: [],

      toggleItem(productId) {
        const items = [...get().items];

        const exists = items.includes(productId);

        if (exists) {
          set({
            items: items.filter((id) => id !== productId),
          });
        } else {
          set({
            items: [...items, productId],
          });
        }
      },

      isWishlisted(productId) {
        return get().items.includes(productId);
      },

      clear() {
        set({ items: [] });
      },
    }),
    {
      name: "northwind-wishlist",
    },
  ),
);