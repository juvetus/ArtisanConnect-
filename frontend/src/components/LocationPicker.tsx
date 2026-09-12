'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultCenter: [number, number] = [4.0511, 9.7679];

function LocationMarker({ position, onChange }: { position: [number, number]; onChange: (position: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });
  return <Marker position={position} icon={L.divIcon({ className: 'location-marker', html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#b45309;border:3px solid white;box-shadow:0 1px 5px #444"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })} draggable eventHandlers={{ dragend: (event) => { const marker = event.target as L.Marker; const next = marker.getLatLng(); onChange([next.lat, next.lng]); } }} />;
}

export function LocationPicker({ latitude, longitude, onChange }: { latitude: number | null; longitude: number | null; onChange: (position: [number, number]) => void }) {
  const position: [number, number] = [latitude ?? defaultCenter[0], longitude ?? defaultCenter[1]];
  useEffect(() => { return () => undefined; }, []);
  return (
    <div className="overflow-hidden rounded-md border border-stone-300">
      <MapContainer center={position} zoom={latitude && longitude ? 15 : 6} scrollWheelZoom className="h-64 w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker position={position} onChange={onChange} />
      </MapContainer>
      <p className="bg-stone-50 px-3 py-2 text-xs text-stone-600">Cliquez sur la carte ou déplacez le marqueur pour préciser la position.</p>
    </div>
  );
}
