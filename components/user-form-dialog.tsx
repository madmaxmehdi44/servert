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
import { Loader2 } from "lucide-react"

interface User {
  id?: number
  name: string
  email: string
  status: "active" | "inactive"
  location_id?: number
}

interface Location {
  id: number
  name: string
  city: string
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  locations: Location[]
  onSuccess: () => void
  disabled?: boolean
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  locations,
  onSuccess,
  disabled = false,
}: UserFormDialogProps) {
  const [formData, setFormData] = useState<User>({
    name: "",
    email: "",
    status: "active",
    location_id: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!user?.id

  useEffect(() => {
    if (user) {
      setFormData(user)
    } else {
      setFormData({
        name: "",
        email: "",
        status: "active",
        location_id: undefined,
      })
    }
    setErrors({})
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
        body: JSON.stringify(formData),
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "ویرایش کاربر" : "افزودن کاربر جدید"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "اطلاعات کاربر را ویرایش کنید" : "اطلاعات کاربر جدید را وارد کنید"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">نام *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="نام کاربر"
              disabled={loading || disabled}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

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
            <Label htmlFor="location">مکان</Label>
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

          {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

          <DialogFooter>
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
