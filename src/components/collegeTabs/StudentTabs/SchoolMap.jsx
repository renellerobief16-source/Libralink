import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, ExternalLink, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { API_BASE_URL } from '../../../utils/api';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom school marker icon
const schoolIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:50%;background:#0077B6;border:3px solid white;box-shadow:0 2px 6px rgba(15,23,42,.28);position:relative"><span style="display:block;width:6px;height:6px;position:absolute;left:5px;top:5px;border-radius:50%;background:white"></span></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 24],
  popupAnchor: [0, -22],
});

// Custom user location marker icon
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapView({ center, zoom, children }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
      window.requestAnimationFrame(() => map.invalidateSize());
    }
  }, [center, zoom, map]);
  return null;
}

function RouteView({ route }) {
  const map = useMap();

  useEffect(() => {
    if (route?.length > 1) {
      map.fitBounds(route, { padding: [24, 24] });
    }
  }, [map, route]);

  return null;
}

function SchoolMap({ school, userLocation, onClose, minimal = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLoc, setUserLoc] = useState(userLocation);

  useEffect(() => {
    setLoading(false);
  }, [school?.address, school?.latitude, school?.longitude, school?.school_name]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLoc(userLoc);
        setLoading(false);
      },
      (error) => {
        setError('Unable to get your location. Please enable location services.');
        setLoading(false);
      }
    );
  };

  const openGoogleMapsDirections = () => {
    if (!school?.latitude || !school?.longitude) return;

    const origin = userLoc?.lat && userLoc?.lng
      ? `${userLoc.lat},${userLoc.lng}`
      : '';

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${school.latitude},${school.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (!school?.latitude || !school?.longitude) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">School location coordinates not available</p>
        </div>
      </div>
    );
  }

  const center = [school.latitude, school.longitude];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">School Location</h2>
          <p className="text-gray-600 text-sm">View the partner school location and get directions</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* School Info */}
      <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
        <div className="flex items-start gap-3">
          <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">{school?.school_name}</h3>
            <p className="text-sm text-blue-700">{school?.address || 'Address not available'}</p>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative mb-6">
        {loading && (
          <div className="absolute inset-0 bg-gray-100 rounded-xl flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}

        <div className="w-full h-96 bg-gray-200 rounded-xl overflow-hidden">
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, OpenStreetMap contributors'
              url={`${API_BASE_URL}/map-tiles/{z}/{y}/{x}`}
            />
            <MapView center={center} zoom={15} />
            <Marker position={center} icon={schoolIcon}>
              <Popup>
                <div style={{ padding: '8px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold' }}>{school.school_name}</h3>
                  <p style={{ margin: '0', fontSize: '12px' }}>{school.address || 'Address not available'}</p>
                </div>
              </Popup>
            </Marker>
            {userLoc && (
              <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
                <Popup>Your Location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!userLoc && (
          <button
            onClick={getUserLocation}
            className="flex-1 px-6 py-3 rounded-xl border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            Get My Location
          </button>
        )}
        <button
          onClick={openGoogleMapsDirections}
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          Open in Google Maps
        </button>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Note:</span> The map shows the partner school location. 
          Click "Get My Location" to see your position and get directions to the school.
        </p>
      </div>
    </div>
  );
}

// Minimal version for sidebar display
function MinimalSchoolMap({ school }) {
  const [loading, setLoading] = useState(true);
  const [coordinates, setCoordinates] = useState(null);
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [route, setRoute] = useState(null);
  const [animatedRoute, setAnimatedRoute] = useState(null);
  const [gettingDirections, setGettingDirections] = useState(false);
  const [locationError, setLocationError] = useState("");
  const autoRouteRequested = useRef(false);

  const requestRoute = (destinationCoordinates) => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setGettingDirections(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const origin = [position.coords.latitude, position.coords.longitude];
        setUserCoordinates(origin);
        setUserAccuracy(position.coords.accuracy);

        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destinationCoordinates[1]},${destinationCoordinates[0]}?overview=full&geometries=geojson`,
          );
          const data = await response.json();
          const routePoints = data.routes?.[0]?.geometry?.coordinates?.map(
            ([longitude, latitude]) => [latitude, longitude],
          );
          setRoute(routePoints?.length > 1 ? routePoints : [origin, destinationCoordinates]);
        } catch {
          setRoute([origin, destinationCoordinates]);
        } finally {
          setGettingDirections(false);
        }
      },
      (error) => {
        setGettingDirections(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access to show directions from you to this school."
            : "Unable to get your current location. Try again."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    if (!route || route.length < 2) {
      setAnimatedRoute(route);
      return undefined;
    }

    let pointIndex = 2;
    setAnimatedRoute(route.slice(0, pointIndex));
    const animation = window.setInterval(() => {
      pointIndex += Math.max(1, Math.ceil(route.length / 35));
      if (pointIndex >= route.length) {
        setAnimatedRoute(route);
        window.clearInterval(animation);
        return;
      }
      setAnimatedRoute(route.slice(0, pointIndex));
    }, 45);

    return () => window.clearInterval(animation);
  }, [route]);

  useEffect(() => {
    let cancelled = false;

    const loadCoordinates = async () => {
      setLoading(true);
      setCoordinates(null);

      let schoolDetails = school;

      if (school?.school_id && !school?.address && !school?.latitude && !school?.longitude) {
        try {
          const response = await api.get(`/schools/${school.school_id}`);
          schoolDetails = response.data || response;
        } catch {
          schoolDetails = school;
        }
      }

      const schoolAddress = schoolDetails?.address?.trim();
      const schoolName = schoolDetails?.school_name || school?.school_name;
      const savedCoordinates = schoolDetails?.latitude && schoolDetails?.longitude
        ? [Number(schoolDetails.latitude), Number(schoolDetails.longitude)]
        : null;

      if (!schoolAddress && !schoolName) {
        if (savedCoordinates) setCoordinates(savedCoordinates);
        setLoading(false);
        return;
      }

      try {
        const queries = [
          [schoolName, "Guagua", "Pampanga", "Philippines"].filter(Boolean).join(", "),
          [schoolAddress, "Philippines"].filter(Boolean).join(", "),
          [schoolName, schoolAddress, "Philippines"].filter(Boolean).join(", "),
        ];
        let geocodedCoordinates = null;

        for (const query of queries) {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
          );
          const results = await response.json();
          const latitude = Number(results[0]?.lat);
          const longitude = Number(results[0]?.lon);

          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            geocodedCoordinates = [latitude, longitude];
            break;
          }
        }

        if (!cancelled) {
          setCoordinates(geocodedCoordinates || savedCoordinates);
        }
      } catch {
        if (!cancelled) setCoordinates(savedCoordinates);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCoordinates();

    return () => {
      cancelled = true;
    };
  }, [school?.address, school?.latitude, school?.longitude, school?.school_id, school?.school_name]);

  useEffect(() => {
    if (coordinates && !autoRouteRequested.current) {
      autoRouteRequested.current = true;
      requestRoute(coordinates);
    }
  }, [coordinates]);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-[#F7FAFC]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0077B6]" />
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-[#F7FAFC]">
        <div className="text-center p-4">
          <MapPin className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
          <p className="text-xs text-[#64748B]">Location not available</p>
        </div>
      </div>
    );
  }

  const center = coordinates;
  const openDirections = () => {
    requestRoute(center);
  };

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 bg-[#F7FAFC] rounded-xl flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 text-[#0077B6] animate-spin" />
        </div>
      )}
      <div className="relative h-full min-h-0 w-full overflow-hidden rounded-none bg-slate-100">
        <MapContainer
          center={center}
          zoom={16}
          className="h-full min-h-0 w-full"
          style={{ minHeight: '100%' }}
          zoomControl
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={`${API_BASE_URL}/map-tiles/{z}/{y}/{x}`}
          />
          <MapView center={center} zoom={16} />
          <RouteView route={route} />
          <Marker position={center} icon={schoolIcon}>
            <Popup>{school?.school_name || 'School location'}</Popup>
          </Marker>
          {userCoordinates && (
            <>
              {userAccuracy && (
                <Circle
                  center={userCoordinates}
                  radius={userAccuracy}
                  pathOptions={{ color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.12, weight: 1 }}
                />
              )}
              <Marker position={userCoordinates} icon={userIcon}>
                <Popup>Your exact current location</Popup>
              </Marker>
            </>
          )}
          {animatedRoute && <Polyline positions={animatedRoute} pathOptions={{ color: '#0077B6', weight: 5, opacity: 0.92 }} />}
        </MapContainer>
        {!route && !gettingDirections && (
          <button
            type="button"
            onClick={openDirections}
            className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#0077B6] shadow-md hover:bg-[#F0F9FF]"
          >
            <Navigation className="h-3.5 w-3.5" />
            Route from my location
          </button>
        )}
      </div>
      <div className="space-y-2 px-1 pt-2">
        <button
          type="button"
          onClick={openDirections}
          disabled={gettingDirections}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0077B6] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#005f8f] disabled:cursor-wait disabled:opacity-60"
        >
          {gettingDirections ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
          {gettingDirections ? "Finding you..." : "From My Location"}
        </button>
        {locationError && <p className="text-center text-[11px] leading-4 text-rose-600">{locationError}</p>}
        {route && <p className="text-center text-[11px] font-medium text-emerald-600">Route from your location to {school?.school_name || "this school"} is shown on the map.</p>}
      </div>
    </div>
  );
}

export default SchoolMap;
export { MinimalSchoolMap };
