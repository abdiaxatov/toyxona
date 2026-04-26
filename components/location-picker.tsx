"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Check, Loader2 } from "lucide-react"

interface LocationPickerProps {
  initialLat?: number | null
  initialLon?: number | null
  onConfirm: (lat: number, lon: number, address: string) => void
  onCancel: () => void
}

declare const L: any

export function LocationPicker({ 
  initialLat, 
  initialLon, 
  onConfirm, 
  onCancel 
}: LocationPickerProps) {
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [address, setAddress] = useState<string>("Manzilni aniqlanmoqda...")
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lon: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)

  // Default to Tashkent coordinates if none provided
  const defaultLat = 41.311081
  const defaultLon = 69.240562

  const reverseGeocode = async (lat: number, lon: number) => {
    setIsReverseGeocoding(true)
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`)
      const data = await resp.json()
      if (data.display_name) {
        setAddress(data.display_name)
      } else {
        setAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)
      }
    } catch (e) {
      console.error("Reverse geocoding error", e)
      setAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)
    } finally {
      setIsReverseGeocoding(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return

    const initMap = () => {
      if (typeof L === "undefined") {
        setTimeout(initMap, 200)
        return
      }

      // Fix for Leaflet default icon issues in Next.js/Webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const startLat = initialLat || defaultLat
      const startLon = initialLon || defaultLon
      
      setCurrentCoords({ lat: startLat, lon: startLon })
      reverseGeocode(startLat, startLon)

      // Initialize map
      const map = L.map(containerRef.current, {
        zoomControl: false // Move zoom control to bottom right for better mobile UX
      }).setView([startLat, startLon], 15)
      
      L.control.zoom({
        position: 'bottomright'
      }).addTo(map)

      mapRef.current = map

      // Add TileLayer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)

      // Add Marker
      const marker = L.marker([startLat, startLon], {
        draggable: true
      }).addTo(map)
      markerRef.current = marker

      // Handle marker drag
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        setCurrentCoords({ lat: pos.lat, lon: pos.lng })
        reverseGeocode(pos.lat, pos.lng)
      })

      // Handle map click
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        setCurrentCoords({ lat: e.latlng.lat, lon: e.latlng.lng })
        reverseGeocode(e.latlng.lat, e.latlng.lng)
      })
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
      }
    }
  }, [])

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return
    
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCurrentCoords({ lat: latitude, lon: longitude })
        mapRef.current.setView([latitude, longitude], 17)
        markerRef.current.setLatLng([latitude, longitude])
        reverseGeocode(latitude, longitude)
        setIsLocating(false)
      },
      (err) => {
        console.error("Geolocation error", err)
        setIsLocating(false)
      },
      { enableHighAccuracy: true }
    )
  }

  return (
    <div className="flex flex-col h-[60vh] md:h-[70vh] w-full overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-0.5">Tanlangan manzil</p>
          <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">
            {isReverseGeocoding ? "Manzil o'qilmoqda..." : address}
          </p>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full relative z-10" />

      <div className="p-4 flex gap-3">
        <Button 
          variant="outline" 
          onClick={handleLocateMe}
          disabled={isLocating}
          className="h-12 w-12 rounded-xl p-0 shrink-0"
        >
          {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
        </Button>
        <Button 
          onClick={() => currentCoords && onConfirm(currentCoords.lat, currentCoords.lon, address)}
          disabled={isReverseGeocoding || !currentCoords}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Manzilni tasdiqlash
        </Button>
      </div>
    </div>
  )
}
