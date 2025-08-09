"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Target,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Bell,
  BellOff,
} from "lucide-react"

interface Geofence {
  id: number
  name: string
  latitude: number
  longitude: number
  radius: number
  is_active: boolean
  entry_alert: boolean
  exit_alert: boolean
  location_id?: number
  created_at: string
}

interface Location {
  id: number
  name: string
  city: string
  latitude?: number
  longitude?: number
}

interface GeofenceManagementProps {
  geofences: Geofence[]
  locations: Location[]
  onGeofenceUpdate: () => void
  disabled?: boolean
}

export function GeofenceManagement({
  geofences,
  locations,
  onGeofenceUpdate,
  disabled = false,
}: GeofenceManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: "100",
    is_active: true,
    entry_alert: true,
    exit_alert: true,
    location_id: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    setFormData({
      name: "",
      latitude: "",
      longitude: "",
      radius: "100",
      is_active: true,
      entry_alert: true,
      exit_alert: true,
      location_id: "",
    })
    setErrors({})
    setEditingGeofence(null)
  }

  const openDialog = (geofence?: Geofence) => {
    if (geofence) {
      setEditingGeofence(geofence)
      setFormData({
        name: geofence.name,
        latitude: geofence.latitude.toString(),
        longitude: geofence.longitude.toString(),
        radius: geofence.radius.toString(),
        is_active: geofence.is_active,
        entry_alert: geofence.entry_alert,
        exit_alert: geofence.exit_alert,
        location_id: geofence.location_id?.toString() || "",
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "نام محدوده الزامی است"
    }

    const lat = Number.parseFloat(formData.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = "عرض جغرافیایی باید بین -90 تا 90 باشد"
    }

    const lng = Number.parseFloat(formData.longitude)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.longitude = "طول جغرافیایی باید بین -180 تا 180 باشد"
    }

    const radius = Number.parseFloat(formData.radius)
    if (isNaN(radius) || radius < 10 || radius > 10000) {
      newErrors.radius = "شعاع باید بین 10 تا 10000 متر باشد"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || disabled) return

    setLoading(true)

    try {
      const url = editingGeofence ? `/api/geofences/${editingGeofence.id}` : "/api/geofences"
      const method = editingGeofence ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          latitude: Number.parseFloat(formData.latitude),
          longitude: Number.parseFloat(formData.longitude),
          radius: Number.parseFloat(formData.radius),
          is_active: formData.is_active,
          entry_alert: formData.entry_alert,
          exit_alert: formData.exit_alert,
          location_id: formData.location_id ? Number.parseInt(formData.location_id) : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onGeofenceUpdate()
        setDialogOpen(false)
        resetForm()
      } else {
        setErrors({ submit: result.message || "خطا در ذخیره محدوده" })
      }
    } catch (error) {
      setErrors({ submit: "خطا در ارتباط با سرور" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (geofenceId: number) => {
    if (disabled) return

    setLoading(true)

    try {
      const response = await fetch(`/api/geofences/${geofenceId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onGeofenceUpdate()
      }
    } catch (error) {
      console.error("Error deleting geofence:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGeofenceStatus = async (geofenceId: number, isActive: boolean) => {
    if (disabled) return

    try {
      const response = await fetch(`/api/geofences/${geofenceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      })

      if (response.ok) {
        onGeofenceUpdate()
      }
    } catch (error) {
      console.error("Error toggling geofence status:", error)
    }
  }

  const useLocationCoordinates = (locationId: string) => {
    const location = locations.find((l) => l.id === Number.parseInt(locationId))
    if (location && location.latitude && location.longitude) {
      setFormData({
        ...formData,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        location_id: locationId,
      })
    }
  }

  const activeGeofences = geofences.filter((g) => g.is_active)
  const geofencesWithAlerts = geofences.filter((g) => g.entry_alert || g.exit_alert)

  useEffect(() => {
    // This effect is used to ensure that useLocationCoordinates is called at the top level
    if (formData.location_id) {
      useLocationCoordinates(formData.location_id)
    }
  }, [formData.location_id])

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">کل محدوده‌ها</p>
                <p className="text-2xl font-bold">{geofences.length}</p>
              </div>
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">محدوده‌های فعال</p>
                <p className="text-2xl font-bold text-green-600">{activeGeofences.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">با هشدار</p>
                <p className="text-2xl font-bold text-orange-600">{geofencesWithAlerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">میانگین شعاع</p>
                <p className="text-2xl font-bold text-blue-600">
                  {geofences.length > 0
                    ? Math.round(geofences.reduce((sum, g) => sum + g.radius, 0) / geofences.length)
                    : 0}
                  m
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geofences Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              مدیریت محدوده‌های امنیتی
            </CardTitle>
            <Button onClick={() => openDialog()} disabled={disabled} className="gap-2">
              <Plus className="h-4 w-4" />
              محدوده جدید
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {disabled && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>در حالت نمایشی، امکان ویرایش محدوده‌ها وجود ندارد.</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام محدوده</TableHead>
                  <TableHead>مختصات</TableHead>
                  <TableHead>شعاع</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>هشدارها</TableHead>
                  <TableHead>مکان مرتبط</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {geofences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      هیچ محدوده امنیتی تعریف نشده است
                    </TableCell>
                  </TableRow>
                ) : (
                  geofences.map((geofence) => {
                    const relatedLocation = locations.find((l) => l.id === geofence.location_id)

                    return (
                      <TableRow key={geofence.id}>
                        <TableCell className="font-medium">{geofence.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)}
                        </TableCell>
                        <TableCell>{geofence.radius} متر</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={geofence.is_active ? "default" : "secondary"}>
                              {geofence.is_active ? "فعال" : "غیرفعال"}
                            </Badge>
                            <Switch
                              checked={geofence.is_active}
                              onCheckedChange={() => toggleGeofenceStatus(geofence.id, geofence.is_active)}
                              disabled={disabled}
                              size="sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {geofence.entry_alert && (
                              <Badge variant="outline" className="text-xs">
                                <Bell className="w-3 h-3 mr-1" />
                                ورود
                              </Badge>
                            )}
                            {geofence.exit_alert && (
                              <Badge variant="outline" className="text-xs">
                                <BellOff className="w-3 h-3 mr-1" />
                                خروج
                              </Badge>
                            )}
                            {!geofence.entry_alert && !geofence.exit_alert && (
                              <Badge variant="secondary" className="text-xs">
                                بدون هشدار
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {relatedLocation ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{relatedLocation.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">نامشخص</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDialog(geofence)} disabled={disabled}>
                                <Edit className="mr-2 h-4 w-4" />
                                ویرایش
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(geofence.id)}
                                disabled={disabled}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Geofence Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingGeofence ? "ویرایش محدوده امنیتی" : "ایجاد محدوده امنیتی جدید"}</DialogTitle>
            <DialogDescription>محدوده امنیتی برای نظارت بر ورود و خروج کاربران تعریف کنید</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام محدوده *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="محدوده دفتر مرکزی"
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>مکان مرجع (اختیاری)</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                disabled={loading}
              >
                <option value="">انتخاب مکان...</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} - {location.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">عرض جغرافیایی *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="35.6892"
                  disabled={loading}
                />
                {errors.latitude && <p className="text-sm text-red-500">{errors.latitude}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">طول جغرافیایی *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="51.3890"
                  disabled={loading}
                />
                {errors.longitude && <p className="text-sm text-red-500">{errors.longitude}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">شعاع (متر) *</Label>
              <Input
                id="radius"
                type="number"
                min="10"
                max="10000"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                placeholder="100"
                disabled={loading}
              />
              {errors.radius && <p className="text-sm text-red-500">{errors.radius}</p>}
            </div>

            <div className="space-y-3">
              <Label>تنظیمات محدوده</Label>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">فعال‌سازی محدوده</Label>
                  <p className="text-xs text-gray-500">محدوده فعال باشد و نظارت شود</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">هشدار ورود</Label>
                  <p className="text-xs text-gray-500">هنگام ورود کاربر به محدوده هشدار داده شود</p>
                </div>
                <Switch
                  checked={formData.entry_alert}
                  onCheckedChange={(checked) => setFormData({ ...formData, entry_alert: checked })}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">هشدار خروج</Label>
                  <p className="text-xs text-gray-500">هنگام خروج کاربر از محدوده هشدار داده شود</p>
                </div>
                <Switch
                  checked={formData.exit_alert}
                  onCheckedChange={(checked) => setFormData({ ...formData, exit_alert: checked })}
                  disabled={loading}
                />
              </div>
            </div>

            {errors.submit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
                انصراف
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    در حال ذخیره...
                  </>
                ) : editingGeofence ? (
                  "ذخیره تغییرات"
                ) : (
                  "ایجاد محدوده"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
