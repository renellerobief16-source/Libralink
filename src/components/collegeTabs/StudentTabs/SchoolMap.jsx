import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, ExternalLink, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom school marker icon
const schoolIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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
    }
  }, [center, zoom, map]);
  return null;
}

function SchoolMap({ school, userLocation, onClose, minimal = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLoc, setUserLoc] = useState(userLocation);

  useEffect(() => {
    setLoading(false);
  }, [school]);

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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(false);
  }, [school]);

  if (!school?.latitude || !school?.longitude) {
    return (
      <div className="w-full h-64 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-center">
        <div className="text-center p-4">
          <MapPin className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
          <p className="text-xs text-[#64748B]">Location not available</p>
        </div>
      </div>
    );
  }

  const center = [school.latitude, school.longitude];

  return (
    <div className="relative w-full h-64">
      {loading && (
        <div className="absolute inset-0 bg-[#F7FAFC] rounded-xl flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 text-[#0077B6] animate-spin" />
        </div>
      )}
      <div className="w-full h-64 bg-[#F7FAFC] rounded-xl overflow-hidden">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: '256px', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapView center={center} zoom={15} />
          <Marker position={center} icon={schoolIcon} />
        </MapContainer>
      </div>
    </div>
  );
}

export default SchoolMap;
export { MinimalSchoolMap };
