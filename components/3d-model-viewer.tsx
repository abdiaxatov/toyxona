"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowLeft, 
  RotateCcw, 
  Maximize, 
  Camera, 
  Download, 
  Layers, 
  Info, 
  X,
  Home,
  Loader2,
  AlertCircle,
  Box,
  Share2,
  Scan,
  Smartphone,
  LayoutDashboard,
  Video,
  VideoOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn, hexToHSL } from "@/lib/utils"

// Add type definition for model-viewer
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any
    }
  }
}

interface ModelViewerProps {
  modelUrl: string | null
  onClose?: () => void
  itemName?: string
  isInCart?: boolean
  className?: string
  restaurantSlug?: string | null
  primaryColor?: string | null
}

export default function ModelViewer({ 
  modelUrl, 
  onClose, 
  itemName, 
  isInCart = false,
  restaurantSlug,
  primaryColor 
}: ModelViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [modelError, setModelError] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [showShadows, setShowShadows] = useState(true)
  const [arSupported, setArSupported] = useState(false)
  const [progress, setProgress] = useState(0)
  const [arStatus, setArStatus] = useState<string>("not-presenting")
  const [backgroundType, setBackgroundType] = useState<'blur' | 'camera'>('blur')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const modelViewerRef = useRef<any>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Handle camera stream for "Live Background"
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast({
        title: "Kameraga ruxsat berilmadi",
        description: "Jonli fon uchun kamera ruxsati talab qilinadi",
        variant: "destructive"
      });
      setBackgroundType('blur');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleBackground = () => {
    if (backgroundType === 'blur') {
      setBackgroundType('camera');
      startCamera();
    } else {
      setBackgroundType('blur');
      stopCamera();
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Apply primary color to CSS variables
  useEffect(() => {
    if (primaryColor) {
      const hsl = hexToHSL(primaryColor);
      if (hsl) {
        document.documentElement.style.setProperty('--primary', hsl);
        // Also update standard color for non-tailwind components if needed
        document.documentElement.style.setProperty('--primary-hex', primaryColor);
      }
    }
    
    // Cleanup on unmount (optional, but good for navigation)
    return () => {
      // Logic to restore theme if necessary, but usually Next.js handles this via Page components
    }
  }, [primaryColor]);

  // Load model-viewer on client side
  useEffect(() => {
    import("@google/model-viewer")
      .then(() => {
        // Check AR support once loaded
        const checkAR = () => {
          const mv = document.createElement("model-viewer") as any
          if (mv && "canActivateAR" in mv) {
            setArSupported(true)
          }
        }
        checkAR()
      })
      .catch((err) => {
        console.error("Error loading model-viewer:", err)
        setModelError(true)
      })
  }, [])

  useEffect(() => {
    if (!modelUrl || modelUrl === "null" || modelUrl === "undefined" || modelUrl.trim() === "") {
      setModelError(true)
      setIsLoading(false)
    }
  }, [modelUrl])

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      router.back()
    }
  }, [onClose, router])

  const toggleAR = () => {
    if (modelViewerRef.current) {
      const mv = modelViewerRef.current;
      
      if (mv.canActivateAR || arSupported) {
        mv.activateAR();
        toast({
          title: "AR Kamera yoqilmoqda",
          description: "Stol yoki polni aniqlash uchun kamerani qimirlating. Kattalashtirish uchun ikki barmog'ingizdan foydalaning.",
        });
      } else {
        toast({
          title: "AR qo'llab-quvvatlanmaydi",
          description: "Sizning qurilmangizda AR rejimi mavjud emas (HTTPS talab qilinadi)",
          variant: "destructive"
        });
      }
    }
  }

  const handleReset = () => {
    if (modelViewerRef.current) {
      modelViewerRef.current.cameraOrbit = "0deg 75deg 105%"
      modelViewerRef.current.cameraTarget = "auto auto auto"
      toast({
        title: "Holat tiklandi",
        description: "Boshlang'ich ko'rinishga qaytildi",
      })
    }
  }



  const handleGoHome = () => {
    if (restaurantSlug) {
      router.push(`/${restaurantSlug}`)
    } else {
      router.push("/")
    }
  }

  const onProgress = (event: any) => {
    const p = (event.detail.totalProgress || 0) * 100
    setProgress(Math.round(p))
  }

  const zIndex = isInCart ? "z-[9999]" : "z-50"

  const customPrimaryStyle = primaryColor ? {
    boxShadow: `0 15px 45px ${primaryColor}44`,
    backgroundColor: primaryColor
  } : {};

  return (
    <div className={`fixed inset-0 ${zIndex} bg-[#050505] flex flex-col font-sans overflow-hidden`}>
      {/* 🟢 Live Camera Background (New Mode) */}
      <AnimatePresence>
        {backgroundType === 'camera' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for better model visibility */}
            <div className="absolute inset-0 bg-black/20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decor (Only when blur mode) */}
      {backgroundType === 'blur' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-0 right-0 w-[60%] h-[60%] blur-[150px] rounded-full opacity-30" 
            style={{ backgroundColor: primaryColor || 'var(--primary)' }}
          />
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-blue-500/5 blur-[150px] rounded-full opacity-30" />
        </div>
      )}

      {/* Header Info Overlay */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 z-[60] p-6 lg:p-10 pointer-events-none"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-5 pointer-events-auto">
            <div className="flex flex-col">
              <motion.h1 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-white font-black text-2xl md:text-4xl tracking-tighter uppercase"
              >
                {itemName || "3D Menyu"}
              </motion.h1>
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse shadow-lg" 
                  style={{ backgroundColor: primaryColor || '#22c55e', boxShadow: `0 0 10px ${primaryColor || '#22c55e'}` }}
                />
                <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">AR Master Engine • AI Render</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
             <Button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: itemName, url: window.location.href })
                  }
                }}
                className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 text-white transition-all active:scale-90"
             >
               <Share2 className="w-5 h-5" />
             </Button>
          </div>
        </div>
      </motion.header>

      {/* Main 3D Stage */}
      <div className="flex-1 relative">
        {!modelError ? (
          <div className="absolute inset-0 z-10">
            <model-viewer
              ref={modelViewerRef}
              src={modelUrl}
              alt={itemName || "3D Model"}
              ar
              ar-modes="scene-viewer webxr quick-look"
              ar-placement="floor"
              ar-scale="fixed"
              crossorigin="anonymous"
              camera-controls
              disable-pan
              reveal="auto"
              interaction-prompt="auto"
              auto-rotate={autoRotate}
              auto-rotate-delay="0"
              rotation-speed="0.5"
              shadow-intensity="1"
              shadow-softness="1"
              exposure="1.2"
              environment-image="neutral"
              camera-orbit="45deg 75deg 105%"
              min-camera-orbit="auto auto 5%"
              max-camera-orbit="auto auto 300%"
              interpolation-decay="200"
              touch-action="none"
              onProgress={onProgress}
              onArStatusChange={(e: any) => setArStatus(e.detail.status)}
              onLoad={() => {
                setIsLoading(false)
                setModelError(false)
              }}
              onError={(e: any) => {
                console.error("Model viewer error:", e)
                setModelError(true)
                setIsLoading(false)
              }}
              style={{ width: "100%", height: "100%", outline: "none" }}
            >
              <button slot="ar-button" style={{ display: "none" }} />
              
              {/* Progress Overlay */}
              {isLoading && (
                <div slot="poster" className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-[70]">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="75" stroke="currentColor" strokeWidth="1" fill="transparent" className="text-white/5" />
                      <motion.circle
                        cx="80"
                        cy="80" r="75"
                        stroke="currentColor" strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={471}
                        strokeDashoffset={471 - (471 * progress) / 100}
                        style={{ color: primaryColor || 'var(--primary)' }}
                        transition={{ duration: 0.5 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white font-black text-3xl">{progress}%</span>
                      <Box className="w-5 h-5 animate-bounce mt-2" style={{ color: primaryColor || 'var(--primary)' }} />
                    </div>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-10 text-center"
                  >
                    <p className="text-white/60 text-xs font-black uppercase tracking-[0.4em]">Rendering Neural Models</p>
                    <p className="text-[9px] mt-2 uppercase font-black opacity-40" style={{ color: primaryColor || 'var(--primary)' }}>Xavfsiz ulanish o'rnatilmoqda...</p>
                  </motion.div>
                </div>
              )}
            </model-viewer>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-[90]">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
               className="bg-zinc-900 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
            >
              <div 
                className="absolute -top-20 -left-20 w-40 h-40 blur-[80px] rounded-full opacity-20" 
                style={{ backgroundColor: primaryColor || '#ef4444' }}
              />
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Model Topilmadi</h2>
                <p className="text-white/40 text-sm mb-10 leading-relaxed">
                  3D ma'lumotlarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki menyuga qayting.
                </p>
                <div className="flex flex-col gap-4">
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="w-full h-16 text-black hover:opacity-90 font-black rounded-3xl"
                    style={{ backgroundColor: 'white' }}
                  >
                    QAYTA URINISH
                  </Button>
                  <Button onClick={handleBack} variant="ghost" className="w-full h-16 text-white/50 hover:text-white font-bold rounded-3xl">MENYUGA QAYTISH</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* 🔹 Bottom Professional Navbar */}
      <motion.div 
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none z-[100]"
      >
        <div className="w-[92%] max-w-lg pointer-events-auto bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-[40px] p-2 flex items-center justify-between shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
          
          {/* Section 1: Back */}
          <NavAction 
            icon={<ArrowLeft className="w-6 h-6" />} 
            label="Ortga" 
            onClick={handleBack} 
            primaryColor={primaryColor}
          />



          {/* New Section: Live Background Toggle */}
          <NavAction 
            icon={backgroundType === 'camera' ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />} 
            label={backgroundType === 'camera' ? "Oddiy" : "Kamera"} 
            onClick={toggleBackground} 
            primaryColor={primaryColor}
            active={backgroundType === 'camera'}
          />

          {/* Section 3: Central AR Toggle (MASTER BUTTON) */}
          <div className="relative -top-1">
             <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleAR}
                className={cn(
                  "w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all relative z-20 overflow-hidden group",
                  arStatus === "presenting" ? "bg-red-500 shadow-red-500/30" : ""
                )}
                style={arStatus !== "presenting" ? customPrimaryStyle : {}}
             >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="relative z-10 flex flex-col items-center">
                   {arStatus === "presenting" ? <X className="w-8 h-8 text-white" /> : <Scan className="w-8 h-8 text-white" />}
                   <span className="text-[8px] font-black uppercase tracking-widest text-white mt-1">
                      {arStatus === "presenting" ? "Yopish" : "AR KO'R" }
                   </span>
                </div>
             </motion.button>
             {/* Ripple effect */}
             <div 
               className="absolute inset-0 rounded-full animate-ping -z-10 opacity-20" 
               style={{ backgroundColor: primaryColor || 'var(--primary)' }}
             />
          </div>

          {/* Section 4: Reset View */}
          <NavAction 
            icon={<RotateCcw className="w-6 h-6" />} 
            label="Reset" 
            onClick={handleReset} 
            primaryColor={primaryColor}
          />

          {/* Section 5: Home (Back to Slug) */}
          <NavAction 
            icon={<LayoutDashboard className="w-6 h-6" />} 
            label="Menyu" 
            onClick={handleGoHome} 
            primaryColor={primaryColor}
          />
        </div>
      </motion.div>
    </div>
  )
}

function NavAction({ icon, label, onClick, active = false, primaryColor }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean, primaryColor?: string | null }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-[30px] transition-all hover:bg-white/5 active:scale-90 group"
      )}
      style={{ color: active ? (primaryColor || 'var(--primary)') : 'rgba(255,255,255,0.4)' }}
    >
      <div className="bg-white/5 p-2 rounded-2xl group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: active ? (primaryColor || 'inherit') : 'inherit' }}>{label}</span>
    </button>
  )
}