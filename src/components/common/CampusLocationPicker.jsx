import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Search, 
  Crosshair, 
  Navigation, 
  Check, 
  Loader2, 
  AlertCircle, 
  Compass, 
  Layers,
  Map as MapIcon,
  HelpCircle,
  BookOpen,
  X
} from 'lucide-react';

// Fix Leaflet default icon paths in bundler environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Dynamic pin generator with school logo & glowing beacon
function createLibraryPinIcon(logoUrl) {
  const hasLogo = Boolean(logoUrl && typeof logoUrl === 'string' && logoUrl.trim().length > 0);
  const logoHtml = hasLogo
    ? `<img src="${logoUrl}" alt="logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; padding: 2px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
       <div style="display:none; width: 100%; height: 100%; align-items: center; justify-content: center; color: #2563eb;">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
           <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
           <path d="M6 6h10"></path>
           <path d="M6 10h10"></path>
         </svg>
       </div>`
    : `<div style="display:flex; width: 100%; height: 100%; align-items: center; justify-content: center; color: #2563eb;">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
           <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
           <path d="M6 6h10"></path>
           <path d="M6 10h10"></path>
         </svg>
       </div>`;

  return new L.DivIcon({
    className: 'custom-library-pin-wrapper',
    html: `
      <div style="position: relative; width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center;">
        <div style="position: absolute; top: 0; width: 42px; height: 42px; background: rgba(37, 99, 235, 0.3); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; z-index: 2; width: 40px; height: 40px; background: #ffffff; border: 3px solid #2563eb; border-radius: 50%; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28); display: flex; align-items: center; justify-content: center; overflow: hidden;">
          ${logoHtml}
        </div>
        <div style="position: relative; top: -6px; z-index: 1; width: 12px; height: 12px; background: #2563eb; transform: rotate(45deg); border-radius: 0 0 3px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
      </div>
    `,
    iconSize: [44, 50],
    iconAnchor: [22, 46],
    popupAnchor: [0, -44],
  });
}

// Component to handle map clicks & center updates
function MapClickHandler({ onPositionChange }) {
  useMapEvents({
    click(e) {
      if (e?.latlng) {
        onPositionChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Recenter helper
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, map.getZoom() > 14 ? map.getZoom() : 16, { duration: 1 });
    }
  }, [center, map]);
  return null;
}

// Invalidate size helper (fixes blank tiles when rendered inside animated modals/tabs)
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

export default function CampusLocationPicker({
  initialLat,
  initialLng,
  latitude,
  longitude,
  initialAddress = '',
  address = '',
  schoolName = 'Campus Library',
  schoolLogo,
  logoUrl,
  logo,
  onChange,
  height = 360,
  className = '',
}) {
  const defaultLat = 14.9667; // Pampanga center
  const defaultLng = 120.6353;

  const rawLat = latitude !== undefined && latitude !== null ? latitude : initialLat;
  const rawLng = longitude !== undefined && longitude !== null ? longitude : initialLng;

  const validLat = Number.isFinite(Number(rawLat)) && Number(rawLat) !== 0 ? Number(rawLat) : null;
  const validLng = Number.isFinite(Number(rawLng)) && Number(rawLng) !== 0 ? Number(rawLng) : null;

  const [position, setPosition] = useState([validLat || defaultLat, validLng || defaultLng]);
  const [hasExplicitPin, setHasExplicitPin] = useState(Boolean(validLat && validLng));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [reverseAddress, setReverseAddress] = useState(address || initialAddress || '');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [tileMode, setTileMode] = useState('voyager'); // 'voyager' (Google Roadmap) or 'satellite' (Google Satellite)
  const searchTimeoutRef = useRef(null);
  const markerRef = useRef(null);
  const searchContainerRef = useRef(null);

  const displayLogo = schoolLogo || logoUrl || logo;
  const activePinIcon = useMemo(() => {
    return createLibraryPinIcon(displayLogo);
  }, [displayLogo]);

  // Click outside search container to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync if coordinates change externally
  useEffect(() => {
    if (validLat && validLng) {
      setPosition([validLat, validLng]);
      setHasExplicitPin(true);
    }
  }, [validLat, validLng]);

  // Reverse geocode to auto-fill address when pin moves
  const fetchAddressForCoords = useCallback(async (lat, lng) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'LibraLink-Campus-Picker/1.0' } }
      );
      const data = await res.json();
      if (data?.display_name) {
        setReverseAddress(data.display_name);
        return data.display_name;
      }
    } catch (err) {
      console.warn('[CampusLocationPicker] Reverse geocoding failed:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
    return '';
  }, []);

  // Handle position update
  const handleUpdateCoords = useCallback(async (newLat, newLng, overrideAddress = null) => {
    const lat = Number(Number(newLat).toFixed(6));
    const lng = Number(Number(newLng).toFixed(6));
    setPosition([lat, lng]);
    setHasExplicitPin(true);

    let addressToUse = overrideAddress;
    if (!addressToUse) {
      addressToUse = await fetchAddressForCoords(lat, lng);
    }

    if (onChange) {
      onChange({
        latitude: lat,
        longitude: lng,
        address: addressToUse || reverseAddress,
      });
    }
  }, [fetchAddressForCoords, onChange, reverseAddress]);

  // Handle search query with Nominatim
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim() || val.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = val.includes('Philippines') ? val : `${val}, Philippines`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent(query)}`,
          { headers: { 'User-Agent': 'LibraLink-Campus-Picker/1.0' } }
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('[CampusLocationPicker] Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  // Select search result
  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setSearchQuery(result.display_name);
      setSearchResults([]);
      setReverseAddress(result.display_name);
      handleUpdateCoords(lat, lon, result.display_name);
    }
  };

  // Handle marker drag
  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const latlng = marker.getLatLng();
      handleUpdateCoords(latlng.lat, latlng.lng);
    }
  };

  // Use GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handleUpdateCoords(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        alert(`Could not fetch current location: ${err.message}. Please allow location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className={`relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}>
      {/* ── Top Bar: Search & Controls ── */}
      <div className="relative z-50 p-3.5 bg-slate-50/90 rounded-t-2xl border-b border-slate-200">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Box with Click-Outside Dropdown */}
          <div ref={searchContainerRef} className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search campus name, street, or city (e.g. Fatima San Fernando)..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Floating Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-[9999] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-60 overflow-y-auto ring-1 ring-slate-900/15">
                <div className="p-1.5 space-y-0.5">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full px-3 py-2 text-left rounded-xl text-slate-700 hover:bg-blue-50/90 hover:text-blue-700 flex items-start gap-2.5 transition"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 mt-0.5 shrink-0 border border-blue-100">
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-[12px] truncate">{item.name || item.display_name.split(',')[0]}</p>
                        <p className="text-[10.5px] text-slate-400 line-clamp-1 mt-0.5">{item.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              title="Pin using your device's current GPS location"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition shadow-2xs disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Crosshair className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>My GPS</span>
            </button>

            <button
              type="button"
              onClick={() => setTileMode((prev) => (prev === 'voyager' ? 'satellite' : 'voyager'))}
              title="Toggle Satellite Imagery"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition shadow-2xs ${
                tileMode === 'satellite'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{tileMode === 'satellite' ? 'Satellite' : 'Map'}</span>
            </button>
          </div>
        </div>

        {/* Tip helper */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <HelpCircle className="h-3 w-3 text-blue-500" />
            <span>Click anywhere on the map or drag the pin to position the library.</span>
          </span>
          {isReverseGeocoding && (
            <span className="flex items-center gap-1 text-blue-600 animate-pulse font-medium">
              <Loader2 className="h-3 w-3 animate-spin" /> Resolving address...
            </span>
          )}
        </div>
      </div>

      {/* ── Interactive Leaflet Map ── */}
      <div className="relative z-10 w-full overflow-hidden" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        <style>{`
          .custom-campus-popup .leaflet-popup-content-wrapper {
            border-radius: 16px !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            border: 1px solid rgba(226, 232, 240, 0.9) !important;
            padding: 2px !important;
          }
          .custom-campus-popup .leaflet-popup-content {
            margin: 0 !important;
          }
          .custom-campus-popup .leaflet-popup-tip {
            background: #ffffff !important;
          }
          .custom-campus-popup a.leaflet-popup-close-button {
            top: 8px !important;
            right: 8px !important;
            color: #94a3b8 !important;
            font-size: 16px !important;
            width: 20px !important;
            height: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .custom-library-pin-wrapper {
            background: transparent !important;
            border: none !important;
          }
        `}</style>
        <MapContainer
          center={position}
          zoom={hasExplicitPin ? 17 : 14}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        >
          <ZoomControl position="bottomright" />
          {tileMode === 'satellite' ? (
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>'
              url="https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              subdomains="0123"
              maxZoom={20}
              tileSize={256}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>'
              url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains="0123"
              maxZoom={20}
              tileSize={256}
            />
          )}

          <MapResizer />
          <MapRecenter center={position} />
          <MapClickHandler onPositionChange={handleUpdateCoords} />

          <Marker
            draggable={true}
            position={position}
            icon={activePinIcon}
            ref={markerRef}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
          >
            <Popup className="custom-campus-popup">
              <div className="p-2.5 text-center max-w-[230px] font-sans">
                {/* Logo Badge */}
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md">
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white overflow-hidden p-1">
                    {displayLogo ? (
                      <img
                        src={displayLogo}
                        alt={schoolName}
                        className="h-full w-full object-contain rounded-lg"
                        onError={(e) => { e.currentTarget.src = '/L.png'; }}
                      />
                    ) : (
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>

                {/* School / Library Name */}
                <h4 className="font-bold text-xs text-slate-800 leading-snug line-clamp-2 mb-1.5">
                  {schoolName || 'Campus Library'}
                </h4>

                {/* Full Address */}
                {(reverseAddress || address || initialAddress) && (
                  <div className="mb-2 flex items-start justify-center gap-1 text-[11px] text-slate-600 leading-tight bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
                    <span className="line-clamp-2 text-left font-medium">{reverseAddress || address || initialAddress}</span>
                  </div>
                )}

                {/* GPS Coordinates Pill */}
                <div className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-blue-700 border border-blue-100 mb-1.5">
                  <span>📍 {position[0].toFixed(5)}, {position[1].toFixed(5)}</span>
                </div>

                {/* Drag Hint */}
                <div className="pt-1.5 border-t border-slate-100 text-[9.5px] text-slate-400 font-medium flex items-center justify-center gap-1">
                  <Crosshair className="h-3 w-3 text-blue-500" />
                  <span>Drag pin to exact entrance</span>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* ── Bottom Bar: Coordinates Summary ── */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-semibold text-[11px] ${
            hasExplicitPin ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${hasExplicitPin ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>Lat: {position[0].toFixed(6)}</span>
            <span>&bull;</span>
            <span>Lng: {position[1].toFixed(6)}</span>
          </div>
          {hasExplicitPin && (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Pinned
            </span>
          )}
        </div>

        {reverseAddress && (
          <p className="text-[11px] text-slate-500 truncate max-w-sm" title={reverseAddress}>
            <span className="font-semibold text-slate-600">Address: </span>
            {reverseAddress}
          </p>
        )}
      </div>
    </div>
  );
}
