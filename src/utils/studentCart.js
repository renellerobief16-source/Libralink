import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Returns current items from localStorage "borrowingList"
 */
export function getBorrowingCartItems() {
  try {
    const saved = JSON.parse(localStorage.getItem("borrowingList") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/**
 * Hook to reactively subscribe to the number of books in borrowing list
 */
export function useBorrowingCartCount() {
  const [count, setCount] = useState(() => getBorrowingCartItems().length);

  useEffect(() => {
    const updateCount = () => {
      setCount(getBorrowingCartItems().length);
    };

    window.addEventListener("borrowing-list-changed", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("borrowing-list-changed", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  return count;
}

/**
 * Global drawer open flag
 */
let isGlobalCartDrawerOpen = false;

export function isCartDrawerOpen() {
  return isGlobalCartDrawerOpen;
}

export function setCartDrawerOpen(isOpen) {
  isGlobalCartDrawerOpen = Boolean(isOpen);
  window.dispatchEvent(
    new CustomEvent("cart-drawer-state-changed", {
      detail: { isOpen: isGlobalCartDrawerOpen },
    })
  );
}

/**
 * Hook to reactively track whether the Borrowing List drawer is currently open
 */
export function useIsCartDrawerOpen() {
  const [isOpen, setIsOpen] = useState(() => isGlobalCartDrawerOpen);

  useEffect(() => {
    const handleStateChange = (event) => {
      const open = Boolean(event?.detail?.isOpen);
      isGlobalCartDrawerOpen = open;
      setIsOpen(open);
    };

    const handleOpen = () => {
      isGlobalCartDrawerOpen = true;
      setIsOpen(true);
    };

    const handleClose = () => {
      isGlobalCartDrawerOpen = false;
      setIsOpen(false);
    };

    window.addEventListener("cart-drawer-state-changed", handleStateChange);
    window.addEventListener("open-borrowing-list", handleOpen);
    window.addEventListener("close-borrowing-list", handleClose);

    return () => {
      window.removeEventListener("cart-drawer-state-changed", handleStateChange);
      window.removeEventListener("open-borrowing-list", handleOpen);
      window.removeEventListener("close-borrowing-list", handleClose);
    };
  }, []);

  return isOpen;
}

/**
 * Hook providing a function to open the Borrowing List drawer from anywhere
 */
export function useOpenBorrowingCart() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    isGlobalCartDrawerOpen = true;
    window.dispatchEvent(
      new CustomEvent("cart-drawer-state-changed", {
        detail: { isOpen: true },
      })
    );
    window.dispatchEvent(new Event("open-borrowing-list"));

    if (location.pathname.startsWith("/studentpage/search")) {
      return;
    }
    sessionStorage.setItem("openBorrowingList", "true");
    navigate("/studentpage/search");
  }, [navigate, location]);
}
