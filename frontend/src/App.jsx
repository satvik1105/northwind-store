import {
  Show,
  SignInButton,
  SignUpButton,
  useAuth,
  UserButton,
} from "@clerk/react";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import Layout from "./components/Layout";
import { Routes, Route, Navigate, useLocation } from "react-router";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import OrdersPage from "./pages/OrdersPage";
import CheckoutReturnPage from "./pages/CheckoutReturnPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import { SentryDemoPage } from "./pages/SentryDemoPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrderSummaryPage from "./pages/OrderSummaryPage";
import OrderChatPage from "./pages/OrderChatPage";
import OrderVideoPage from "./pages/OrderVideoPage";
import AdminProductsPage from "./pages/AdminProductsPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

function App() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <PageLoader />;

  return (
    <>
      <ScrollToTop />

      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/cart" element={<CartPage />} />

          <Route path="/wishlist" element={<WishlistPage />} />

          <Route
            path="/product/:slug"
            element={<ProductDetailPage />}
          />

          <Route
            path="/orders"
            element={
              isSignedIn ? (
                <OrdersPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/checkout/return"
            element={<CheckoutReturnPage />}
          />

          <Route
            path="/demo-sentry"
            element={<SentryDemoPage />}
          />

          <Route
            path="/orders/:id/call"
            element={
              isSignedIn ? (
                <OrderVideoPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/admin"
            element={
              isSignedIn ? (
                <AdminProductsPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/orders/:id"
            element={<OrderDetailPage />}
          >
            <Route
              index
              element={<OrderSummaryPage />}
            />

            <Route
              path="chat"
              element={<OrderChatPage />}
            />
          </Route>
        </Routes>
      </Layout>
    </>
  );
}

export default App;