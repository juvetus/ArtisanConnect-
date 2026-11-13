'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '@/lib/language-context';
import 'leaflet/dist/leaflet.css';

const defaultCenter: [number, number] = [4.0511, 9.7679];

function MapPosition({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    }
  }, [latitude, longitude, map]);
  return null;
}

function LocationMarker({ position, onChange }: { position: [number, number]; onChange: (position: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });
  return <Marker position={position} icon={L.divIcon({ className: 'location-marker', html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#b45309;border:3px solid white;box-shadow:0 1px 5px #444"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })} draggable eventHandlers={{ dragend: (event) => { const marker = event.target as L.Marker; const next = marker.getLatLng(); onChange([next.lat, next.lng]); } }} />;
}

export function LocationPicker({ latitude, longitude, onChange }: { latitude: number | null; longitude: number | null; onChange: (position: [number, number]) => void }) {
  const { t } = useLanguage();
  const position: [number, number] = [latitude ?? defaultCenter[0], longitude ?? defaultCenter[1]];
  return (
    <div className="overflow-hidden rounded-md border border-stone-300">
      <MapContainer center={position} zoom={latitude !== null && longitude !== null ? 15 : 6} scrollWheelZoom className="h-64 w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapPosition latitude={latitude} longitude={longitude} />
        <LocationMarker position={position} onChange={onChange} />
      </MapContainer>
      <p className="bg-stone-50 px-3 py-2 text-xs text-stone-600">{t('location_map_help')}</p>
    </div>
  );
}
