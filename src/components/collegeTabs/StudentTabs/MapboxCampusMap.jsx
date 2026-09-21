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
} from 'lucide-react';

/* ─── Leaflet (lazy-safe) ──────────────────────────────────────────────── */
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ─── Tile Providers (all verified, no auth needed) ─────────────────────
 *  Primary: OpenStreetMap  →  always works, free, high-res
 *  Satellite: ESRI World Imagery  →  free, no key, sharp aerial
 *  Clean: Carto Voyager (fixed, no {r})  →  modern minimalist
 * ────────────────────────────────────────────────────────────────────── */
const TILES = {
  map: {
    id: 'map',
    label: 'Map',
    emoji: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: undefined,
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
    tileSize: 256,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    emoji: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: undefined,
    attribution: '© Esri, Maxar',
    maxZoom: 19,
    tileSize: 256,
  },
  clean: {
    id: 'clean',
    label: 'Clean',
    emoji: '✨',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attribution: '© CARTO © OSM',
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

/* ─── Map Sub-components ─────────────────────────────────────────────── */
function MapSetup({ center, zoom }) {
  const map = useMap();
  const ready = useRef(false);

  useEffect(() => {
    if (!center) return;
    // Run multiple invalidations to ensure tiles load after container paint
    const tasks = [50, 200, 500, 1000].map((ms) =>
      setTimeout(() => {
        map.invalidateSize({ animate: false });
        if (!ready.current) {
          map.setView(center, zoom, { animate: false });
          ready.current = true;
        }
      }, ms)
    );
    return () => tasks.forEach(clearTimeout);
  }, [center, zoom, map]);

  return null;
}

function FitRoute({ route }) {
  const map = useMap();
  useEffect(() => {
    if (route?.length > 1) map.fitBounds(route, { padding: [44, 44], animate: true });
  }, [map, route]);
  return null;
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function MapboxCampusMap({ school, height = 340, onExpand }) {
  const [tileKey, setTileKey] = useState('map');
  const [userLoc, setUserLoc] = useState(null);
  const [locating, setLocating] = useState(false);
  const [route, setRoute] = useState(null);
  const [animRoute, setAnimRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

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
  const calculateRouteFromCoords = useCallback(async (uLat, uLng, targetLat, targetLng) => {
    setUserLoc({ lat: uLat, lng: uLng });
    setLocating(true);
    setPermissionStatus('granted');

    try {
      const r = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${targetLng},${targetLat}?overview=full&geometries=geojson`
      );
      const d = await r.json();
      if (d.routes?.[0]) {
        const pts = d.routes[0].geometry.coordinates.map(([lo, la]) => [la, lo]);
        setRoute(pts);
        setRouteInfo({
          dist: (d.routes[0].distance / 1000).toFixed(1) + ' km',
          time: Math.round(d.routes[0].duration / 60) + ' min drive',
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
  }, []);

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
        calculateRouteFromCoords(coords.latitude, coords.longitude, resolvedLat, resolvedLng);
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
  }, [valid, resolvedLat, resolvedLng, calculateRouteFromCoords]);

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
        className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50"
        style={{ height: typeof height === 'number' ? height : 280 }}
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
        className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50"
        style={{ height: typeof height === 'number' ? height : 280 }}
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
          border: none !important;
          box-shadow: 0 4px 16px rgba(0,0,0,.13) !important;
          border-radius: 12px !important;
          overflow: hidden;
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
      `}</style>

      <div
        className={`ll-map-wrap relative w-full overflow-hidden transition-all duration-300 ${
          fullscreen
            ? 'fixed inset-0 z-[9999] rounded-none border-0 shadow-none'
            : 'rounded-2xl border border-slate-200/80 shadow-lg'
        }`}
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
          <MapSetup center={center} zoom={16} />
          {route && <FitRoute route={route} />}

          {/* Campus Marker */}
          <Marker position={center} icon={campusIcon}>
            <Popup closeButton={false}>
              <div className="flex items-start gap-2.5 p-2.5 min-w-[200px]">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                  <img
                    src={logoUrl}
                    alt={name}
                    className="h-full w-full object-contain rounded-lg"
                    onError={(e) => { e.currentTarget.src = '/L.png'; }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 leading-tight">{name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{address}</p>
                  {routeInfo && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <Compass className="h-3 w-3" /> {routeInfo.dist} · {routeInfo.time}
                    </div>
                  )}
                </div>
              </div>
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

          {/* Route Line */}
          {animRoute && (
            <>
              {/* Outline / glow */}
              <Polyline
                positions={animRoute}
                pathOptions={{ color: '#93C5FD', weight: 10, opacity: 0.35 }}
              />
              {/* Main line */}
              <Polyline
                positions={animRoute}
                pathOptions={{ color: '#2563EB', weight: 5, opacity: 0.95 }}
              />
            </>
          )}
        </MapContainer>

        {/* ── Top HUD ── */}
        <div className="absolute inset-x-0 top-0 z-[800] pointer-events-none px-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            {/* Campus name badge with school logo */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm max-w-[calc(100%-120px)]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                <img
                  src={logoUrl}
                  alt={name}
                  className="h-full w-full object-contain rounded-lg"
                  onError={(e) => { e.currentTarget.src = '/L.png'; }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-900 truncate leading-tight">{name}</p>
                {(routeInfo || dist) && (
                  <p className="text-[10px] font-semibold text-sky-600 leading-tight mt-0.5">
                    {routeInfo ? `${routeInfo.dist} · ${routeInfo.time}` : dist}
                  </p>
                )}
              </div>
            </div>

            {/* Right controls */}
            <div className="pointer-events-auto flex items-center gap-1.5">
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

        {/* ── Bottom Action Card ── */}
        <div className="absolute inset-x-0 bottom-0 z-[800] px-3 pb-3 pointer-events-none">
          <div className="pointer-events-auto rounded-2xl border border-white/80 bg-white/97 p-3 shadow-xl backdrop-blur-sm">
            {/* Address row */}
            <div className="flex items-center gap-2 mb-2.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              <p className="flex-1 text-[11px] font-medium text-slate-600 line-clamp-1">{address}</p>
              <button
                type="button"
                onClick={copyAddr}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-sky-600 transition"
                title="Copy address"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>

            {/* Live route / status banner */}
            {routeInfo ? (
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 font-bold truncate">
                  <Navigation className="h-3.5 w-3.5 text-emerald-600 shrink-0 animate-pulse" />
                  <span className="truncate">{routeInfo.dist} · {routeInfo.time} to library</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 shrink-0 uppercase tracking-wide">
                  Live Route
                </span>
              </div>
            ) : locating ? (
              <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800">
                <Navigation className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
                <span className="truncate">Determining your GPS location & directions…</span>
              </div>
            ) : permissionStatus === 'denied' && !userLoc ? (
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                <span className="truncate">📍 Location access needed for live route & driving time</span>
                <button
                  type="button"
                  onClick={() => handleRoute(true)}
                  className="shrink-0 font-bold text-amber-900 underline hover:text-amber-700"
                >
                  Enable / Retry
                </button>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleRoute(true)}
                disabled={locating}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-60 ${
                  route
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                <Navigation className={`h-3.5 w-3.5 ${locating ? 'animate-spin' : route ? 'text-emerald-500' : ''}`} />
                <span>{locating ? 'Locating…' : route ? 'Re-Route' : 'Get Route'}</span>
              </button>

              <button
                type="button"
                onClick={openGMaps}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:from-sky-700 hover:to-blue-700 transition-all active:scale-95"
              >
                <CornerUpRight className="h-3.5 w-3.5" />
                <span>Google Maps</span>
              </button>

              <button
                type="button"
                onClick={openWaze}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5 text-cyan-500" />
                <span>Waze</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tile style label watermark */}
        <div className="absolute bottom-[88px] right-3 z-[700] pointer-events-none">
          <span className="rounded-lg bg-black/30 px-2 py-0.5 text-[9px] font-bold text-white/80 uppercase tracking-wider backdrop-blur-sm">
            {tile.emoji} {tile.label}
          </span>
        </div>
      </div>
    </>
  );
}
