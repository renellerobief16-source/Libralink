import { useRef, useState } from "react";
import "../styles/BookCarousel.css";

const books = [
  { id: 1, title: "Database Management Systems", author: "Information Technology", course: "BSIT / BSCS", cover: "", accent: "#287c82" },
  { id: 2, title: "Web Development Fundamentals", author: "Computer Science", course: "BSCS / BSIT", cover: "", accent: "#3b687d" },
  { id: 3, title: "Financial Accounting and Reporting", author: "Accountancy", course: "BSA", cover: "", accent: "#46745c" },
  { id: 4, title: "Principles of Marketing", author: "Business Administration", course: "BSBA", cover: "", accent: "#a36f4f" },
  { id: 5, title: "The Teaching Profession", author: "Professional Education", course: "BSED / BEED", cover: "", accent: "#9a8650" },
  { id: 6, title: "Fundamentals of Nursing", author: "Health Sciences", course: "BSN", cover: "", accent: "#b76565" },
  { id: 7, title: "Readings in Philippine History", author: "General Education", course: "All Programs", cover: "", accent: "#6d627d" },
];

function circularDistance(index, activeIndex, total) {
  const forward = (index - activeIndex + total) % total;
  const backward = (activeIndex - index + total) % total;
  return forward <= backward ? forward : -backward;
}

export default function BookCarousel({ items = books, onSelect }) {
  const [activeBook, setActiveBook] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(null);
  const dragTriggered = useRef(false);
  const suppressClick = useRef(false);
  const wheelLocked = useRef(false);
  const collection = items.length ? items : books;
  const total = collection.length;

  const moveCarousel = (direction) => {
    setActiveBook((current) => (current + direction + total) % total);
  };

  const handlePointerDown = (event) => {
    dragStartX.current = event.clientX;
    dragTriggered.current = false;
    suppressClick.current = false;
    setIsDragging(false);
  };

  const handlePointerMove = (event) => {
    if (dragStartX.current === null) return;
    if (dragTriggered.current) return;
    const distance = event.clientX - dragStartX.current;
    if (Math.abs(distance) < 72) return;

    moveCarousel(distance < 0 ? 1 : -1);
    dragTriggered.current = true;
    suppressClick.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerEnd = (event) => {
    dragStartX.current = null;
    dragTriggered.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 350);
    }
  };

  const handleWheel = (event) => {
    const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(distance) < 35 || wheelLocked.current) return;
    event.preventDefault();
    wheelLocked.current = true;
    moveCarousel(distance > 0 ? 1 : -1);
    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 650);
  };

  const selectBook = (index) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }

    onSelect?.(collection[index]);
  };

  return (
    <div className="book-carousel" aria-label="Featured library books">
      <div
        className={`book-carousel-stage ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
      >
        <div className="book-carousel-floor" aria-hidden="true" />
        {collection.map((book, index) => {
          const distance = circularDistance(index, activeBook, total);
          const absoluteDistance = Math.abs(distance);
          const position = Math.max(-3, Math.min(3, distance));
          const isActive = index === activeBook;
          const style = {
            "--book-x": `${position * 102}px`,
            "--book-z": `${isActive ? 96 : Math.max(0, 48 - absoluteDistance * 22)}px`,
            "--book-scale": isActive ? 1.08 : Math.max(0.78, 1 - absoluteDistance * 0.075),
            "--book-rotate": `${isActive ? 0 : position < 0 ? 10 : -10}deg`,
            "--book-opacity": Math.max(0.36, 1 - absoluteDistance * 0.16),
            "--book-accent": book.accent || "#0878b5",
            zIndex: 10 - absoluteDistance,
          };

          return (
            <button
              key={book.id}
              type="button"
              className={`book-carousel-item ${isActive ? "is-active" : ""} distance-${absoluteDistance}`}
              style={style}
              onClick={() => selectBook(index)}
              aria-label={`Select ${book.title} by ${book.author}`}
              aria-pressed={isActive}
            >
              <span className="book-carousel-cover">
                <span className="book-carousel-spine" aria-hidden="true" />
                <span className="book-carousel-pages" aria-hidden="true" />
                <span className="book-carousel-cover-face">
                  {book.cover ? (
                    <img src={book.cover} alt="" className="book-carousel-image" />
                  ) : (
                    <span className="book-carousel-placeholder">
                      <span className="book-carousel-mark">LIBRALINK</span>
                      <span className="book-carousel-title">{book.title}</span>
                      <span className="book-carousel-author">{book.author}</span>
                      <span className="book-carousel-course">{book.course}</span>
                      <span className="book-carousel-rule" />
                      <span className="book-carousel-edition">CONNECTED COLLECTION</span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="book-carousel-caption" aria-live="polite">
        <span className="book-carousel-caption-kicker">Featured in the collection</span>
        <strong>{collection[activeBook]?.title}</strong>
        <span>{collection[activeBook]?.author}</span>
      </div>
    </div>
  );
}

export { books };
