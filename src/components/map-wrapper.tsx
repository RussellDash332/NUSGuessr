"use client";

import React, { useEffect, useRef } from "react";
import L, { LatLng, LatLngExpression, LeafletMouseEvent, Map } from 'leaflet';

// Fix for default icon paths in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const guessIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="hsl(var(--primary))" stroke="hsl(var(--primary-foreground))" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const actualIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="hsl(var(--destructive))" stroke="%23fff" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

type MapWrapperProps = {
  center: LatLngExpression;
  zoom?: number;
  guessPosition: LatLng | null;
  actualPosition: LatLng | null;
  onMapClick: (e: LeafletMouseEvent) => void;
  isRevealed: boolean;
  isInteractive?: boolean;
};

export function MapWrapper({
  center,
  zoom = 15,
  guessPosition,
  actualPosition,
  onMapClick,
  isRevealed,
  isInteractive = true,
}: MapWrapperProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      // Initialize map
      mapRef.current = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);
    }
  }, [center, zoom]);
  
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
  
    if (isInteractive) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      if (map.tap) map.tap.enable();
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = 'grab';
      }
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if (map.tap) map.tap.disable();
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = 'default';
      }
    }
  }, [isInteractive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
  
    // Map click listener
    const handleClick = (e: LeafletMouseEvent) => {
      onMapClick(e);
    };
    map.on('click', handleClick);
  
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Manage guess marker
    if (guessPosition) {
      if (!guessMarkerRef.current) {
        guessMarkerRef.current = L.marker(guessPosition, { icon: guessIcon }).addTo(map);
      } else {
        guessMarkerRef.current.setLatLng(guessPosition);
      }
    } else if (guessMarkerRef.current) {
      guessMarkerRef.current.remove();
      guessMarkerRef.current = null;
    }

    // Manage revealed state
    if (isRevealed && actualPosition) {
      // Add actual location marker
      if (!actualMarkerRef.current) {
        actualMarkerRef.current = L.marker(actualPosition, { icon: actualIcon }).addTo(map);
      }
      
      // Add polyline
      if (guessPosition && !polylineRef.current) {
        const latlngs = [guessPosition, actualPosition];
        polylineRef.current = L.polyline(latlngs, { color: 'hsl(var(--destructive))', weight: 3, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
      }
    } else {
      // Clean up revealed items
      if (actualMarkerRef.current) {
        actualMarkerRef.current.remove();
        actualMarkerRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }

  }, [guessPosition, actualPosition, isRevealed]);
  
  return (
    <div
      ref={mapContainerRef}
      style={{ height: "100%", width: "100%" }}
      className="rounded-lg shadow-md"
    />
  );
}
