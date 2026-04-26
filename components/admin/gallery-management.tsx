"use client"

import { useState, useEffect, useRef } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminLayoutClient } from "@/components/admin/admin-layout"
import { uploadToGitHub } from "@/lib/github-upload"
import {
    ImageIcon,
    Video,
    Plus,
    Trash2,
    Loader2,
    Link,
    Upload,
    ExternalLink,
    GripVertical,
    Play,
    X,
    Check,
    Eye
} from "lucide-react"
import Image from "next/image"

type MediaItem = {
    id: string
    type: "image" | "video"
    url: string
    thumbnail?: string
    title?: string
    isYoutube?: boolean
    isInstagram?: boolean
}

function getYoutubeVideoId(url: string): string | null {
    const patterns = [
        /[?&]v=([\w-]{11})/,
        /youtu\.be\/([\w-]{11})/,
        /youtube\.com\/embed\/([\w-]{11})/,
        /youtube\.com\/shorts\/([\w-]{11})/,
        /youtube\.com\/v\/([\w-]{11})/,
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }
    return null
}

function getYoutubeEmbedUrl(url: string): string {
    const videoId = getYoutubeVideoId(url)
    if (!videoId) return url
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
}

function getYoutubeThumbnail(url: string): string | null {
    const videoId = getYoutubeVideoId(url)
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    return null
}

function isYoutubeUrl(url: string): boolean {
    return /youtube\.com|youtu\.be/.test(url)
}

function isInstagramUrl(url: string): boolean {
    return /instagram\.com/.test(url)
}

function isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|ogg|mov)$/i.test(url) || isYoutubeUrl(url) || isInstagramUrl(url)
}

export function GalleryManagement() {
    const { restaurantId } = useAuth()
    const { toast } = useToast()
    const [media, setMedia] = useState<MediaItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [newUrl, setNewUrl] = useState("")
    const [newTitle, setNewTitle] = useState("")
    const [activeTab, setActiveTab] = useState<"all" | "images" | "videos">("all")
    const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!restaurantId) { setIsLoading(false); return }
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, "restaurants", restaurantId))
                if (snap.exists()) {
                    setMedia(snap.data().gallery || [])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [restaurantId])

    const save = async (newMedia: MediaItem[]) => {
        if (!restaurantId) return
        setIsSaving(true)
        try {
            await updateDoc(doc(db, "restaurants", restaurantId), { gallery: newMedia })
            toast({ title: "✅ Saqlandi", description: "Galereya yangilandi" })
        } catch (e) {
            toast({ title: "Xatolik", description: "Saqlashda xatolik", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const addFromUrl = () => {
        if (!newUrl.trim()) return
        const isVideo = isVideoUrl(newUrl)
        const isYt = isYoutubeUrl(newUrl)
        const isIg = isInstagramUrl(newUrl)
        const item: MediaItem = {
            id: Date.now().toString(),
            type: isVideo ? "video" : "image",
            url: newUrl.trim(),
            title: newTitle.trim() || "",
            thumbnail: isYt ? getYoutubeThumbnail(newUrl) || "" : "",
            isYoutube: isYt,
            isInstagram: isIg,
        }
        const updated = [...media, item]
        setMedia(updated)
        save(updated)
        setNewUrl("")
        setNewTitle("")
    }

    const handleFileUpload = async (files: FileList) => {
        setIsUploading(true)
        const newItems: MediaItem[] = []
        for (const file of Array.from(files)) {
            try {
                const isVideo = file.type.startsWith("video/")
                const fileName = `${Date.now()}_${file.name}`
                const result = await uploadToGitHub(file, fileName, isVideo ? "videos" : "images")
                if (result.success && result.url) {
                    newItems.push({
                        id: Date.now().toString() + Math.random(),
                        type: isVideo ? "video" : "image",
                        url: result.url,
                        title: file.name.replace(/\.[^/.]+$/, ""),
                    })
                }
            } catch (e) {
                console.error(e)
            }
        }
        const updated = [...media, ...newItems]
        setMedia(updated)
        await save(updated)
        setIsUploading(false)
    }

    const remove = (id: string) => {
        const updated = media.filter(m => m.id !== id)
        setMedia(updated)
        save(updated)
    }

    const filtered = activeTab === "all" ? media : media.filter(m => m.type === (activeTab === "images" ? "image" : "video"))

    if (isLoading) return (
        <AdminLayoutClient>
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </AdminLayoutClient>
    )

    return (
        <AdminLayoutClient>
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Galereya</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Restoran rasmlar va videolarini boshqarish</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium">{media.length} ta media</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
                    {/* Left: Gallery grid */}
                    <div>
                        {/* Filter tabs */}
                        <div className="flex gap-1.5 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                            {(["all", "images", "videos"] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
                                        ? "bg-white shadow text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {tab === "all" ? "Barchasi" : tab === "images" ? "Rasmlar" : "Videolar"}
                                    <span className="ml-1.5 text-xs opacity-60">
                                        {tab === "all" ? media.length : media.filter(m => m.type === (tab === "images" ? "image" : "video")).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-56 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                                <ImageIcon className="w-10 h-10 mb-3 opacity-40" />
                                <p className="font-medium">Media yo'q</p>
                                <p className="text-sm mt-1">Rasm yoki video qo'shing</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {filtered.map(item => (
                                    <div key={item.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                                        {/* Thumbnail */}
                                        {item.type === "image" ? (
                                            <Image src={item.url} alt={item.title || "Gallery"} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 relative">
                                                {item.thumbnail ? (
                                                    <Image src={item.thumbnail} alt={item.title || ""} fill className="object-cover opacity-60" />
                                                ) : null}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                                    </div>
                                                </div>
                                                {item.isYoutube && (
                                                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">YT</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Overlay actions */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setPreviewItem(item)}
                                                className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => remove(item.id)}
                                                className="p-2 bg-red-500/80 backdrop-blur-sm rounded-full text-white hover:bg-red-600 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Type badge */}
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition">
                                            {item.type === "video" ? (
                                                <Video className="w-4 h-4 text-white drop-shadow" />
                                            ) : (
                                                <ImageIcon className="w-4 h-4 text-white drop-shadow" />
                                            )}
                                        </div>

                                        {/* Title */}
                                        {item.title && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                                                <p className="text-white text-xs font-medium truncate">{item.title}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Upload panel */}
                    <div className="space-y-4">
                        {/* File upload */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Upload className="w-4 h-4 text-primary" />
                                Fayl yuklash
                            </h3>
                            <input
                                type="file"
                                ref={fileInputRef}
                                multiple
                                accept="image/*,video/*"
                                onChange={e => e.target.files && handleFileUpload(e.target.files)}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all group"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-7 h-7 animate-spin" />
                                        <span className="text-sm font-medium">Yuklanmoqda...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2.5 bg-gray-100 rounded-xl group-hover:bg-primary/10 transition">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-semibold">Rasm yoki Video yuklash</span>
                                        <span className="text-xs opacity-60">JPG, PNG, MP4, MOV qabul qilinadi</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* URL input */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Link className="w-4 h-4 text-blue-500" />
                                Link orqali qo'shish
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">URL (Rasm yoki Video)</Label>
                                    <Input
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                        placeholder="https://... yoki youtube.com/watch?v=..."
                                        className="text-sm"
                                        onKeyDown={e => e.key === "Enter" && addFromUrl()}
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        YouTube, Instagram va to'g'ridan-to'g'ri rasm/video linklari qabul qilinadi
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Sarlavha (ixtiyoriy)</Label>
                                    <Input
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        placeholder="Masalan: Kirish zali"
                                        className="text-sm"
                                    />
                                </div>

                                {/* URL preview */}
                                {newUrl && (
                                    <div className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                        {isYoutubeUrl(newUrl) ? (
                                            <div className="flex items-center gap-3 p-3">
                                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                                                    <Play className="w-4 h-4 text-red-600 fill-red-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-red-600">YouTube Video</p>
                                                    <p className="text-[11px] text-gray-500 truncate max-w-[200px]">{newUrl}</p>
                                                </div>
                                            </div>
                                        ) : isVideoUrl(newUrl) ? (
                                            <div className="flex items-center gap-3 p-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                                    <Video className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-blue-600">Video Link</p>
                                                    <p className="text-[11px] text-gray-500 truncate max-w-[200px]">{newUrl}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative h-24 bg-gray-200">
                                                <Image src={newUrl} alt="preview" fill className="object-cover" onError={() => { }} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <Button
                                    onClick={addFromUrl}
                                    disabled={!newUrl.trim() || isSaving}
                                    className="w-full"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    Qo'shish
                                </Button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                                <ImageIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                                <p className="text-2xl font-black text-blue-700">{media.filter(m => m.type === "image").length}</p>
                                <p className="text-xs text-blue-500 font-semibold">Rasmlar</p>
                            </div>
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                                <Video className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                <p className="text-2xl font-black text-purple-700">{media.filter(m => m.type === "video").length}</p>
                                <p className="text-xs text-purple-500 font-semibold">Videolar</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Modal */}
                {previewItem && (
                    <div
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setPreviewItem(null)}
                    >
                        <button
                            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
                            onClick={() => setPreviewItem(null)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="max-w-3xl w-full max-h-[80vh]" onClick={e => e.stopPropagation()}>
                            {previewItem.type === "image" ? (
                                <div className="relative w-full aspect-video">
                                    <Image src={previewItem.url} alt={previewItem.title || ""} fill className="object-contain" />
                                </div>
                            ) : previewItem.isYoutube ? (
                                <div className="aspect-video w-full">
                                    <iframe
                                        src={getYoutubeEmbedUrl(previewItem.url)}
                                        className="w-full h-full rounded-xl"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                </div>
                            ) : (
                                <video src={previewItem.url} controls className="w-full rounded-xl max-h-[70vh]" />
                            )}
                            {previewItem.title && (
                                <p className="text-white text-center font-medium mt-3 text-sm">{previewItem.title}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayoutClient>
    )
}
