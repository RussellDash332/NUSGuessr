
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
  iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="%233B82F6" stroke="%231E3A8A" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const actualIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="%23FF4136" stroke="%23000000" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

type MapWrapperProps = {
  center: LatLngExpression;
  zoom?: number;
  guessPosition: LatLng | null;
  actualPosition: LatLng | null;
  onMapClick: (e: { latlng: LatLng }) => void;
  onMapReady: () => void;
  isRevealed: boolean;
  isInteractive?: boolean;
};

export function MapWrapper({
  center,
  zoom = 15,
  guessPosition,
  actualPosition,
  onMapClick,
  onMapReady,
  isRevealed,
  isInteractive = true,
}: MapWrapperProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const prevIsRevealedRef = useRef<boolean>(isRevealed);


  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        scrollWheelZoom: true,
        wheelDebounceTime: 40,
        wheelPxPerZoomLevel: 120,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      onMapReady();
    }
  }, [center, zoom, onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isInteractive) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.doubleClickZoom.enable();
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = 'grab';
      }
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.doubleClickZoom.disable();
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = 'default';
      }
    }
  }, [isInteractive]);

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;

    const handleMapInteraction = (point: {x: number, y: number}) => {
        if (!isInteractive || isRevealed || !mapRef.current) return;

        const container = mapRef.current.getContainer();
        const rect = container.getBoundingClientRect();

        // Calculate coordinates relative to the map container
        const x = point.x - rect.left;
        const y = point.y - rect.top;

        const latlng = mapRef.current.containerPointToLatLng(L.point(x, y));
        onMapClick({ latlng });
    };

    const handleTouchStart = (e: TouchEvent) => {
        // Prevent default to stop page scroll/jump on mobile
        e.preventDefault();
        if (e.touches.length === 1) {
            handleMapInteraction({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    };

    const handleMouseDown = (e: MouseEvent) => {
        // Prevent default to stop text selection, etc.
        e.preventDefault();
        handleMapInteraction({ x: e.clientX, y: e.clientY });
    }

    // Attach listeners for both touch and mouse
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('mousedown', handleMouseDown, { passive: false });

    // Cleanup: remove old leaflet click listener and our new listeners
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onMapClick, isInteractive, isRevealed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // This effect runs when isRevealed changes.
    // We check if it changed from true to false, which means a new round has started.
    if (prevIsRevealedRef.current && !isRevealed) {
      map.setView(center, zoom);
    }

    // Update the ref for the next render.
    prevIsRevealedRef.current = isRevealed;
  }, [isRevealed, center, zoom]);

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

      // Add polyline and fit bounds
      if (guessPosition && !polylineRef.current) {
        const latlngs = [guessPosition, actualPosition];
        polylineRef.current = L.polyline(latlngs, { color: 'black', weight: 3, opacity: 0.9 }).addTo(map);
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
