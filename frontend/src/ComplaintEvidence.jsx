

import { useEffect, useState } from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents
} from 'react-leaflet';

import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import {
  ImagePlus,
  MapPin,
  LocateFixed,
  X
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';

// =========================================================
// LEAFLET MARKER ICON FIX FOR VITE
// =========================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

// =========================================================
// CONFIGURATION
// =========================================================

const DEFAULT_CENTER = [-26.2041, 28.0473];

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

// =========================================================
// MAP CLICK HANDLER
// =========================================================

function LocationMarker({ position, setPosition, interactive }) {
  useMapEvents({
    click(event) {
      if (!interactive || !setPosition) {
        return;
      }

      setPosition([
        event.latlng.lat,
        event.latlng.lng
      ]);
    }
  });

  return position ? (
    <Marker position={position} />
  ) : null;
}

// =========================================================
// MAP CENTER UPDATER
// =========================================================

function MapCenterUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom(), {
        duration: 0.8
      });
    }
  }, [position, map]);

  return null;
}

// =========================================================
// REUSABLE LOCATION MAP
// =========================================================

export function LocationMap({
  position,
  setPosition,
  height = '320px',
  zoom = 10,
  interactive = true
}) {
  const center = position || DEFAULT_CENTER;

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #dce2ea',
        position: 'relative'
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCenterUpdater position={position} />

        <LocationMarker
          position={position}
          setPosition={setPosition}
          interactive={interactive}
        />
      </MapContainer>
    </div>
  );
}

// =========================================================
// COMPLAINT EVIDENCE COMPONENT
// =========================================================

export default function ComplaintEvidence({
  photo,
  setPhoto,
  location,
  setLocation
}) {
  const [preview, setPreview] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState('');

  // =======================================================
  // PHOTO PREVIEW
  // =======================================================

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photo);

    setPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photo]);

  // =======================================================
  // HANDLE PHOTO UPLOAD
  // =======================================================

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    setError('');

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        'Please upload a JPG, PNG, or WEBP image.'
      );

      event.target.value = '';
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setError(
        'The photo must not exceed 5 MB.'
      );

      event.target.value = '';
      return;
    }

    setPhoto(file);
  }

  // =======================================================
  // REMOVE PHOTO
  // =======================================================

  function removePhoto() {
    setPhoto(null);

    const input = document.getElementById(
      'complaint-photo'
    );

    if (input) {
      input.value = '';
    }
  }

  // =======================================================
  // GET CURRENT GPS LOCATION
  // =======================================================

  function useCurrentLocation() {
    setError('');

    if (!navigator.geolocation) {
      setError(
        'Your browser does not support location services.'
      );

      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);

        setGpsLoading(false);
      },

      (gpsError) => {
        let message = 'Unable to retrieve your location.';

        if (gpsError.code === gpsError.PERMISSION_DENIED) {
          message =
            'Location permission was denied. Please allow location access in your browser.';
        } else if (
          gpsError.code === gpsError.POSITION_UNAVAILABLE
        ) {
          message =
            'Your current location is unavailable.';
        } else if (
          gpsError.code === gpsError.TIMEOUT
        ) {
          message =
            'Location request timed out. Please try again.';
        }

        setError(message);
        setGpsLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  // =======================================================
  // CLEAR LOCATION
  // =======================================================

  function clearLocation() {
    setLocation(null);
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="complaint-evidence">

      {/* PHOTO UPLOAD */}

      <div
        style={{
          marginTop: '20px',
          marginBottom: '24px'
        }}
      >
        <label
          htmlFor="complaint-photo"
          style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: '8px'
          }}
        >
          Attach a photograph (optional)
        </label>

        <p
          style={{
            color: '#64748b',
            fontSize: '13px',
            marginBottom: '12px'
          }}
        >
          Upload a photograph showing the reported issue.
          Maximum size: 5 MB.
        </p>

        <input
          id="complaint-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          style={{
            display: 'none'
          }}
        />

        <label
          htmlFor="complaint-photo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 16px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer',
            background: '#f8fafc',
            color: '#334155',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          <ImagePlus size={18} />
          Choose Photograph
        </label>

        {preview && (
          <div
            style={{
              position: 'relative',
              marginTop: '14px',
              maxWidth: '350px'
            }}
          >
            <img
              src={preview}
              alt="Complaint evidence preview"
              style={{
                display: 'block',
                width: '100%',
                maxHeight: '250px',
                objectFit: 'contain',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}
            />

            <button
              type="button"
              onClick={removePhoto}
              aria-label="Remove photograph"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                border: 'none',
                borderRadius: '50%',
                background: '#dc2626',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* LOCATION SELECTION */}

      <div
        style={{
          marginBottom: '20px'
        }}
      >
        <label
          style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: '8px'
          }}
        >
          Issue location (optional)
        </label>

        <p
          style={{
            color: '#64748b',
            fontSize: '13px',
            marginBottom: '12px'
          }}
        >
          Click on the map to mark where the issue is
          located, or use your current GPS location.
        </p>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={gpsLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
            border: 'none',
            borderRadius: '8px',
            background: '#2563eb',
            color: '#ffffff',
            fontWeight: 600,
            cursor: gpsLoading ? 'wait' : 'pointer',
            opacity: gpsLoading ? 0.7 : 1
          }}
        >
          <LocateFixed size={17} />

          {gpsLoading
            ? 'Getting location...'
            : 'Use My Current Location'}
        </button>

        <LocationMap
          position={location}
          setPosition={setLocation}
          height="320px"
          zoom={location ? 15 : 10}
          interactive={true}
        />

        {location && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginTop: '12px',
              padding: '12px',
              background: '#eff6ff',
              borderRadius: '8px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1e40af',
                fontSize: '13px'
              }}
            >
              <MapPin size={18} />

              <span>
                {location[0].toFixed(6)},
                {' '}
                {location[1].toFixed(6)}
              </span>
            </div>

            <button
              type="button"
              onClick={clearLocation}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 10px',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                background: '#ffffff',
                color: '#1d4ed8',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              <X size={14} />
              Clear location
            </button>
          </div>
        )}
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          style={{
            padding: '11px 13px',
            marginTop: '12px',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            fontSize: '13px'
          }}
        >
          {error}
        </div>
      )}

    </div>
  );
}
