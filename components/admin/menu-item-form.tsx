"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save, X, Utensils, Gem, Info, Image as ImageIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { uploadToKinescope } from "@/lib/kinescope-upload"
import { Play } from "lucide-react"

interface MenuItem {
  id?: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
  needsContainer: boolean
  isNew?: boolean
  isService?: boolean
  videoUrl?: string
}

interface MenuItemFormProps {
  item?: MenuItem
  onSuccess: () => void
  onCancel: () => void
}

export function MenuItemForm({ item, onSuccess, onCancel }: MenuItemFormProps) {
  const [name, setName] = useState(item?.name || "")
  const [description, setDescription] = useState(item?.description || "")
  const [price, setPrice] = useState(item?.price?.toString() || "")
  const [category, setCategory] = useState(item?.category || "")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(item?.image || "")
  const [available, setAvailable] = useState(item?.available !== false)
  const [needsContainer, setNeedsContainer] = useState(item?.needsContainer || false)
  const [isNew, setIsNew] = useState(item?.isNew || false)
  const [isService, setIsService] = useState(item?.isService || false)
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState(item?.videoUrl || "")
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(item?.videoUrl || "")
  const { toast } = useToast()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesSnapshot = await getDocs(collection(db, "categories"))
        const categoriesList = categoriesSnapshot.docs.map((doc) => doc.data().name)
        setCategories(categoriesList)
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Xatolik",
          description: "Kategoriyalarni yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
      }
    }

    fetchCategories()
  }, [toast])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
      
      setIsUploadingVideo(true)
      setVideoProgress(0)
      
      const result = await uploadToKinescope(file, name || file.name, (percent) => {
        setVideoProgress(percent)
      })
      
      if (result.success && result.url) {
        setUploadedVideoUrl(result.url)
        toast({
          title: "Video yuklandi",
          description: "Video muvaffaqiyatli yuklandi",
        })
        
        if (item?.id) {
          try {
            await updateDoc(doc(db, "menu-items", item.id), { videoUrl: result.url })
            toast({
              title: "Saqlandi",
              description: "Video bazaga avtomatik qo'shildi",
            })
          } catch (error) {
            console.error("Error auto-saving video:", error)
          }
        }
      } else {
        toast({
          title: "Video yuklashda xatolik",
          description: result.error || "Noma'lum xatolik",
          variant: "destructive",
        })
      }
      
      setIsUploadingVideo(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return

    try {
      const categoryQuery = query(collection(db, "categories"), where("name", "==", newCategory))
      const categorySnapshot = await getDocs(categoryQuery)

      if (categorySnapshot.empty) {
        await addDoc(collection(db, "categories"), {
          name: newCategory,
          createdAt: new Date(),
        })

        setCategories([...categories, newCategory])
        setCategory(newCategory)
        setNewCategory("")
        setShowNewCategoryInput(false)

        toast({
          title: "Kategoriya qo'shildi",
          description: `"${newCategory}" kategoriyasi muvaffaqiyatli qo'shildi`,
        })
      } else {
        toast({
          title: "Kategoriya mavjud",
          description: `"${newCategory}" kategoriyasi allaqachon mavjud`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriyani qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let imageUrl = item?.image || ""

      if (image) {
        const storageRef = ref(storage, `menu-items/${Date.now()}_${image.name}`)
        await uploadBytes(storageRef, image)
        imageUrl = await getDownloadURL(storageRef)
      }

      let videoUrl = uploadedVideoUrl
      // Note: we don't need to re-upload because we auto-uploaded in handleVideoChange

      const menuItemData = {
        name,
        description,
        price: Number(price),
        category,
        image: imageUrl,
        videoUrl,
        available,
        needsContainer,
        isNew,
        isService,
        updatedAt: new Date(),
      }

      if (item?.id) {
        await updateDoc(doc(db, "menu-items", item.id), menuItemData)
        toast({
          title: "Ma'lumot yangilandi",
          description: `"${name}" muvaffaqiyatli yangilandi`,
        })
      } else {
        await addDoc(collection(db, "menu-items"), {
          ...menuItemData,
          createdAt: new Date(),
        })
        toast({
          title: "Qo'shildi",
          description: `"${name}" muvaffaqiyatli qo'shildi`,
        })
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving menu item:", error)
      toast({
        title: "Xatolik",
        description: "Saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-400">Nomi (Taom yoki Xizmat)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Nahorgi osh yoki Orkestr"
              className="h-11 rounded-xl border-2 focus:ring-primary/20 font-bold"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-zinc-400">Kategoriya</Label>
            {showNewCategoryInput ? (
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Yangi kategoriya"
                  className="h-11 rounded-xl border-2"
                />
                <Button type="button" onClick={handleAddCategory} variant="outline" className="h-11 rounded-xl border-2">
                  Qo'shish
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowNewCategoryInput(false)}
                  variant="ghost"
                  className="h-11 w-11 p-0 rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                    <SelectValue placeholder="Kategoriyani tanlang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="rounded-lg">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => setShowNewCategoryInput(true)}
                  variant="outline"
                  className="h-11 rounded-xl border-2 whitespace-nowrap px-4"
                >
                  Yangi
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-zinc-400">Narxi ($)</Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="h-11 rounded-xl border-2 focus:ring-primary/20 font-black pl-10"
                required
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold">* Agar bu menyu ichidagi taom bo'lsa, narxi 0 bo'lishi mumkin.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image" className="text-xs font-black uppercase tracking-widest text-zinc-400">Rasm</Label>
            <div 
              className={cn(
                "relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group",
                imagePreview ? "border-primary/50 bg-primary/5" : "border-zinc-200 hover:border-primary/30 hover:bg-zinc-50"
              )}
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-zinc-300 mb-2" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase">Rasm yuklash</span>
                </>
              )}
              <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-zinc-400">Batafsil ma'lumot</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mahsulot yoki xizmat haqida..."
              className="rounded-xl border-2 focus:ring-primary/20 min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video" className="text-xs font-black uppercase tracking-widest text-zinc-400">Video (Kinescope)</Label>
            <div 
              className={cn(
                "relative h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group",
                videoPreview ? "border-primary/50 bg-primary/5" : "border-zinc-200 hover:border-primary/30 hover:bg-zinc-50"
              )}
              onClick={() => document.getElementById('video-upload')?.click()}
            >
              {isUploadingVideo ? (
                <div className="flex flex-col items-center justify-center w-full px-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${videoProgress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-zinc-500 uppercase">{videoProgress}% Yuklanmoqda...</span>
                </div>
              ) : videoPreview ? (
                <>
                  <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-900/10">
                    <Play className="w-8 h-8 text-primary mb-2" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase px-2 text-center truncate w-full">
                      {videoFile ? videoFile.name : "Video yuklangan"}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Play className="w-8 h-8 text-zinc-300 mb-2" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase">Video yuklash</span>
                </>
              )}
              <input id="video-upload" type="file" accept="video/*" onChange={handleVideoChange} className="hidden" disabled={isUploadingVideo} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", isService ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600")}>
              {isService ? <Gem className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
            </div>
            <div>
              <Label htmlFor="isService" className="text-xs font-black uppercase block leading-none mb-1">Alohida Xizmat</Label>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Kartej, Video, Orkestr va hk.</p>
            </div>
          </div>
          <Switch id="isService" checked={isService} onCheckedChange={setIsService} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <Label htmlFor="available" className="text-xs font-black uppercase block leading-none mb-1">Mavjudlik</Label>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Hozirda buyurtma olsa bo'ladi</p>
            </div>
          </div>
          <Switch id="available" checked={available} onCheckedChange={setAvailable} />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <div className="flex items-center space-x-2">
          <Switch id="isNew" checked={isNew} onCheckedChange={setIsNew} />
          <Label htmlFor="isNew" className="text-[10px] font-black uppercase tracking-widest">Yangi mahsulot</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="needsContainer" checked={needsContainer} onCheckedChange={setNeedsContainer} />
          <Label htmlFor="needsContainer" className="text-[10px] font-black uppercase tracking-widest">Idish talab qiladi</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest border border-zinc-100"
        >
          Bekor qilish
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="h-12 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Ma'lumotni saqlash
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
