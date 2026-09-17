import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiArrowRight, 
  FiBookOpen, 
  FiCheck, 
  FiCheckCircle,
  FiClock, 
  FiCompass, 
  FiExternalLink,
  FiLayers, 
  FiMapPin, 
  FiSearch, 
  FiSend, 
  FiShield, 
  FiStar,
  FiX 
} from "react-icons/fi";
import Navigation from "./Navigation";
import BookCarousel from "../BookCarousel";
import api, { getBackendAssetUrl } from "../../utils/api";

const suggestions = ["Introduction to Information Systems", "Database Management Systems", "Software Engineering", "Web Development"];
const shelfFeatures = [
  { label: "SEARCH", title: "Smart search", description: "Search titles, authors, subjects, and ISBNs in one clear catalog.", icon: FiSearch },
  { label: "DISCOVER", title: "Connected libraries", description: "Discover available resources beyond your home library.", icon: FiCompass },
  { label: "BORROW", title: "Simple requests", description: "Request a title and track every step of your borrowing journey.", icon: FiBookOpen },
  { label: "LOCATE", title: "Find the shelf", description: "See the library and shelf details before you walk in.", icon: FiMapPin },
  { label: "UPDATE", title: "Stay informed", description: "Receive helpful updates for requests, loans, and due dates.", icon: FiClock },
];

const relatedBooksMap = {
  1: { // Albert Einstein / Physics
    topic: "Physics & Natural Science",
    course: "Science & Engineering Core",
    description: "Foundational and modern theoretical physics, quantum mechanics, spacetime curvature, and relativity.",
    books: [
      { id: "p1", title: "University Physics with Modern Physics", author: "Hugh D. Young & Roger A. Freedman", callNumber: "QC21.3 .Y68", copies: 6, rating: "4.9", edition: "15th Global Edition", tag: "CORE TEXTBOOK" },
      { id: "p2", title: "The Feynman Lectures on Physics (Vol. 1-3)", author: "Richard P. Feynman", callNumber: "QC23 .F49", copies: 4, rating: "5.0", edition: "Definitive Edition", tag: "CLASSIC" },
      { id: "p3", title: "Concepts of Modern Physics & Quantum Mechanics", author: "Arthur Beiser", callNumber: "QC173 .B45", copies: 5, rating: "4.8", edition: "6th Edition", tag: "PHYSICS" },
      { id: "p4", title: "Introduction to Electrodynamics & Field Theory", author: "David J. Griffiths", callNumber: "QC680 .G75", copies: 3, rating: "4.9", edition: "4th Edition", tag: "ADVANCED" },
    ]
  },
  2: { // Shakespeare / Literature
    topic: "Literature & Humanities",
    course: "General Education / AB English",
    description: "Classical British & world dramas, poetic sonnets, literary critique, and modern literary anthologies.",
    books: [
      { id: "l1", title: "The Norton Anthology of World Literature", author: "Martin Puchner et al.", callNumber: "PN6014 .N67", copies: 7, rating: "4.9", edition: "4th Edition", tag: "ANTHOLOGY" },
      { id: "l2", title: "Philippine Literature in English: Historical Survey", author: "Bienvenido Lumbera", callNumber: "PL5531 .L86", copies: 8, rating: "4.8", edition: "Revised Text", tag: "FILIPINIANA" },
      { id: "l3", title: "Critical Theory Today: A User-Friendly Guide", author: "Lois Tyson", callNumber: "PN98 .T97", copies: 5, rating: "4.7", edition: "3rd Edition", tag: "HUMANITIES" },
      { id: "l4", title: "The Great Gatsby & 20th Century Classics", author: "F. Scott Fitzgerald", callNumber: "PS3511 .I9", copies: 9, rating: "4.9", edition: "Centennial Ed.", tag: "CLASSIC" },
    ]
  },
  3: { // Algorithms / Computer Science
    topic: "Computer Science & Information Technology",
    course: "BSIT / BSCS / BSCpE",
    description: "Core algorithms, data structure design, database management systems, full-stack architecture, and clean coding.",
    books: [
      { id: "c1", title: "Database Management Systems", author: "Raghu Ramakrishnan & Johannes Gehrke", callNumber: "QA76.9 .D3", copies: 8, rating: "4.9", edition: "3rd Edition", tag: "DATABASE" },
      { id: "c2", title: "Clean Code: A Handbook of Agile Craftsmanship", author: "Robert C. Martin", callNumber: "QA76.76 .C64", copies: 6, rating: "5.0", edition: "Agile Series", tag: "PROGRAMMING" },
      { id: "c3", title: "Operating System Concepts & Architecture", author: "Abraham Silberschatz & Peter Galvin", callNumber: "QA76.76 .O63", copies: 5, rating: "4.8", edition: "10th Edition", tag: "SYSTEMS" },
      { id: "c4", title: "Web Design & Full-Stack Development", author: "Jon Duckett", callNumber: "TK5105.888 .D83", copies: 7, rating: "4.9", edition: "2025 Edition", tag: "WEB DEV" },
    ]
  },
  4: { // Nursing / Health Sciences
    topic: "Nursing & Health Sciences",
    course: "BSN / Allied Health Sciences",
    description: "Clinical healthcare, patient assessment, surgical nursing standards, pharmacology, and medical physiology.",
    books: [
      { id: "n1", title: "Medical-Surgical Nursing: Assessment & Management", author: "Brunner & Suddarth (Hinkle & Cheever)", callNumber: "RT41 .B78", copies: 11, rating: "5.0", edition: "15th Edition", tag: "CLINICAL" },
      { id: "n2", title: "Pharmacology for Nurses: Pathophysiologic Approach", author: "Michael P. Adams & Carol Urban", callNumber: "RM301.28 .A33", copies: 6, rating: "4.8", edition: "6th Edition", tag: "PHARMACOLOGY" },
      { id: "n3", title: "Maternal & Child Health Nursing: Care of the Family", author: "Adele Pillitteri", callNumber: "RG951 .P55", copies: 7, rating: "4.9", edition: "8th Edition", tag: "MATERNAL" },
      { id: "n4", title: "Fundamentals of Nursing Care: Concepts & Skills", author: "Marti Burton & David Smith", callNumber: "RT41 .B87", copies: 9, rating: "4.9", edition: "4th Edition", tag: "STANDARDS" },
    ]
  },
  5: { // Business & Accountancy
    topic: "Accountancy & Business Administration",
    course: "BSA / BSBA / BSMA",
    description: "Financial accounting standards (IFRS/PFRS), corporate finance, cost management, and global marketing strategies.",
    books: [
      { id: "b1", title: "Financial Accounting & Reporting Standards (IFRS/PFRS)", author: "Jerry J. Weygandt & Donald E. Kieso", callNumber: "HF5635 .W48", copies: 10, rating: "4.9", edition: "IFRS Edition", tag: "ACCOUNTANCY" },
      { id: "b2", title: "Marketing Management: Global Strategic Perspective", author: "Philip Kotler & Kevin Lane Keller", callNumber: "HF5415.13 .K68", copies: 8, rating: "4.8", edition: "16th Edition", tag: "MARKETING" },
      { id: "b3", title: "Cost Accounting: A Managerial Emphasis", author: "Charles T. Horngren & Srikant Datar", callNumber: "HF5686 .C8", copies: 6, rating: "4.8", edition: "17th Edition", tag: "MANAGEMENT" },
      { id: "b4", title: "Principles of Corporate Finance & Valuation", author: "Richard A. Brealey & Stewart C. Myers", callNumber: "HG4026 .B67", copies: 5, rating: "4.9", edition: "14th Edition", tag: "FINANCE" },
    ]
  },
  6: { // Psychology
    topic: "Psychology & Behavioral Sciences",
    course: "BS Psychology / Social Sciences",
    description: "Cognitive science, abnormal psychology, human lifespan development, neurobiology, and social dynamics.",
    books: [
      { id: "ps1", title: "Cognitive Psychology: Mind & Experimental Research", author: "Robert J. Sternberg & Karin Sternberg", callNumber: "BF201 .S74", copies: 6, rating: "4.9", edition: "7th Edition", tag: "COGNITIVE" },
      { id: "ps2", title: "Abnormal Psychology: An Integrative Clinical Approach", author: "David H. Barlow & V. Mark Durand", callNumber: "RC454 .B37", copies: 8, rating: "4.9", edition: "9th Edition", tag: "CLINICAL PSYCH" },
      { id: "ps3", title: "Life-Span Developmental Psychology", author: "John W. Santrock", callNumber: "BF713 .S26", copies: 7, rating: "4.8", edition: "18th Edition", tag: "DEVELOPMENTAL" },
      { id: "ps4", title: "Social Psychology: Group Dynamics & Perception", author: "David G. Myers & Jean M. Twenge", callNumber: "HM1031 .M94", copies: 5, rating: "4.8", edition: "14th Edition", tag: "SOCIAL" },
    ]
  },
  7: { // Engineering
    topic: "Engineering & Applied Sciences",
    course: "BSCE / BSEE / BSME",
    description: "Structural mechanics, strength of materials, thermodynamics, electric circuits, and fluid engineering.",
    books: [
      { id: "e1", title: "Strength of Materials & Deformable Bodies", author: "Ferdinand L. Singer & Andrew Pytel", callNumber: "TA405 .S56", copies: 9, rating: "4.9", edition: "4th Edition", tag: "CIVIL & MECH" },
      { id: "e2", title: "Fundamentals of Electric Circuits", author: "Charles K. Alexander & Matthew Sadiku", callNumber: "TK454 .A44", copies: 7, rating: "4.8", edition: "7th Edition", tag: "ELECTRICAL" },
      { id: "e3", title: "Thermodynamics: An Engineering Approach", author: "Yunus A. Cengel & Michael A. Boles", callNumber: "TJ265 .C46", copies: 6, rating: "4.9", edition: "9th Edition", tag: "THERMO" },
      { id: "e4", title: "Fluid Mechanics for Civil & Mechanical Engineers", author: "Frank M. White", callNumber: "TA357 .W48", copies: 5, rating: "4.8", edition: "8th Edition", tag: "FLUIDS" },
    ]
  },
  8: { // Philippine History
    topic: "Philippine History & Heritage",
    course: "CHED Core General Education",
    description: "Filipino revolutionary history, primary historical documents, Jose Rizal's life and writings, and governance.",
    books: [
      { id: "h1", title: "History of the Filipino People (8th Edition)", author: "Teodoro A. Agoncillo", callNumber: "DS668 .A36", copies: 12, rating: "4.9", edition: "National Edition", tag: "FILIPINIANA" },
      { id: "h2", title: "Jose Rizal: Life, Works, and Writings of a Genius", author: "Gregorio F. Zaide & Sonia M. Zaide", callNumber: "DS675.8 .R5", copies: 10, rating: "4.9", edition: "Heritage Text", tag: "RIZAL" },
      { id: "h3", title: "Philippine Constitutional Law & Governance", author: "Hector S. De Leon", callNumber: "KPM1744.5 .D45", copies: 7, rating: "4.8", edition: "2024 Edition", tag: "GOVERNANCE" },
      { id: "h4", title: "Understanding the Self: General Education Core", author: "Eden Joy P. Alata et al.", callNumber: "BF697 .A43", copies: 9, rating: "4.7", edition: "CHED Aligned", tag: "CORE GEN-ED" },
    ]
  }
};

function Home() {
  const [selectedTopicBook, setSelectedTopicBook] = useState(null);

  const handleBookSelect = (book) => {
    setSelectedTopicBook(book);
    setTimeout(() => {
      const element = document.getElementById("curriculum-collection");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0F172A]">
      <Navigation />
      <Hero onBookSelect={handleBookSelect} />
      {selectedTopicBook && (
        <RelatedBooksSection 
          selectedBook={selectedTopicBook} 
          onClose={() => setSelectedTopicBook(null)}
          onSelectTopic={(book) => setSelectedTopicBook(book)}
        />
      )}
      <LibraryShelf />
      <ConnectedLibraries />
      <OpenBook />
      <PartnerSchoolGallery />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero({ onBookSelect }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const searchTerm = (query || "").trim();
    navigate(searchTerm ? `/library?search=${encodeURIComponent(searchTerm)}` : "/library");
  };

  return (
    <section className="landing-hero relative isolate flex min-h-[600px] items-center overflow-hidden px-4 pb-12 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:min-h-[780px] lg:px-8 lg:pb-16 lg:pt-32">
      <div className="landing-hero-image absolute inset-0 -z-20" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,20,36,.90)_0%,rgba(2,20,36,.72)_45%,rgba(2,20,36,.30)_100%)]" />
      <div className="landing-light-ray absolute -right-20 top-0 -z-10 h-full w-1/2 opacity-70" aria-hidden="true" />
      <div className="landing-particle left-[12%] top-[22%]" /><div className="landing-particle left-[55%] top-[18%]" /><div className="landing-particle left-[83%] top-[42%]" />

      <div className="mx-auto grid w-full max-w-7xl gap-6 sm:gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12">
        <div className="landing-hero-content max-w-2xl text-white">
          <div className="mb-4 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-medium tracking-wide backdrop-blur-sm sm:mb-6 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7DD3FC]" />A connected library experience
          </div>

          <h1 className="max-w-xl text-2xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-4xl lg:text-6xl">
            Your library, <span className="text-[#7DD3FC]">within reach.</span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-200 sm:mt-6 sm:text-base sm:leading-7">
            Search, discover, and request the resources you need across Pampanga’s connected school libraries.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
            <Link to="/login" className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#0077B6] px-4 text-xs font-semibold text-white transition hover:bg-[#00669d] hover:shadow-lg hover:shadow-sky-950/30 sm:min-h-12 sm:px-5 sm:text-sm">
              Enter Libralink <FiArrowRight />
            </Link>
            <a href="#experience" className="inline-flex min-h-11 items-center justify-center border border-white/35 px-4 text-xs font-semibold text-white transition hover:bg-white/10 sm:min-h-12 sm:px-5 sm:text-sm">
              Explore the experience
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <BookCarousel onSelect={onBookSelect} />
        </div>
      </div>
    </section>
  );
}

const topicNavButtons = [
  { id: 1, label: "Physics", coverImage: "/books/einstein.jpg", title: "Relativity: The Special & General Theory", author: "Albert Einstein", tag: "PHYSICS & RELATIVITY" },
  { id: 2, label: "Literature", coverImage: "/books/shakespeare.jpg", title: "Shakespeare: The Complete Works", author: "William Shakespeare", tag: "LITERATURE & DRAMA" },
  { id: 3, label: "Comp Sci", coverImage: "/books/algorithms.jpg", title: "Introduction to Algorithms & Data Structures", author: "Dr. Eliza Vance & Prof. Liam Chen", tag: "COMPUTER SCIENCE" },
  { id: 4, label: "Nursing", coverImage: "/books/nursing.jpg", title: "Human Anatomy & Physiology & Nursing", author: "Elaine Marieb & Katja Hoehn", tag: "HEALTH & NURSING" },
  { id: 5, label: "Business", coverImage: "/books/economics.jpg", title: "Principles of Economics & Financial Accounting", author: "Eleanor Davies & Jonathan Thorne", tag: "BUSINESS & FINANCE" },
  { id: 6, label: "Psychology", coverImage: "/books/psychology.jpg", title: "Psychology: The Science of Mind & Behavior", author: "Dr. Eliza Vance & Dr. Liam Chen", tag: "PSYCHOLOGY & MIND" },
  { id: 7, label: "Engineering", coverImage: "/books/engineering.jpg", title: "Engineering Mechanics: Statics & Dynamics", author: "Rafael Navarro & Samuel Chen", tag: "ENGINEERING" },
  { id: 8, label: "History", coverImage: "/books/history.jpg", title: "Readings in Philippine History", author: "Manuel Quezon Jr. & Carmen Nakpil", tag: "PHILIPPINE HISTORY" },
];

function RelatedBooksSection({ selectedBook, onClose, onSelectTopic }) {
  const navigate = useNavigate();
  const activeTopicId = selectedBook?.id || 1;
  const topicData = relatedBooksMap[activeTopicId] || relatedBooksMap[1];
  const relatedList = topicData.books || [];

  const handleBorrow = (book) => {
    const searchTerm = (book?.title || "").trim();
    navigate(searchTerm ? `/library?search=${encodeURIComponent(searchTerm)}` : "/login");
  };

  const currentCover = selectedBook?.coverImage || topicNavButtons.find(t => t.id === activeTopicId)?.coverImage || "/books/einstein.jpg";

  return (
    <section id="curriculum-collection" className="scroll-mt-20 border-y border-slate-200 bg-white py-12 px-4 sm:px-6 sm:py-16 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/80 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-[#0077B6] border border-sky-200 mb-2.5">
              <FiLayers className="w-3.5 h-3.5" />
              <span>{selectedBook?.tag || topicData.course}</span>
              <span>•</span>
              <span>{topicData.course}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
              Related Books in {topicData.topic}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
              Curriculum-aligned library resources and physical copies currently available across connected campuses.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate(`/library?search=${encodeURIComponent(topicData.topic)}`)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition hover:bg-slate-50 hover:border-slate-400"
            >
              <span>Explore Complete Catalog</span>
              <FiExternalLink className="w-3.5 h-3.5" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="Hide Collection"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Discipline Switcher Pills */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {topicNavButtons.map((topic) => {
            const isActive = topic.id === activeTopicId;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onSelectTopic && onSelectTopic(topic)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#0077B6] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>

        {/* 2-Grid Native Page Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Grid: Selected Featured Book (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/80 p-6 sm:p-7 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#0077B6] text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider">
                  FEATURED TITLE
                </span>
                <span className="text-xs text-amber-500 flex items-center gap-1 font-bold">
                  <FiStar className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {selectedBook?.rating || "5.0"}
                </span>
              </div>

              {/* High-Res Full-Bleed Book Cover */}
              <div className="w-44 h-60 mx-auto rounded-xl shadow-xl border border-slate-200 overflow-hidden my-5 bg-slate-900">
                <img 
                  src={currentCover} 
                  alt={selectedBook?.title || topicData.topic}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/books/einstein.jpg";
                  }}
                />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-xl font-black text-slate-900 leading-snug">
                  {selectedBook?.title || topicData.topic}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  By <span className="font-bold text-slate-800">{selectedBook?.author || "Curriculum Faculty"}</span> • <span className="text-[#0077B6]">{selectedBook?.edition || "Scholarly Edition"}</span>
                </p>
                
                <div className="pt-2 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <FiCheckCircle className="w-3.5 h-3.5" /> Available in Network
                  </span>
                </div>

                <p className="text-xs text-slate-500 pt-2 leading-relaxed">
                  {topicData.description}
                </p>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleBorrow(selectedBook || topicNavButtons[0])}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0077B6] py-3.5 px-5 text-sm font-bold text-white shadow-md shadow-sky-900/20 transition hover:bg-[#00669d] hover:shadow-lg"
              >
                <FiBookOpen className="w-4 h-4" />
                <span>Borrow / Request This Title</span>
              </button>
            </div>
          </div>

          {/* Right Grid: 2-Column Subgrid of Related Curriculum Titles (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Recommended Curriculum Titles ({relatedList.length})
                </h3>
                <span className="text-[11px] text-[#0077B6] font-bold">Connected Libraries</span>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedList.map((book) => (
                  <div 
                    key={book.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-[#0077B6] hover:shadow-md group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-700">
                          {book.tag}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <FiCheck className="w-3 h-3" /> {book.copies} Copies
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-[#0077B6] transition-colors line-clamp-2">
                        {book.title}
                      </h4>

                      <p className="text-xs text-slate-500 font-medium">
                        {book.author}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 font-mono">
                        <span>{book.callNumber}</span>
                        <span>•</span>
                        <span>{book.edition}</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                        <FiStar className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {book.rating}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleBorrow(book)}
                        className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-[#0077B6] transition hover:bg-[#0077B6] hover:text-white"
                      >
                        <span>Request</span>
                        <FiArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function LibraryShelf() { 
  return (
    <section id="experience" className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Designed around your library day</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Everything connects in one place.</h2>
          <p className="mt-4 leading-7 text-[#64748B]">A focused, simple system for students and library teams—without the clutter.</p>
        </div>
        <div className="mt-12 border-b-8 border-[#5A3A26] bg-[#E8D8C7] px-4 pt-8 sm:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {shelfFeatures.map((feature, index) => (
              <FeatureBook key={feature.label} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  ); 
}

function FeatureBook({ feature, index }) { 
  const Icon = feature.icon; 
  const colors = ["bg-[#0077B6]", "bg-[#023E8A]", "bg-[#388697]", "bg-[#14532D]", "bg-[#475569]"]; 
  return (
    <article className={`group relative min-h-56 ${colors[index]} p-4 text-white transition duration-200 hover:-translate-y-3 hover:shadow-xl sm:min-h-64`}>
      <div className="flex justify-between text-[10px] font-semibold tracking-[.18em] text-white/65">
        <span>LIBRALINK</span><span>0{index + 1}</span>
      </div>
      <div className="mt-8">
        <Icon className="text-xl text-white/80" />
        <p className="mt-8 text-xs font-semibold tracking-[.16em] text-white/80">{feature.label}</p>
        <h3 className="mt-2 text-xl font-semibold">{feature.title}</h3>
      </div>
      <p className="absolute bottom-4 left-4 right-4 text-xs leading-5 text-white/80 opacity-0 transition duration-200 group-hover:opacity-100">
        {feature.description}
      </p>
    </article>
  ); 
}

function ConnectedLibraries() { 
  return (
    <section className="bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">One search, wider access</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Find the book, even when it isn’t nearby.</h2>
          <p className="mt-5 max-w-xl leading-7 text-[#64748B]">When a title is unavailable in your own library, Libralink helps you discover copies from connected participating libraries and submit a request with confidence.</p>
          <ul className="mt-8 space-y-4">
            {["Search your local catalog first", "See availability from connected libraries", "Send a borrowing request and receive updates"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E0F2FE] text-[#0077B6]"><FiCheck /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs text-slate-500">Searching for</p>
              <p className="mt-1 font-semibold">Database Management Systems</p>
            </div>
            <FiSearch className="text-[#0077B6]" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Available in connected libraries</p>
          <div className="relative mt-5 space-y-3 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-[#BDE3F6]">
            {["Your home library", "Connected library", "Selected library"].map((library, index) => (
              <div className="relative z-10 flex items-center gap-3" key={library}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white ${index === 2 ? "bg-[#0077B6] text-white" : "bg-[#E0F2FE] text-[#0077B6]"}`}>
                  <FiMapPin />
                </span>
                <div className="flex-1 border border-slate-100 px-3 py-2.5">
                  <p className="text-sm font-semibold">{library}</p>
                  <p className="text-xs text-[#16A34A]">Copy available</p>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#0077B6] py-3 text-sm font-semibold text-white">
            Request this book <FiSend />
          </button>
        </div>
      </div>
    </section>
  ); 
}

function OpenBook() { 
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden border border-slate-200 bg-[#FEFDFB] shadow-sm lg:grid lg:grid-cols-2">
          <div className="border-b border-slate-200 p-8 sm:p-12 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Discover</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.03em]">The resources that move your learning forward.</h2>
            <p className="mt-5 leading-7 text-[#64748B]">Search a familiar catalog and keep the titles that matter close.</p>
          </div>
          <div className="p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#388697]">Borrow</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.03em]">Requests without the guesswork.</h2>
            <p className="mt-5 leading-7 text-[#64748B]">Know what happens next, from request submission to library approval.</p>
            <Link to="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0077B6]">
              Get started <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  ); 
}

function FinalCta() { 
  return (
    <section className="relative overflow-hidden bg-[#023E8A] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_80%_25%,#7DD3FC,transparent_22%),radial-gradient(circle_at_20%_90%,#388697,transparent_28%)]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#7DD3FC]">Libralink</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Your next book is waiting.</h2>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-200">Discover a smarter way to search, explore, and borrow library resources.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/login" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 text-sm font-semibold text-[#023E8A] transition hover:bg-sky-50">
            Get started <FiArrowRight />
          </Link>
          <Link to="/about" className="inline-flex min-h-12 items-center justify-center border border-white/35 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
            Explore Libralink
          </Link>
        </div>
      </div>
    </section>
  ); 
}

function Footer() { 
  return (
    <footer className="bg-white px-4 py-8 text-center text-xs text-[#64748B] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
          <img src="/L.png" className="h-7 w-7 object-contain" alt="" /> Libralink
        </div>
        <p>© 2026 Libralink. A smarter library connection.</p>
        <div className="flex items-center gap-3">
          <FiShield className="text-[#0077B6]" /> Secure access for connected libraries
        </div>
      </div>
    </footer>
  ); 
}

function PartnerSchoolGallery() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadSchools = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/schools/public');
      const payload = Array.isArray(response) ? response : response?.data ?? [];
      const allSchools = Array.isArray(payload) ? payload : [];
      setSchools(allSchools.filter(Boolean).slice(0, 8));
    } catch (requestError) {
      console.error('Unable to load registered school gallery:', requestError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  if (!loading && !error && !schools.length) return null;

  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white py-10 sm:py-12" aria-labelledby="registered-schools-title">
      <div className="mx-auto mb-7 max-w-7xl px-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Partner schools</p>
        <h2 id="registered-schools-title" className="mt-2 text-3xl font-semibold tracking-[-.02em] text-[#0F172A] sm:text-5xl">
          Libraries connected with Libralink
        </h2>
      </div>

      {loading ? (
        <div className="mx-auto h-20 max-w-7xl animate-pulse bg-slate-100" aria-label="Loading registered schools" />
      ) : error ? (
        <div className="mx-auto max-w-xl px-4 text-center">
          <p className="text-sm text-[#64748B]">We could not load the registered schools right now.</p>
          <button type="button" onClick={loadSchools} className="mt-3 text-sm font-semibold text-[#0077B6]">
            Try again
          </button>
        </div>
      ) : (
        <div className="school-logo-marquee" aria-label="Schools connected with Libralink">
          <div className="school-logo-track">
            {[...schools, ...schools].map((school, index) => (
              <SchoolLogo key={`${school.school_id}-${index}`} school={school} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SchoolLogo({ school }) {
  const [failed, setFailed] = useState(false);
  const name = school.school_name || 'Registered school';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const logo = school.logo ? getBackendAssetUrl(school.logo) : '';

  return (
    <div className="school-logo-item" title={name}>
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-1 sm:h-16 sm:w-16">
        {!failed && logo ? (
          <img
            src={logo}
            alt={`${name} logo`}
            className="h-full w-full rounded-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#E0F2FE] text-xs font-bold text-[#0077B6]">
            {initials || 'SC'}
          </span>
        )}
      </span>
      <span className="max-w-32 truncate text-sm font-medium text-slate-600">{name}</span>
    </div>
  );
}

export default Home;
