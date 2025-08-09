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
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface Location {
  id?: number
  name: string
  address: string
  city: string
  country: string
  coordinates?: string
}

interface LocationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location | null
  onSuccess: () => void
  disabled?: boolean
}

export function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSuccess,
  disabled = false,
}: LocationFormDialogProps) {
  const [formData, setFormData] = useState<Location>({
    name: "",
    address: "",
    city: "",
    country: "ایران",
    coordinates: "",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!location?.id

  useEffect(() => {
    if (location) {
      setFormData(location)
    } else {
      setFormData({
        name: "",
        address: "",
        city: "",
        country: "ایران",
        coordinates: "",
      })
    }
    setErrors({})
  }, [location, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "نام مکان الزامی است"
    }

    if (!formData.address.trim()) {
      newErrors.address = "آدرس الزامی است"
    }

    if (!formData.city.trim()) {
      newErrors.city = "شهر الزامی است"
    }

    if (!formData.country.trim()) {
      newErrors.country = "کشور الزامی است"
    }

    // Validate coordinates format if provided
    if (formData.coordinates && formData.coordinates.trim()) {
      const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/
      if (!coordPattern.test(formData.coordinates.trim())) {
        newErrors.coordinates = "فرمت مختصات صحیح نیست (مثال: 35.6892,51.3890)"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (disabled) return

    setLoading(true)

    try {
      const url = isEditing ? `/api/locations/${location.id}` : "/api/locations"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          coordinates: formData.coordinates?.trim() || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "ویرایش مکان" : "افزودن مکان جدید"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "اطلاعات مکان را ویرایش کنید" : "اطلاعات مکان جدید را وارد کنید"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">نام مکان *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="نام مکان"
              disabled={loading || disabled}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">شهر *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="شهر"
                disabled={loading || disabled}
              />
              {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">کشور *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="کشور"
                disabled={loading || disabled}
              />
              {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">آدرس *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="آدرس کامل"
              disabled={loading || disabled}
              rows={3}
            />
            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coordinates">مختصات جغرافیایی</Label>
            <Input
              id="coordinates"
              value={formData.coordinates || ""}
              onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
              placeholder="35.6892,51.3890"
              disabled={loading || disabled}
            />
            <p className="text-xs text-gray-500">اختیاری - فرمت: عرض جغرافیایی,طول جغرافیایی</p>
            {errors.coordinates && <p className="text-sm text-red-500">{errors.coordinates}</p>}
          </div>

          {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              انصراف
            </Button>
            <Button type="submit" disabled={loading || disabled}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "ذخیره تغییرات" : "افزودن مکان"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
