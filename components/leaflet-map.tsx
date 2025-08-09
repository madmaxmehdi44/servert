"use client"

import type React from "react"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import all Leaflet components with no SSR
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })

const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })

const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false })

const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false })

interface LeafletMapProps {
  center: [number, number]
  zoom: number
  children: React.ReactNode
  onMapReady?: (map: any) => void
  className?: string
}

export function LeafletMap({ center, zoom, children, onMapReady, className = "h-full w-full" }: LeafletMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600">در حال بارگذاری نقشه...</p>
        </div>
      </div>
    )
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className={className}
      ref={onMapReady}
    >
      {children}
    </MapContainer>
  )
}

// Export individual components
export { TileLayer, Marker, Popup, Circle, Polyline }
