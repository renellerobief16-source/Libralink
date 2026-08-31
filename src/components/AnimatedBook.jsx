import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import "../styles/AnimatedBook.css";

/**
 * Premium Animated Book Component
 * Displays an interactive digital book with 3D page-flip animations
 * for the Libralink hero section
 */

const sampleBooks = [
  {
    id: 1,
    title: "Management Systems",
    author: "Dr. Ana Reyes",
    category: "Featured Book",
    color: "from-blue-50 to-slate-50",
  },
  {
    id: 2,
    title: "Web Development",
    author: "Prof. Leo Dela Cruz",
    category: "Featured Book",
    color: "from-blue-50 to-slate-50",
  },
  {
    id: 3,
    title: "Software Engineering",
    author: "Ms. Camila Santos",
    category: "Featured Book",
    color: "from-blue-50 to-slate-50",
  },
  {
    id: 4,
    title: "Digital Libraries",
    author: "Mr. James Cruz",
    category: "Featured Book",
    color: "from-blue-50 to-slate-50",
  },
];

export default function AnimatedBook() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState(null);

  const currentBook = sampleBooks[currentIndex];
  const nextBook = sampleBooks[(currentIndex + 1) % sampleBooks.length];
  const totalBooks = sampleBooks.length;

  /**
   * Handle page turn animation
   * Prevents rapid clicking during animation and smoothly transitions between books
   */
  const handlePageTurn = (direction) => {
    if (isFlipping) return; // Prevent multiple clicks during animation

    setIsFlipping(true);
    setFlipDirection(direction);

    // Update book index at midpoint of animation for seamless transition
    window.setTimeout(() => {
      setCurrentIndex((prev) =>
        direction === "next"
          ? (prev + 1) % totalBooks
          : (prev - 1 + totalBooks) % totalBooks
      );
    }, 200); // Halfway through animation

    // Reset animation state after flip completes
    window.setTimeout(() => {
      setIsFlipping(false);
      setFlipDirection(null);
    }, 450); // Total animation duration
  };

  const handlePrevious = () => handlePageTurn("prev");
  const handleNext = () => handlePageTurn("next");

  return (
    <div className="animated-book-container">
      {/* Subtle floating animation wrapper */}
      <div className="animated-book-wrapper">
        {/* 3D Perspective container for the physical book */}
        <div className="animated-book-3d-container">
          {/* Book shadow and depth layer */}
          <div className="animated-book-shadow" />

          {/* Main book element with 3D transforms */}
          <div className={`animated-book-main ${isFlipping ? `is-flipping is-flipping-${flipDirection}` : ""}`}>
            {/* Book spine - visible center line */}
            <div className="animated-book-spine" />

            {/* Book cover top rim */}
            <div className="animated-book-rim" />

            {/* Left and right pages container */}
            <div className="animated-book-pages">
              {/* Left page - current book */}
              <div className="animated-book-page animated-book-page-left">
                {/* Subtle highlight for depth */}
                <div className="animated-page-highlight" />

                <div className="animated-page-content">
                  <div className="animated-page-header">
                    <span className="animated-page-badge">{currentBook.category}</span>
                  </div>

                  <h3 className="animated-page-title">{currentBook.title}</h3>
                  <p className="animated-page-author">{currentBook.author}</p>

                  <div className="animated-page-footer">
                    <span className="animated-page-cta">Open Book</span>
                  </div>
                </div>
              </div>

              {/* Right page - next book preview */}
              <div className="animated-book-page animated-book-page-right">
                {/* Subtle highlight for depth */}
                <div className="animated-page-highlight" />

                <div className="animated-page-content">
                  <div className="animated-page-header">
                    <span className="animated-page-badge">{nextBook.category}</span>
                  </div>

                  <h3 className="animated-page-title">{nextBook.title}</h3>
                  <p className="animated-page-author">{nextBook.author}</p>

                  <div className="animated-page-footer">
                    <span className="animated-page-cta">Next</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation controls */}
        <div className="animated-book-controls">
          {/* Previous button */}
          <button
            onClick={handlePrevious}
            disabled={isFlipping}
            aria-label="Previous book"
            className="animated-book-button animated-book-button-prev"
            title="Previous"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>

          {/* Page indicator */}
          <div className="animated-book-indicator">
            <span className="animated-indicator-text">
              {currentIndex + 1} / {totalBooks}
            </span>
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={isFlipping}
            aria-label="Next book"
            className="animated-book-button animated-book-button-next"
            title="Next"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
