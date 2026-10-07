import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Building2,
  Compass,
  CornerUpRight,
  ExternalLink,
  Navigation,
  Maximize2,
  Minimize2,
  Check,
  Copy,
  Layers,
  X,
  MapPin,
  BookOpen,
} from 'lucide-react';

/* ─── Leaflet (lazy-safe) ──────────────────────────────────────────────── */
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBookCoverUrl } from '../../../utils/bookCoverUtils';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ─── Tile Providers ───────────────────────────────────────────────────
 *  Roadmap:  Google Maps standard street map  (default)
 *  Satellite: Google Maps aerial imagery
 *  Note: using unofficial tile endpoint — no API key required
 * ────────────────────────────────────────────────────────────────────── */
const TILES = {
  map: {
    id: 'map',
    label: 'Map',
    emoji: '🗺️',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attribution: '© <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>',
    maxZoom: 20,
    tileSize: 256,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    emoji: '🛰️',
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attribution: '© <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>',
    maxZoom: 20,
    tileSize: 256,
  },
};

/* ─── Haversine Distance ─────────────────────────────────────────────── */
function distanceLabel(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d < 1 ? `${Math.round(d * 1000)} m away` : `${d.toFixed(1)} km away`;
}

import { API_ORIGIN } from '../../../utils/api';

/* ─── Logo URL Formatter ──────────────────────────────────────────────── */
function getLogoUrl(logo) {
  if (!logo) return '/L.png';
  if (
    logo.startsWith('http://') ||
    logo.startsWith('https://') ||
    logo.startsWith('data:') ||
    logo.startsWith('blob:')
  ) {
    return logo;
  }
  if (logo.startsWith('/')) return `${API_ORIGIN}${logo}`;
  return `${API_ORIGIN}/${logo}`;
}

/* ─── Campus Pin Icon with Official School Logo ────────────────────────── */
function makeCampusIcon(logoUrl = '/L.png', schoolName = 'Campus Library') {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        width:54px;height:66px;
        display:flex;flex-direction:column;align-items:center;
        filter:drop-shadow(0 6px 18px rgba(14,165,233,.55));
      ">
        <!-- outer pulse ring -->
        <span style="
          position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
          width:50px;height:22px;border-radius:50%;
          background:rgba(14,165,233,.32);
          animation:campusPing 2.4s cubic-bezier(0,0,.2,1) infinite;
        "></span>
        <!-- inner ring -->
        <span style="
          position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
          width:34px;height:15px;border-radius:50%;
          background:rgba(14,165,233,.22);
          animation:campusPing 2.4s cubic-bezier(0,0,.2,1) infinite .4s;
        "></span>
        <!-- pin body -->
        <div style="
          width:46px;height:46px;
          border-radius:50% 50% 50% 0;
          background:linear-gradient(145deg,#0EA5E9,#0369A1);
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          border:3px solid #fff;
          box-shadow:0 4px 16px rgba(14,165,233,.5),inset 0 1px 2px rgba(255,255,255,.3);
          overflow:hidden;
        ">
          <!-- circular logo container counter-rotated 45deg so logo is upright -->
          <div style="
            width:34px;height:34px;
            border-radius:50%;
            overflow:hidden;
            transform:rotate(45deg);
            display:flex;align-items:center;justify-content:center;
            background:#ffffff;
            border:1.5px solid #ffffff;
            box-shadow:0 1px 4px rgba(0,0,0,0.2);
          ">
            <img
              src="${logoUrl}"
              alt="${schoolName}"
              style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"
              onerror="this.onerror=null;this.src='/L.png';"
            />
          </div>
        </div>
        <!-- dot shadow -->
        <span style="
          width:14px;height:5px;background:rgba(0,0,0,.18);
          border-radius:50%;margin-top:4px;
        "></span>
      </div>
      <style>
        @keyframes campusPing {
          0%{transform:translateX(-50%) scale(1);opacity:.8}
          70%{transform:translateX(-50%) scale(2.2);opacity:0}
          100%{transform:translateX(-50%) scale(2.2);opacity:0}
        }
      </style>
    `,
    iconSize: [54, 66],
    iconAnchor: [27, 62],
    popupAnchor: [0, -58],
  });
}

/* ─── GPS Dot Icon ───────────────────────────────────────────────────── */
const gpsIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
      <span style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,.28);animation:gpsPulse 2s ease-in-out infinite;"></span>
      <span style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,.14);animation:gpsPulse 2s ease-in-out infinite .6s;"></span>
      <span style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,.45);position:relative;z-index:1;"></span>
    </div>
    <style>
      @keyframes gpsPulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.6);opacity:0}}
    </style>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

/* ─── Google Maps Style Floating ETA Bubble Callout ─────────────────── */
function createEtaMarkerIcon({ time, dist, travelMode = 'driving' }) {
  const iconEmoji = travelMode === 'walking' ? '🚶' : '🚗';
  return L.divIcon({
    className: 'custom-google-eta-badge',
    html: `
      <div style="
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #ffffff;
        border: 2px solid #1a73e8;
        border-radius: 20px;
        padding: 5px 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
        font-family: 'Poppins', system-ui, sans-serif;
        white-space: nowrap;
        transform: translate(-50%, -100%);
        pointer-events: auto;
      ">
        <span style="font-size: 13px;">${iconEmoji}</span>
        <div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.1;">
          <span style="font-size: 12px; font-weight: 800; color: #15803d;">${time}</span>
          <span style="font-size: 10px; font-weight: 600; color: #64748b;">${dist}</span>
        </div>
        <!-- Speech bubble pointer -->
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background: #ffffff;
          border-right: 2px solid #1a73e8;
          border-bottom: 2px solid #1a73e8;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/* ─── Map Sub-components ─────────────────────────────────────────────── */
function MapViewController({
  center,
  zoom = 17,
  route,
  sidebarOffset,
  markerRef,
  controllerRef,
  viewMode,
  setViewMode,
}) {
  const map = useMap();
  const initialZoomDone = useRef(false);
  const routeFlyTimeout = useRef(null);

  // Compute offset center if sidebar is open on large screens
  const getOffsetCampusCenter = useCallback(
    (targetCenter, targetZoom) => {
      if (!sidebarOffset || typeof window === 'undefined' || window.innerWidth < 1024) {
        return targetCenter;
      }
      const isXl = window.innerWidth >= 1280;
      const sidebarWidth = isXl ? 520 : 480;
      const pxOffset = sidebarWidth / 2;
      try {
        const pt = map.project(targetCenter, targetZoom).subtract([pxOffset, 0]);
        return map.unproject(pt, targetZoom);
      } catch {
        return targetCenter;
      }
    },
    [map, sidebarOffset]
  );

  const zoomToCampus = useCallback(
    (animate = true) => {
      if (!center) return;
      const targetZoom = 17;
      const offsetCenter = getOffsetCampusCenter(center, targetZoom);
      if (animate) {
        map.flyTo(offsetCenter, targetZoom, { duration: 1.2, easeLinearity: 0.25 });
      } else {
        map.setView(offsetCenter, targetZoom, { animate: false });
      }
      if (markerRef.current) {
        setTimeout(() => {
          try {
            markerRef.current.openPopup();
          } catch {}
        }, animate ? 600 : 200);
      }
      if (setViewMode) setViewMode('campus');
    },
    [center, getOffsetCampusCenter, map, markerRef, setViewMode]
  );

  const zoomToRoute = useCallback(
    (animate = true) => {
      if (!route || route.length < 2) return;
      const isLg = typeof window !== 'undefined' && window.innerWidth >= 1024;
      const isXl = typeof window !== 'undefined' && window.innerWidth >= 1280;
      const paddingLeft = sidebarOffset && isLg ? (isXl ? 540 : 500) : 44;
      const options = {
        paddingTopLeft: [paddingLeft, 44],
        paddingBottomRight: [44, 96],
      };
      if (animate) {
        map.flyToBounds(route, { ...options, duration: 1.5, easeLinearity: 0.25 });
      } else {
        map.fitBounds(route, { ...options, animate: false });
      }
      if (setViewMode) setViewMode('route');
    },
    [map, route, sidebarOffset, setViewMode]
  );

  // Expose controller methods
  useEffect(() => {
    if (controllerRef) {
      controllerRef.current = {
        zoomToCampus,
        zoomToRoute,
      };
    }
  }, [controllerRef, zoomToCampus, zoomToRoute]);

  // Initial layout & sizing
  useEffect(() => {
    if (!center) return;
    const tasks = [50, 150, 350, 700].map((ms) =>
      setTimeout(() => {
        map.invalidateSize({ animate: false });
        if (!initialZoomDone.current) {
          zoomToCampus(false);
          initialZoomDone.current = true;
        }
      }, ms)
    );
    return () => tasks.forEach(clearTimeout);
  }, [center, map, zoomToCampus]);

  // Cinematic zoom-out transition after route is available:
  // Hold for ~1.2s on campus so the user clearly sees the campus library & popup,
  // then smoothly fly/zoom out to show the full route!
  useEffect(() => {
    if (!route || route.length < 2) return;

    if (routeFlyTimeout.current) clearTimeout(routeFlyTimeout.current);

    routeFlyTimeout.current = setTimeout(() => {
      zoomToRoute(true);
    }, 1200);

    return () => {
      if (routeFlyTimeout.current) clearTimeout(routeFlyTimeout.current);
    };
  }, [route, zoomToRoute]);

  return null;
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function MapboxCampusMap({
  school,
  book,
  height = 340,
  onExpand,
  className = '',
  sidebarOffset = false,
}) {
  const markerRef = useRef(null);
  const mapControllerRef = useRef(null);
  const [viewMode, setViewMode] = useState('campus'); // 'campus' or 'route'
  const [tileKey, setTileKey] = useState('map');
  const [travelMode, setTravelMode] = useState('driving'); // 'driving' or 'walking'
  const [userLoc, setUserLoc] = useState(null);
  const [locating, setLocating] = useState(false);
  const [route, setRoute] = useState(null);
  const [animRoute, setAnimRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

  // Compute middle coordinate of route for floating ETA callout badge
  const routeMidpoint = useMemo(() => {
    if (!route || route.length < 2) return null;
    return route[Math.floor(route.length / 2)];
  }, [route]);

  const [resolvedLat, setResolvedLat] = useState(() => {
    const l = Number(school?.latitude);
    return Number.isFinite(l) && l !== 0 ? l : null;
  });
  const [resolvedLng, setResolvedLng] = useState(() => {
    const g = Number(school?.longitude);
    return Number.isFinite(g) && g !== 0 ? g : null;
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  // Automatic geocoding fallback if coordinates are missing
  useEffect(() => {
    const l = Number(school?.latitude);
    const g = Number(school?.longitude);
    if (Number.isFinite(l) && Number.isFinite(g) && l !== 0 && g !== 0) {
      setResolvedLat(l);
      setResolvedLng(g);
      return;
    }

    const name = school?.school_name || '';
    const addr = school?.address || '';
    const query = [name, addr, 'Philippines'].filter(Boolean).join(', ');
    if (!query || query === 'Philippines') return;

    let active = true;
    setIsGeocoding(true);

    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'LibraLink-Library-App/1.0' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const gLat = Number(data?.[0]?.lat);
        const gLng = Number(data?.[0]?.lon);
        if (Number.isFinite(gLat) && Number.isFinite(gLng)) {
          setResolvedLat(gLat);
          setResolvedLng(gLng);
        }
      })
      .catch((err) => {
        console.warn('[MapboxCampusMap] Geocoding fallback error:', err);
      })
      .finally(() => {
        if (active) setIsGeocoding(false);
      });

    return () => {
      active = false;
    };
  }, [school?.latitude, school?.longitude, school?.school_name, school?.address]);

  const valid = Number.isFinite(resolvedLat) && Number.isFinite(resolvedLng);
  const name = school?.school_name || 'Campus Library';
  const address = school?.address || 'Partner Campus';
  const rawLogo = school?.logo || school?.school_logo || school?.logo_url;
  const logoUrl = getLogoUrl(rawLogo);
  const center = useMemo(() => [resolvedLat || 14.9667, resolvedLng || 120.6353], [resolvedLat, resolvedLng]);
  const campusIcon = useMemo(() => makeCampusIcon(logoUrl, name), [logoUrl, name]);
  const tile = TILES[tileKey] || TILES.map;

  /* ── Book Cover Image URL ── */
  const bookCoverUrl = useMemo(() => {
    return getBookCoverUrl(book);
  }, [book]);

  /* ── Auto-open Marker Popup on Mount / Book Ready ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [center, book]);

  /* ── Route animation ── */
  useEffect(() => {
    if (!route || route.length < 2) { setAnimRoute(route); return; }
    let i = 2;
    setAnimRoute(route.slice(0, i));
    const iv = setInterval(() => {
      i += Math.max(1, Math.ceil(route.length / 40));
      if (i >= route.length) { setAnimRoute(route); clearInterval(iv); return; }
      setAnimRoute(route.slice(0, i));
    }, 35);
    return () => clearInterval(iv);
  }, [route]);

  /* ── Resize on fullscreen ── */
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
    return () => clearTimeout(t);
  }, [fullscreen]);

  /* ── Calculate route between user GPS and school library ── */
  const calculateRouteFromCoords = useCallback(async (uLat, uLng, targetLat, targetLng, mode = travelMode) => {
    setUserLoc({ lat: uLat, lng: uLng });
    setLocating(true);
    setPermissionStatus('granted');

    const profile = mode === 'walking' ? 'foot' : 'driving';
    try {
      const r = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${uLng},${uLat};${targetLng},${targetLat}?overview=full&geometries=geojson`
      );
      const d = await r.json();
      if (d.routes?.[0]) {
        const pts = d.routes[0].geometry.coordinates.map(([lo, la]) => [la, lo]);
        setRoute(pts);
        setRouteInfo({
          dist: (d.routes[0].distance / 1000).toFixed(1) + ' km',
          time: Math.round(d.routes[0].duration / 60) + (mode === 'walking' ? ' min walk' : ' min drive'),
        });
      } else {
        setRoute([[uLat, uLng], [targetLat, targetLng]]);
        const directDist = distanceLabel(uLat, uLng, targetLat, targetLng);
        if (directDist) {
          setRouteInfo({ dist: directDist, time: 'Direct path' });
        }
      }
    } catch (err) {
      console.warn('[MapboxCampusMap] Routing failed, using direct line:', err);
      setRoute([[uLat, uLng], [targetLat, targetLng]]);
      const directDist = distanceLabel(uLat, uLng, targetLat, targetLng);
      if (directDist) {
        setRouteInfo({ dist: directDist, time: 'Direct line' });
      }
    } finally {
      setLocating(false);
    }
  }, [travelMode]);

  /* ── Mode Change Handler ── */
  const handleTravelModeChange = (newMode) => {
    setTravelMode(newMode);
    if (userLoc && valid) {
      calculateRouteFromCoords(userLoc.lat, userLoc.lng, resolvedLat, resolvedLng, newMode);
    }
  };

  /* ── GPS + OSRM route trigger ── */
  const handleRoute = useCallback((showPromptAlert = false) => {
    if (!navigator.geolocation) {
      if (showPromptAlert) alert('Geolocation is not supported by your browser.');
      return;
    }
    if (!valid) return;

    setLocating(true);
    setPermissionStatus('locating');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        calculateRouteFromCoords(coords.latitude, coords.longitude, resolvedLat, resolvedLng, travelMode);
      },
      (err) => {
        setLocating(false);
        setPermissionStatus('denied');
        console.info('[MapboxCampusMap] Geolocation access not granted:', err?.message);
        if (showPromptAlert) {
          alert('Location permission was denied. Please allow location access in your browser settings to view live directions.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, [valid, resolvedLat, resolvedLng, calculateRouteFromCoords, travelMode]);

  // Automatically request location and calculate route upon viewing map
  useEffect(() => {
    if (valid) {
      handleRoute(false);
    }
  }, [valid, handleRoute]);

  const openGMaps = () =>
    window.open(
      `https://www.google.com/maps/dir/?api=1${userLoc ? `&origin=${userLoc.lat},${userLoc.lng}` : ''}&destination=${resolvedLat},${resolvedLng}&travelmode=driving`,
      '_blank'
    );

  const openWaze = () =>
    window.open(`https://waze.com/ul?ll=${resolvedLat},${resolvedLng}&navigate=yes`, '_blank');

  const copyAddr = () =>
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  const dist = userLoc && valid ? distanceLabel(userLoc.lat, userLoc.lng, resolvedLat, resolvedLng) : null;

  /* ── Loading geocoding state ── */
  if (isGeocoding && !valid) {
    return (
      <div
        className={`flex w-full items-center justify-center ${
          height === '100%' ? 'h-full rounded-none border-0' : 'rounded-2xl border border-slate-200'
        } bg-gradient-to-br from-slate-50 to-blue-50`}
        style={{ height: height === '100%' ? '100%' : (typeof height === 'number' ? height : 280) }}
      >
        <div className="flex items-center gap-2.5 text-blue-600">
          <Navigation className="h-5 w-5 animate-spin" />
          <span className="text-xs font-semibold">Locating campus library…</span>
        </div>
      </div>
    );
  }

  /* ── No coords fallback ── */
  if (!valid) {
    return (
      <div
        className={`flex w-full items-center justify-center ${
          height === '100%' ? 'h-full rounded-none border-0' : 'rounded-2xl border border-slate-200'
        } bg-gradient-to-br from-slate-50 to-blue-50`}
        style={{ height: height === '100%' ? '100%' : (typeof height === 'number' ? height : 280) }}
      >
        <div className="text-center p-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-500">
            <MapPin className="h-7 w-7" />
          </div>
          <p className="text-sm font-bold text-slate-800">{name}</p>
          <p className="text-xs text-slate-400 mt-1">Map coordinates not available</p>
        </div>
      </div>
    );
  }

  const heightPx = fullscreen ? '100vh' : typeof height === 'number' ? `${height}px` : (height || '340px');

  return (
    <>
      {/* ── Keyframe styles injected once ── */}
      <style>{`
        .ll-map-wrap .leaflet-container { background: #e8edf2 !important; }
        .ll-map-wrap .leaflet-tile-pane img { border-radius: 0 !important; }
        .ll-map-wrap .leaflet-control-zoom {
          position: absolute !important;
          right: 14px !important;
          bottom: 88px !important;
          top: auto !important;
          left: auto !important;
          border: none !important;
          box-shadow: 0 4px 16px rgba(0,0,0,.15) !important;
          border-radius: 12px !important;
          overflow: hidden;
          z-index: 750 !important;
        }
        .ll-map-wrap .leaflet-control-zoom-in,
        .ll-map-wrap .leaflet-control-zoom-out {
          background: rgba(255,255,255,.95) !important;
          border: none !important;
          color: #334155 !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          transition: background .15s !important;
        }
        .ll-map-wrap .leaflet-control-zoom-in:hover,
        .ll-map-wrap .leaflet-control-zoom-out:hover {
          background: #EFF6FF !important;
          color: #2563EB !important;
        }
        .ll-map-wrap .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 28px rgba(0,0,0,.16) !important;
          border: 1px solid rgba(226,232,240,.8) !important;
          padding: 0 !important;
        }
        .ll-map-wrap .leaflet-popup-content { margin: 0 !important; }
        .ll-map-wrap .leaflet-popup-tip { background: #fff !important; }
        .ll-map-wrap .leaflet-attribution-flag { display: none !important; }
        .ll-map-wrap .leaflet-control-attribution {
          background: rgba(255,255,255,.7) !important;
          backdrop-filter: blur(6px) !important;
          font-size: 9px !important;
          border-radius: 8px 0 0 0 !important;
          padding: 2px 6px !important;
          color: #94a3b8 !important;
        }
        .custom-google-eta-badge {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      <div
        className={`ll-map-wrap relative w-full overflow-hidden transition-all duration-300 ${
          fullscreen
            ? 'fixed inset-0 z-[9999] rounded-none border-0 shadow-none'
            : height === '100%' || height === '100vh'
            ? 'h-full rounded-none border-0 shadow-none'
            : 'rounded-2xl border border-slate-200/80 shadow-lg'
        } ${className}`}
        style={{ height: heightPx, minHeight: fullscreen ? '100vh' : (height === '100%' ? '100%' : '260px') }}
      >
        {/* ── Leaflet Map ── */}
        <MapContainer
          center={center}
          zoom={16}
          zoomControl
          scrollWheelZoom
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <TileLayer
            key={tile.id}
            url={tile.url}
            {...(tile.subdomains ? { subdomains: tile.subdomains } : {})}
            attribution={tile.attribution}
            maxZoom={tile.maxZoom}
            tileSize={tile.tileSize}
            crossOrigin=""
          />
          <MapViewController
            center={center}
            zoom={17}
            route={route}
            sidebarOffset={sidebarOffset}
            markerRef={markerRef}
            controllerRef={mapControllerRef}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {/* Campus Marker */}
          <Marker
            ref={(ref) => {
              markerRef.current = ref;
              if (ref) {
                setTimeout(() => ref.openPopup(), 400);
              }
            }}
            position={center}
            icon={campusIcon}
          >
            <Popup closeButton={false}>
              {book ? (
                <div className="w-[270px] sm:w-[290px] overflow-hidden rounded-[14px] bg-white font-sans text-slate-800 shadow-xl border border-slate-200/80">
                  {/* 1. Header: School Badge & Identity */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50/90 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-slate-200/90 bg-white p-0.5 shadow-2xs">
                        <img
                          src={logoUrl}
                          alt={name}
                          className="h-full w-full object-contain rounded-full"
                          onError={(e) => { e.currentTarget.src = '/L.png'; }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{name}</p>
                        {address && (
                          <p className="text-[9px] text-slate-400 truncate leading-none mt-0.5">{address}</p>
                        )}
                      </div>
                    </div>
                    {school?.school_code && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200/80 shadow-2xs shrink-0">
                        {school.school_code}
                      </span>
                    )}
                  </div>

                  {/* 2. Middle Body: Book Artwork & Specifications */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Book Cover */}
                    <div className="relative h-[68px] w-[48px] shrink-0 overflow-hidden rounded-lg border border-slate-200/90 bg-gradient-to-br from-slate-50 to-slate-100 shadow-xs">
                      {bookCoverUrl ? (
                        <img
                          src={bookCoverUrl}
                          alt={book.title || 'Book cover'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.ll-book-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`ll-book-fallback h-full w-full flex flex-col items-center justify-center p-1 text-center ${
                          bookCoverUrl ? 'hidden' : ''
                        }`}
                      >
                        <BookOpen className="h-4 w-4 text-slate-400 mb-0.5" />
                        <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">Book</span>
                      </div>
                    </div>

                    {/* Book Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2" title={book.title}>
                        {book.title || 'Academic Resource'}
                      </p>
                      {book.author && (
                        <p className="text-[10px] font-medium text-slate-500 truncate">
                          by {book.author}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${
                          (book.available_copies !== undefined ? book.available_copies : 1) > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            (book.available_copies !== undefined ? book.available_copies : 1) > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <span>
                            {(book.available_copies !== undefined ? book.available_copies : 1) > 0
                              ? `${book.available_copies || 1} available`
                              : 'All in use'}
                          </span>
                        </span>

                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-100">
                          Library Use Only
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Footer: Route Info & Quick Directions Link */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border-t border-slate-100">
                    {routeInfo ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                        <Navigation className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{routeInfo.dist} • {routeInfo.time}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>Campus Library</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGMaps();
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0077B6] hover:text-[#005f8f] transition hover:underline cursor-pointer"
                      title="Open directions in Google Maps"
                    >
                      <span>Directions</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-[240px] overflow-hidden rounded-[14px] bg-white font-sans text-slate-800 shadow-xl border border-slate-200/80">
                  <div className="flex items-center gap-2.5 p-3">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 shadow-2xs">
                      <img
                        src={logoUrl}
                        alt={name}
                        className="h-full w-full object-contain rounded-full"
                        onError={(e) => { e.currentTarget.src = '/L.png'; }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight truncate">{name}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{address}</p>
                    </div>
                  </div>
                  {routeInfo && (
                    <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 font-bold text-emerald-700">
                        <Navigation className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{routeInfo.dist} • {routeInfo.time}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGMaps();
                        }}
                        className="font-semibold text-[#0077B6] hover:underline cursor-pointer"
                      >
                        Directions
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Popup>
          </Marker>

          {/* User GPS */}
          {userLoc && (
            <>
              <Circle
                center={[userLoc.lat, userLoc.lng]}
                radius={90}
                pathOptions={{ color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 0.12, weight: 1.5, dashArray: '4 4' }}
              />
              <Marker position={[userLoc.lat, userLoc.lng]} icon={gpsIcon}>
                <Popup closeButton={false}>
                  <div className="px-3 py-2 text-[12px] font-semibold text-slate-700">📍 You are here</div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Route Line with Google Maps Style & Floating ETA Callout */}
          {animRoute && (
            <>
              {/* Outer dark blue casing */}
              <Polyline
                positions={animRoute}
                pathOptions={{ color: '#1E40AF', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
              />
              {/* Vibrant inner road line */}
              <Polyline
                positions={animRoute}
                pathOptions={{ color: '#2563EB', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
              />

              {/* Floating Google Maps Style ETA Bubble Callout */}
              {routeMidpoint && routeInfo && (
                <Marker
                  position={routeMidpoint}
                  icon={createEtaMarkerIcon({
                    time: routeInfo.time,
                    dist: routeInfo.dist,
                    travelMode,
                  })}
                  interactive={false}
                />
              )}
            </>
          )}
        </MapContainer>

        {/* ── Top HUD ── */}
        <div
          className={`absolute inset-x-0 top-0 z-[800] pointer-events-none px-3 pt-3 transition-all duration-300 ${
            sidebarOffset ? 'lg:pl-[500px] xl:pl-[540px]' : 'lg:pl-3'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            {/* Campus name badge with school logo (Click to zoom into campus) */}
            <div
              onClick={() => mapControllerRef.current?.zoomToCampus(true)}
              className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm max-w-[calc(100%-200px)] sm:max-w-[calc(100%-240px)] cursor-pointer hover:bg-sky-50/80 hover:border-sky-300 transition-all active:scale-95 group"
              title="Click to zoom in to campus library"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs group-hover:border-sky-400 transition-colors">
                <img
                  src={logoUrl}
                  alt={name}
                  className="h-full w-full object-contain rounded-lg"
                  onError={(e) => { e.currentTarget.src = '/L.png'; }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-900 truncate leading-tight group-hover:text-sky-700 transition-colors">{name}</p>
                {(routeInfo || dist) && (
                  <p className="text-[10px] font-semibold text-sky-600 leading-tight mt-0.5">
                    {routeInfo ? `${routeInfo.dist} · ${routeInfo.time}` : dist}
                  </p>
                )}
              </div>
            </div>

            {/* Right controls */}
            <div className="pointer-events-auto flex items-center gap-1.5 mr-12 sm:mr-14">
              {/* View Mode Toggle: Campus vs Full Route */}
              {route && (
                <div className="flex items-center rounded-xl border border-white/70 bg-white/95 p-0.5 shadow-lg backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => mapControllerRef.current?.zoomToCampus(true)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition active:scale-95 ${
                      viewMode === 'campus'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                    title="Zoom in to Campus Library"
                  >
                    <span>📍</span>
                    <span className="hidden sm:inline">Campus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => mapControllerRef.current?.zoomToRoute(true)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition active:scale-95 ${
                      viewMode === 'route'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                    title="Zoom out to Full Route"
                  >
                    <span>🗺️</span>
                    <span className="hidden sm:inline">Route</span>
                  </button>
                </div>
              )}

              {/* Drive / Walk Mode Switcher */}
              <div className="flex items-center rounded-xl border border-white/70 bg-white/95 p-0.5 shadow-lg backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => handleTravelModeChange('driving')}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition active:scale-95 ${
                    travelMode === 'driving'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-600'
                  }`}
                  title="Driving route"
                >
                  <span>🚗</span>
                  <span className="hidden sm:inline">Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTravelModeChange('walking')}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition active:scale-95 ${
                    travelMode === 'walking'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-600'
                  }`}
                  title="Walking route"
                >
                  <span>🚶</span>
                  <span className="hidden sm:inline">Walk</span>
                </button>
              </div>

              {/* Layer switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLayers((p) => !p)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/95 text-slate-600 shadow-lg backdrop-blur-sm hover:bg-sky-50 hover:text-sky-700 transition active:scale-95"
                  title="Change map style"
                >
                  <Layers className="h-4 w-4" />
                </button>
                {showLayers && (
                  <div className="absolute right-0 top-10 z-50 w-36 rounded-2xl border border-white/80 bg-white/98 p-1.5 shadow-2xl backdrop-blur-md">
                    {Object.values(TILES).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setTileKey(t.id); setShowLayers(false); }}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition-all ${
                          tileKey === t.id
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{t.emoji}</span>
                        {t.label}
                        {tileKey === t.id && <Check className="ml-auto h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={() => { if (onExpand) onExpand(); else setFullscreen((f) => !f); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/95 text-slate-600 shadow-lg backdrop-blur-sm hover:bg-sky-50 hover:text-sky-700 transition active:scale-95"
                title={fullscreen ? 'Exit' : 'Fullscreen'}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              {fullscreen && (
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/95 text-rose-500 shadow-lg backdrop-blur-sm hover:bg-rose-50 transition active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Compact Bottom Action Card (Slim 2-Row Design) ── */}
        <div
          className={`absolute inset-x-0 bottom-0 z-[800] px-2.5 pb-2.5 pointer-events-none transition-all duration-300 ${
            sidebarOffset ? 'lg:pl-[500px] xl:pl-[540px]' : 'lg:pl-2.5'
          }`}
        >
          <div className="pointer-events-auto rounded-2xl border border-white/90 bg-white/95 p-2 sm:p-2.5 shadow-lg backdrop-blur-md">
            {/* Row 1: Address + Live Route Pill / Status */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                <p className="text-[11px] font-medium text-slate-600 truncate">{address}</p>
                <button
                  type="button"
                  onClick={copyAddr}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-sky-600 transition"
                  title="Copy address"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              {/* Inline Live Route Tag (Click to zoom out to route) */}
              {routeInfo ? (
                <button
                  type="button"
                  onClick={() => mapControllerRef.current?.zoomToRoute(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80 shrink-0 hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
                  title="Click to zoom out to full route"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{routeInfo.dist} · {routeInfo.time}</span>
                </button>
              ) : locating ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 shrink-0">
                  <Navigation className="h-3 w-3 animate-spin" />
                  <span>Routing…</span>
                </span>
              ) : null}
            </div>

            {/* Row 2: Compact Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleRoute(true)}
                disabled={locating}
                className={`flex items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 disabled:opacity-60 shrink-0 ${
                  route
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                <Navigation className={`h-3 w-3 ${locating ? 'animate-spin' : route ? 'text-emerald-500' : ''}`} />
                <span>{locating ? 'Locating…' : route ? 'Re-Route' : 'Route'}</span>
              </button>

              <button
                type="button"
                onClick={openGMaps}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold text-white shadow-xs hover:from-sky-700 hover:to-blue-700 transition-all active:scale-95"
              >
                <CornerUpRight className="h-3.5 w-3.5" />
                <span>Google Maps</span>
              </button>

              <button
                type="button"
                onClick={openWaze}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shrink-0"
              >
                <ExternalLink className="h-3 w-3 text-cyan-500" />
                <span>Waze</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tile style label watermark */}
        <div className="absolute bottom-[62px] right-2.5 z-[700] pointer-events-none">
          <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[8px] font-bold text-white/80 uppercase tracking-wider backdrop-blur-sm">
            {tile.emoji} {tile.label}
          </span>
        </div>
      </div>
    </>
  );
}
