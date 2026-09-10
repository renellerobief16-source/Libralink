import { useState, useRef, useEffect, useCallback } from "react";

export function useDraggableScroll({ scrollAmount = 400 } = {}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Internal drag references to avoid unnecessary re-renders
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Check scroll boundary states
  const updateScrollBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  // Update bounds on mount, resize, or content changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollBounds();

    const handleScroll = () => updateScrollBounds();
    const handleResize = () => updateScrollBounds();

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    // Also observe DOM changes inside container (e.g. books loading)
    let observer;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(() => updateScrollBounds());
      observer.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (observer) observer.disconnect();
    };
  }, [updateScrollBounds]);

  // Mouse Drag Event Handlers
  const onMouseDown = useCallback((e) => {
    // Only primary mouse button (left click)
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    isMouseDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollStartRef.current = el.scrollLeft;
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isMouseDownRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const currentX = e.pageX - el.offsetLeft;
    const walk = currentX - startXRef.current;

    // Movement threshold to avoid triggering drag on tiny micro-clicks
    if (Math.abs(walk) > 5) {
      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        setIsDragging(true);
      }
      el.scrollLeft = scrollStartRef.current - walk;
      updateScrollBounds();
    }
  }, [updateScrollBounds]);

  const onMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
    // Allow click events to be prevented if user dragged
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 60);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      setIsDragging(false);
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 60);
    }
  }, []);

  // Prevent accidental book card clicks if the user was dragging
  const onClickCapture = useCallback((e) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  // Programmatic smooth scroll functions for Arrow Buttons
  const scrollLeftAction = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = scrollAmount || el.clientWidth * 0.75;
    el.scrollBy({ left: -distance, behavior: "smooth" });
  }, [scrollAmount]);

  const scrollRightAction = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = scrollAmount || el.clientWidth * 0.75;
    el.scrollBy({ left: distance, behavior: "smooth" });
  }, [scrollAmount]);

  return {
    ref: containerRef,
    isDragging,
    canScrollLeft,
    canScrollRight,
    scrollLeftAction,
    scrollRightAction,
    events: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onClickCapture,
    },
  };
}

export default useDraggableScroll;
