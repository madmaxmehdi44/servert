"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MapPin, Mail, Settings } from "lucide-react"

interface EnhancedUserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    id?: number
    name: string
    email: string
    phone?: string
    avatar_url?: string
    status: "active" | "inactive"
    role: "admin" | "manager" | "user"
    location_id?: number
    current_latitude?: number
    current_longitude?: number
    is_location_enabled?: boolean
  } | null
  locations: {
    id: number
    name: string
    city: string
    latitude?: number
    longitude?: number
  }[]
  onSuccess: () => void
  disabled?: boolean
}

export function EnhancedUserFormDialog({
  open,
  onOpenChange,
  user,
  locations,
  onSuccess,
  disabled = false,
}: EnhancedUserFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
    status: "active",
    role: "user",
    location_id: undefined,
    current_latitude: undefined,
    current_longitude: undefined,
    is_location_enabled: false,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState("basic")

  const isEditing = !!user?.id

  useEffect(() => {
    if (user) {
      setFormData(user)
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        avatar_url: "",
        status: "active",
        role: "user",
        location_id: undefined,
        current_latitude: undefined,
        current_longitude: undefined,
        is_location_enabled: false,
      })
    }
    setErrors({})
    setActiveTab("basic")
  }, [user, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "نام الزامی است"
    }

    if (!formData.email.trim()) {
      newErrors.email = "ایمیل الزامی است"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "فرمت ایمیل صحیح نیست"
    }

    if (formData.phone && !/^09\d{9}$/.test(formData.phone)) {
      newErrors.phone = "فرمت شماره تلفن صحیح نیست (مثال: 09121234567)"
    }

    if (formData.current_latitude && (formData.current_latitude < -90 || formData.current_latitude > 90)) {
      newErrors.current_latitude = "عرض جغرافیایی باید بین -90 تا 90 باشد"
    }

    if (formData.current_longitude && (formData.current_longitude < -180 || formData.current_longitude > 180)) {
      newErrors.current_longitude = "طول جغرافیایی باید بین -180 تا 180 باشد"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            current_latitude: position.coords.latitude,
            current_longitude: position.coords.longitude,
            is_location_enabled: true,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          setErrors({ location: "خطا در دریافت موقعیت مکانی" })
        },
      )
    } else {
      setErrors({ location: "مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (disabled) return

    setLoading(true)

    try {
      const url = isEditing ? `/api/users/${user.id}` : "/api/users"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          last_location_update: formData.is_location_enabled ? new Date().toISOString() : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
        onOpenChange(false)
      } else {
        setErrors({ submit: result.message || "خطا در ذخیره اطلاعات" })
      }
    } catch (error) {
      setErrors({ submit: "خطا در ارتباط با سرور" })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "ویرایش کاربر" : "افزودن کاربر جدید"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "اطلاعات کاربر را ویرایش کنید" : "اطلاعات کاربر جدید را وارد کنید"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="gap-2">
                <Settings className="h-4 w-4" />
                اطلاعات پایه
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2">
                <Mail className="h-4 w-4" />
                تماس
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="h-4 w-4" />
                موقعیت
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{getInitials(formData.name || "کاربر")}</AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="avatar_url">تصویر پروفایل</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url || ""}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    disabled={loading || disabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">نام کامل *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="نام و نام خانوادگی"
                  disabled={loading || disabled}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">وضعیت</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                    disabled={loading || disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="وضعیت را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">فعال</SelectItem>
                      <SelectItem value="inactive">غیرفعال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">نقش</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "manager" | "user") => setFormData({ ...formData, role: value })}
                    disabled={loading || disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="نقش را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مدیر کل</SelectItem>
                      <SelectItem value="manager">مدیر</SelectItem>
                      <SelectItem value="user">کاربر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@domain.com"
                  disabled={loading || disabled}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">شماره تلفن</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="09121234567"
                  disabled={loading || disabled}
                />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">مکان سازمانی</Label>
                <Select
                  value={formData.location_id?.toString() || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      location_id: value !== "none" ? Number.parseInt(value) : undefined,
                    })
                  }
                  disabled={loading || disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="مکان را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مکان</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name} - {location.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>ردیابی موقعیت زنده</Label>
                  <p className="text-sm text-gray-500">فعال‌سازی ردیابی موقعیت مکانی کاربر</p>
                </div>
                <Switch
                  checked={formData.is_location_enabled || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_location_enabled: checked })}
                  disabled={loading || disabled}
                />
              </div>

              {formData.is_location_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_latitude">عرض جغرافیایی</Label>
                      <Input
                        id="current_latitude"
                        type="number"
                        step="0.000001"
                        value={formData.current_latitude || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_latitude: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="35.6892"
                        disabled={loading || disabled}
                      />
                      {errors.current_latitude && <p className="text-sm text-red-500">{errors.current_latitude}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current_longitude">طول جغرافیایی</Label>
                      <Input
                        id="current_longitude"
                        type="number"
                        step="0.000001"
                        value={formData.current_longitude || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_longitude: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="51.3890"
                        disabled={loading || disabled}
                      />
                      {errors.current_longitude && <p className="text-sm text-red-500">{errors.current_longitude}</p>}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={loading || disabled}
                    className="w-full gap-2 bg-transparent"
                  >
                    <MapPin className="h-4 w-4" />
                    دریافت موقعیت فعلی
                  </Button>

                  {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
                </>
              )}
            </TabsContent>
          </Tabs>

          {errors.submit && <p className="text-sm text-red-500 mt-4">{errors.submit}</p>}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              انصراف
            </Button>
            <Button type="submit" disabled={loading || disabled}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "ذخیره تغییرات" : "افزودن کاربر"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
