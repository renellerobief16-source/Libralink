/**
 * SchoolMap.jsx
 * Full-modal and minimal map wrappers.
 * Delegates all map rendering to MapboxCampusMap (premium tile engine).
 */
import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import MapboxCampusMap from './MapboxCampusMap';
import api from '../../../utils/api';

/* ───────────────────────────────────────────────────────────────────────
 * SchoolMap (Full-modal wrapper)
 * Used when the user clicks "View Full Map" on a school.
 * ─────────────────────────────────────────────────────────────────────── */
function SchoolMap({ school, onClose }) {
  const lat = Number(school?.latitude);
  const lng = Number(school?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  if (!hasCoords) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-10">
        <div className="text-center">
          <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">{school?.school_name || 'Campus'}</p>
          <p className="text-xs text-slate-400 mt-0.5">Map coordinates not available</p>
        </div>
      </div>
    );
  }

  return (
    <MapboxCampusMap
      school={school}
      height={480}
      onExpand={onClose}
    />
  );
}

/* ───────────────────────────────────────────────────────────────────────
 * MinimalSchoolMap (Embedded compact map)
 * Used in:
 *  - Partner Library Catalogue modal
 *  - Book Detail pages
 *  - School search result cards (expandable)
 *
 * Props:
 *  school   – school object (school_id, school_name, address, latitude, longitude)
 *  height   – explicit pixel height (number). REQUIRED for Leaflet to render tiles.
 *             Defaults to 280. Do NOT pass '100%'.
 *  onExpand – optional callback when user clicks the expand button
 * ─────────────────────────────────────────────────────────────────────── */
function MinimalSchoolMap({ school, height = 280, onExpand }) {
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCoords(null);

    const run = async () => {
      let details = school;

      // Fetch full details if only school_id is available
      if (school?.school_id && !school?.latitude && !school?.longitude) {
        try {
          const res = await api.get(`/schools/${school.school_id}`);
          details = res.data || res;
        } catch {
          details = school;
        }
      }

      const savedLat = Number(details?.latitude);
      const savedLng = Number(details?.longitude);

      // Use saved coords if present
      if (Number.isFinite(savedLat) && Number.isFinite(savedLng)) {
        if (!cancelled) { setCoords([savedLat, savedLng]); setLoading(false); }
        return;
      }

      // Geocode via Nominatim as fallback
      const name = details?.school_name || school?.school_name;
      const addr = details?.address?.trim();

      if (!name && !addr) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const queries = [
          [name, 'Pampanga', 'Philippines'].filter(Boolean).join(', '),
          [addr, 'Philippines'].filter(Boolean).join(', '),
          [name, addr, 'Philippines'].filter(Boolean).join(', '),
        ];

        for (const q of queries) {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
          );
          const data = await res.json();
          const gLat = Number(data[0]?.lat);
          const gLng = Number(data[0]?.lon);
          if (Number.isFinite(gLat) && Number.isFinite(gLng)) {
            if (!cancelled) { setCoords([gLat, gLng]); break; }
          }
        }
      } catch {
        /* no coords found */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [school?.address, school?.latitude, school?.longitude, school?.school_id, school?.school_name]);

  const resolvedHeight = typeof height === 'number' ? height : 280;

  if (loading) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-sky-50"
        style={{ height: resolvedHeight }}
      >
        <div className="flex items-center gap-2.5 text-sky-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs font-semibold">Loading map…</span>
        </div>
      </div>
    );
  }

  if (!coords) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4"
        style={{ height: resolvedHeight }}
      >
        <div className="text-center">
          <MapPin className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-700">{school?.school_name || 'Campus'}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Location not available</p>
        </div>
      </div>
    );
  }

  return (
    <MapboxCampusMap
      school={{
        ...school,
        latitude: coords[0],
        longitude: coords[1],
      }}
      height={resolvedHeight}
      onExpand={onExpand}
    />
  );
}

export default SchoolMap;
export { MinimalSchoolMap };
