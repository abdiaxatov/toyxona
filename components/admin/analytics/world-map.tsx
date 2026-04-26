import { useState, useMemo } from "react"
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { scaleLinear } from "d3-scale"
import { Plus, Minus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

// Coordinate and Mapping data for specific cities/locations
const cityData: Record<string, { coordinates: [number, number], country: string }> = {
    "Rome": { coordinates: [12.4964, 41.9028], country: "Italy" },
    "Bishkek": { coordinates: [74.59, 42.87], country: "Kyrgyzstan" },
    "Tashkent": { coordinates: [69.2401, 41.2995], country: "Uzbekistan" },
    "Samarkand": { coordinates: [66.9597, 39.6270], country: "Uzbekistan" },
    "Moscow": { coordinates: [37.6173, 55.7558], country: "Russia" },
    "Dubai": { coordinates: [55.2708, 25.2048], country: "United Arab Emirates" },
    "Istanbul": { coordinates: [28.9784, 41.0082], country: "Turkey" },
    "London": { coordinates: [-0.1276, 51.5072], country: "United Kingdom" },
    "New York": { coordinates: [-74.006, 40.7128], country: "USA" },
    "Seoul": { coordinates: [126.9780, 37.5665], country: "South Korea" },
    "Tokyo": { coordinates: [139.6917, 35.6895], country: "Japan" },
    "Paris": { coordinates: [2.3522, 48.8566], country: "France" },
    "Berlin": { coordinates: [13.4050, 52.5200], country: "Germany" },
}

// Map country names from geo to our internal names for matching
const countryMapping: Record<string, string> = {
    "United States of America": "USA",
    "Russian Federation": "Russia",
    "United Kingdom": "UK",
}

// Use a public topojson file
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

interface WorldMapProps {
    data: { name: string; value: number }[]
    selectedCountry?: string | null
    onCountryClick?: (name: string) => void
}

const WorldMap = ({ data, selectedCountry, onCountryClick }: WorldMapProps) => {
    const [position, setPosition] = useState({ coordinates: [10, 15] as [number, number], zoom: 1 })

    const handleZoomIn = () => {
        if (position.zoom >= 8) return
        setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }))
    }

    const handleZoomOut = () => {
        if (position.zoom <= 1) return
        setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }))
    }

    const handleReset = () => {
        setPosition({ coordinates: [10, 15], zoom: 1 })
    }

    const handleMoveEnd = (newPosition: { coordinates: [number, number], zoom: number }) => {
        setPosition(newPosition)
    }

    const maxVal = Math.max(...data.map(d => d.value), 1)

    // Improved matching logic to handle cities correctly
    const matches = (dName: string, gName: string) => {
        const dn = dName.toLowerCase().trim()
        const gn = gName.toLowerCase().trim()

        // Direct match
        if (dn === gn) return true

        // Mapped match (e.g. United States of America -> USA)
        if (countryMapping[gName] && countryMapping[gName].toLowerCase() === dn) return true

        // City to Country match
        if (cityData[dName] && cityData[dName].country.toLowerCase() === gn) return true

        // Common corrections
        if (dn === "usa" && gn.includes("united states")) return true
        if (dn === "russia" && gn.includes("russian federation")) return true

        return false
    }

    const getFill = (geoName: string) => {
        const isSelected = selectedCountry && matches(selectedCountry, geoName)
        const hasData = data.some(d => matches(d.name, geoName))

        if (isSelected) return "#3b82f6"
        if (hasData) return "#bfdbfe"
        return "#f8fafc"
    }

    // Extract items that are cities
    const cityMarkers = data.filter(d => cityData[d.name])

    // Live UTC Clock
    const [utcTime, setUtcTime] = useState("")
    const [utcDate, setUtcDate] = useState("")

    useMemo(() => {
        const update = () => {
            const now = new Date()
            setUtcTime(now.getUTCHours().toString().padStart(2, '0') + ":" + now.getUTCMinutes().toString().padStart(2, '0') + ":" + now.getUTCSeconds().toString().padStart(2, '0'))
            setUtcDate(now.getUTCDate().toString().padStart(2, '0') + "." + (now.getUTCMonth() + 1).toString().padStart(2, '0') + "." + now.getUTCFullYear())
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full h-full relative flex items-center justify-center p-2 overflow-hidden bg-blue-50/5 dark:bg-slate-900/10 rounded-2xl group/map">
            {/* UTC Clock Overlay */}
            <div className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-none">
                <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/50 shadow-xl inline-flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[14px] font-black font-mono tracking-widest leading-none bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {utcTime}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground ml-1">UTC</span>
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-0.5">
                        {utcDate}
                    </div>
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-20 opacity-0 group-hover/map:opacity-100 transition-opacity">
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800" onClick={handleZoomIn}>
                    <Plus className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800" onClick={handleZoomOut}>
                    <Minus className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                </Button>
            </div>

            <ComposableMap
                projectionConfig={{ scale: 155 }}
                style={{ width: "100%", height: "100%" }}
            >
                <ZoomableGroup
                    zoom={position.zoom}
                    center={position.coordinates}
                    onMoveEnd={handleMoveEnd}
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const { name } = geo.properties
                                const isSelected = selectedCountry && matches(selectedCountry, name)

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={getFill(name)}
                                        stroke={isSelected ? "#2563eb" : "#e2e8f0"}
                                        strokeWidth={isSelected ? 1.5 / position.zoom : 0.4 / position.zoom}
                                        onClick={() => onCountryClick?.(name)}
                                        style={{
                                            default: { outline: "none", transition: "all 500ms" },
                                            hover: { fill: "#60a5fa", outline: "none", cursor: "pointer" },
                                            pressed: { outline: "none" },
                                        }}
                                    />
                                )
                            })
                        }
                    </Geographies>

                    {/* City Markers with Glowing Effect */}
                    {cityMarkers.map(({ name, value }) => (
                        <Marker key={name} coordinates={cityData[name].coordinates}>
                            <circle r={4 / position.zoom} fill="#ef4444" stroke="#fff" strokeWidth={1.5 / position.zoom} />
                            <circle r={8 / position.zoom} fill="#ef4444" opacity={0.3} className="animate-ping" />
                            <title>{`${name}: ${value} tashrif`}</title>
                        </Marker>
                    ))}
                </ZoomableGroup>
            </ComposableMap>
        </div>
    )
}

export default WorldMap
