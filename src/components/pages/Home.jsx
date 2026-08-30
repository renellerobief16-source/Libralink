import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBookOpen, FiCheck, FiClock, FiCompass, FiMapPin, FiSearch, FiSend, FiShield, FiX } from "react-icons/fi";
import Navigation from "./Navigation";
import api, { getBackendAssetUrl } from "../../utils/api";

const suggestions = ["Introduction to Information Systems", "Database Management Systems", "Software Engineering", "Web Development"];
const shelfFeatures = [
  { label: "SEARCH", title: "Smart search", description: "Search titles, authors, subjects, and ISBNs in one clear catalog.", icon: FiSearch },
  { label: "DISCOVER", title: "Connected libraries", description: "Discover available resources beyond your home library.", icon: FiCompass },
  { label: "BORROW", title: "Simple requests", description: "Request a title and track every step of your borrowing journey.", icon: FiBookOpen },
  { label: "LOCATE", title: "Find the shelf", description: "See the library and shelf details before you walk in.", icon: FiMapPin },
  { label: "UPDATE", title: "Stay informed", description: "Receive helpful updates for requests, loans, and due dates.", icon: FiClock },
];

function Home() {
  return <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0F172A]"><Navigation /><Hero /><LibraryShelf /><ConnectedLibraries /><OpenBook /><PartnerSchoolGallery /><FinalCta /><Footer /></div>;
}

function Hero() {
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const matchingSuggestions = suggestions.filter((title) => title.toLowerCase().includes(query.toLowerCase()));
  return <section className="landing-hero relative isolate flex min-h-[600px] items-center overflow-hidden px-4 pb-12 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:min-h-[780px] lg:px-8 lg:pb-16 lg:pt-32">
    <div className="landing-hero-image absolute inset-0 -z-20" aria-hidden="true" />
    <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,20,36,.90)_0%,rgba(2,20,36,.72)_45%,rgba(2,20,36,.30)_100%)]" />
    <div className="landing-light-ray absolute -right-20 top-0 -z-10 h-full w-1/2 opacity-70" aria-hidden="true" />
    <div className="landing-particle left-[12%] top-[22%]" /><div className="landing-particle left-[55%] top-[18%]" /><div className="landing-particle left-[83%] top-[42%]" />
    <div className="mx-auto grid w-full max-w-7xl gap-6 sm:gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12">
      <div className="landing-hero-content max-w-2xl text-white"><div className="mb-4 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-medium tracking-wide backdrop-blur-sm sm:mb-6 sm:text-xs"><span className="h-1.5 w-1.5 rounded-full bg-[#7DD3FC]" />A connected library experience</div><h1 className="max-w-xl text-2xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-4xl lg:text-6xl">Your library, <span className="text-[#7DD3FC]">within reach.</span></h1><p className="mt-4 max-w-lg text-sm leading-6 text-slate-200 sm:mt-6 sm:text-base sm:leading-7">Search, discover, and request the resources you need across your connected school libraries.</p><div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row"><Link to="/login" className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#0077B6] px-4 text-xs font-semibold text-white transition hover:bg-[#00669d] hover:shadow-lg hover:shadow-sky-950/30 sm:min-h-12 sm:px-5 sm:text-sm">Enter Libralink <FiArrowRight /></Link><a href="#experience" className="inline-flex min-h-11 items-center justify-center border border-white/35 px-4 text-xs font-semibold text-white transition hover:bg-white/10 sm:min-h-12 sm:px-5 sm:text-sm">Explore the experience</a></div></div>
      <div className="landing-search-panel relative mx-auto w-full max-w-xl border border-white/20 bg-white/[.94] p-3 text-[#0F172A] shadow-2xl shadow-slate-950/30 backdrop-blur-md sm:p-4 lg:p-5"><div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 sm:mb-4 sm:pb-3"><div className="flex items-center gap-2 text-xs font-semibold sm:text-sm"><FiBookOpen className="text-[#0077B6]" /> Libralink catalog</div><span className="text-[10px] text-slate-500 sm:text-xs">All connected libraries</span></div><label className={`flex min-h-12 items-center gap-3 border bg-white px-3 transition sm:min-h-14 sm:px-4 ${isSearchFocused ? "border-[#0077B6] ring-4 ring-[#0077B6]/10" : "border-slate-200"}`}><FiSearch className="shrink-0 text-base text-[#0077B6] sm:text-lg" /><input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)} placeholder="Search books, authors, or ISBN..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400 sm:text-sm" aria-label="Search the catalog" />{query && <button type="button" onClick={() => setQuery("")} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Clear search"><FiX /></button>}</label><div className={`overflow-hidden transition-all duration-200 ${isSearchFocused ? "mt-2 max-h-80 opacity-100 sm:mt-3" : "max-h-0 opacity-0"}`}><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400 sm:mb-2 sm:text-[11px]">Suggested titles</p><div className="space-y-1">{(matchingSuggestions.length ? matchingSuggestions : suggestions).map((title, index) => <button key={title} type="button" className="flex w-full items-center gap-3 px-2 py-2 text-left transition hover:bg-slate-50 sm:py-2.5"><span className={`flex h-7 w-5 items-center justify-center text-[9px] font-bold text-white sm:h-8 sm:w-6 sm:text-[10px] ${index % 2 ? "bg-[#388697]" : "bg-[#0077B6]"}`}>BK</span><span className="flex-1 truncate text-xs font-medium sm:text-sm">{title}</span><span className="text-[10px] text-[#16A34A] sm:text-xs">Available</span></button>)}</div></div></div>
    </div>
  </section>;
}

function LibraryShelf() { return <section id="experience" className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Designed around your library day</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Everything connects in one place.</h2><p className="mt-4 leading-7 text-[#64748B]">A focused, simple system for students and library teams—without the clutter.</p></div><div className="mt-12 border-b-8 border-[#5A3A26] bg-[#E8D8C7] px-4 pt-8 sm:px-8"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">{shelfFeatures.map((feature, index) => <FeatureBook key={feature.label} feature={feature} index={index} />)}</div></div></div></section>; }
function FeatureBook({ feature, index }) { const Icon = feature.icon; const colors = ["bg-[#0077B6]", "bg-[#023E8A]", "bg-[#388697]", "bg-[#14532D]", "bg-[#475569]"]; return <article className={`group relative min-h-56 ${colors[index]} p-4 text-white transition duration-200 hover:-translate-y-3 hover:shadow-xl sm:min-h-64`}><div className="flex justify-between text-[10px] font-semibold tracking-[.18em] text-white/65"><span>LIBRALINK</span><span>0{index + 1}</span></div><div className="mt-8"><Icon className="text-xl text-white/80" /><p className="mt-8 text-xs font-semibold tracking-[.16em] text-white/80">{feature.label}</p><h3 className="mt-2 text-xl font-semibold">{feature.title}</h3></div><p className="absolute bottom-4 left-4 right-4 text-xs leading-5 text-white/80 opacity-0 transition duration-200 group-hover:opacity-100">{feature.description}</p></article>; }
function ConnectedLibraries() { return <section className="bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">One search, wider access</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Find the book, even when it isn’t nearby.</h2><p className="mt-5 max-w-xl leading-7 text-[#64748B]">When a title is unavailable in your own library, Libralink helps you discover copies from connected participating libraries and submit a request with confidence.</p><ul className="mt-8 space-y-4">{["Search your local catalog first", "See availability from connected libraries", "Send a borrowing request and receive updates"].map((item) => <li key={item} className="flex items-center gap-3 text-sm font-medium"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E0F2FE] text-[#0077B6]"><FiCheck /></span>{item}</li>)}</ul></div><div className="relative border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-xs text-slate-500">Searching for</p><p className="mt-1 font-semibold">Database Management Systems</p></div><FiSearch className="text-[#0077B6]" /></div><p className="mt-6 text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Available in connected libraries</p><div className="relative mt-5 space-y-3 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-[#BDE3F6]">{["Your home library", "Connected library", "Selected library"].map((library, index) => <div className="relative z-10 flex items-center gap-3" key={library}><span className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white ${index === 2 ? "bg-[#0077B6] text-white" : "bg-[#E0F2FE] text-[#0077B6]"}`}><FiMapPin /></span><div className="flex-1 border border-slate-100 px-3 py-2.5"><p className="text-sm font-semibold">{library}</p><p className="text-xs text-[#16A34A]">Copy available</p></div></div>)}</div><button type="button" className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#0077B6] py-3 text-sm font-semibold text-white">Request this book <FiSend /></button></div></div></section>; }
function OpenBook() { return <section className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="mx-auto max-w-6xl"><div className="overflow-hidden border border-slate-200 bg-[#FEFDFB] shadow-sm lg:grid lg:grid-cols-2"><div className="border-b border-slate-200 p-8 sm:p-12 lg:border-b-0 lg:border-r"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Discover</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em]">The resources that move your learning forward.</h2><p className="mt-5 leading-7 text-[#64748B]">Search a familiar catalog and keep the titles that matter close.</p></div><div className="p-8 sm:p-12"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#388697]">Borrow</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.03em]">Requests without the guesswork.</h2><p className="mt-5 leading-7 text-[#64748B]">Know what happens next, from request submission to library approval.</p><Link to="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0077B6]">Get started <FiArrowRight /></Link></div></div></div></section>; }
function FinalCta() { return <section className="relative overflow-hidden bg-[#023E8A] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28"><div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_80%_25%,#7DD3FC,transparent_22%),radial-gradient(circle_at_20%_90%,#388697,transparent_28%)]" /><div className="relative mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#7DD3FC]">Libralink</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Your next book is waiting.</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-slate-200">Discover a smarter way to search, explore, and borrow library resources.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/login" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 text-sm font-semibold text-[#023E8A] transition hover:bg-sky-50">Get started <FiArrowRight /></Link><Link to="/about" className="inline-flex min-h-12 items-center justify-center border border-white/35 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Explore Libralink</Link></div></div></section>; }
function Footer() { return <footer className="bg-white px-4 py-8 text-center text-xs text-[#64748B] sm:px-6"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row"><div className="flex items-center gap-2 font-semibold text-[#0F172A]"><img src="/L.png" className="h-7 w-7 object-contain" alt="" /> Libralink</div><p>© 2026 Libralink. A smarter library connection.</p><div className="flex items-center gap-3"><FiShield className="text-[#0077B6]" /> Secure access for connected libraries</div></div></footer>; }
function PartnerSchoolGallery() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadSchools = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/schools/public');
      setSchools(response?.data || []);
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
  const carouselSchools = [...schools, ...schools];

  return <section className="overflow-hidden border-y border-slate-200 bg-white py-10 sm:py-12" aria-labelledby="registered-schools-title"><div className="mx-auto mb-7 max-w-7xl px-4 text-center sm:px-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Partner schools</p><h2 id="registered-schools-title" className="mt-2 text-xl font-semibold tracking-[-.02em] text-[#0F172A] sm:text-2xl">Libraries connected with Libralink</h2></div>{loading ? <div className="mx-auto h-20 max-w-7xl animate-pulse bg-slate-100" aria-label="Loading registered schools" /> : error ? <div className="mx-auto max-w-xl px-4 text-center"><p className="text-sm text-[#64748B]">We couldn’t load the registered schools right now.</p><button type="button" onClick={loadSchools} className="mt-3 text-sm font-semibold text-[#0077B6]">Try again</button></div> : <div className="school-logo-marquee" aria-label="Registered schools"><div className="school-logo-track">{carouselSchools.map((school, index) => <SchoolLogo key={`${school.school_id}-${index}`} school={school} />)}</div></div>}</section>;
}

function SchoolLogo({ school }) {
  const [failed, setFailed] = useState(false);
  const name = school.school_name || 'Registered school';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const logo = school.logo ? getBackendAssetUrl(school.logo) : '';
  return <div className="school-logo-item" title={name}><span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-1 sm:h-16 sm:w-16">{logo && !failed ? <img src={logo} alt={`${name} logo`} className="h-full w-full rounded-full object-contain" onError={() => setFailed(true)} /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-[#E0F2FE] text-xs font-bold text-[#0077B6]">{initials}</span>}</span><span className="max-w-32 truncate text-sm font-medium text-slate-600">{name}</span></div>;
}

export default Home;
