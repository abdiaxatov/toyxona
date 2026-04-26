"use client"

import { useEffect, useState, useRef } from "react"
import { Loader2, Box as Cube, AlertCircle } from "lucide-react"

interface EmbeddedModelViewerProps {
  modelUrl?: string | null
  className?: string
  autoRotate?: boolean
  showShadows?: boolean
  scale?: number
}

// Ensure model-viewer types are available
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any
    }
  }
}

export default function EmbeddedModelViewer({
  modelUrl,
  className = "w-full h-full",
  autoRotate = true,
  showShadows = true,
}: EmbeddedModelViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    import("@google/model-viewer").catch(console.error)
  }, [])

  if (!isMounted) return <div className={className} />

  if (!modelUrl || modelUrl === "null" || modelUrl === "undefined") {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 p-4`}>
        <div className="bg-slate-100 p-3 rounded-full mb-2">
          <Cube className="w-8 h-8 opacity-40 text-slate-500" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Model mavjud emas</p>
      </div>
    )
  }

  return (
    <div className={`${className} relative bg-slate-50 rounded-xl overflow-hidden group`}>
      <model-viewer
        src={modelUrl}
        alt="3D Preview"
        crossorigin="anonymous"
        auto-rotate={autoRotate ? "true" : "false"}
        camera-controls
        shadow-intensity={showShadows ? "1" : "0"}
        environment-image="neutral"
        exposure="1"
        touch-action="pan-y"
        style={{ width: "100%", height: "100%", outline: "none" }}
        onLoad={() => {
          setIsLoading(false)
          setHasError(false)
        }}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      >
        {isLoading && (
          <div slot="poster" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-60" />
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-primary/60">Yuklanmoqda...</p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/80 backdrop-blur-sm p-4 text-center z-20">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2 opacity-60" />
            <p className="text-[10px] font-black uppercase text-red-600">Yuklashda xatolik</p>
          </div>
        )}
      </model-viewer>
      
      {/* Small Badge */}
      {!isLoading && !hasError && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-primary/20 backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          3D Preview
        </div>
      )}
    </div>
  )
}
