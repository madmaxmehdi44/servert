"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Smartphone,
  Tablet,
  Monitor,
  MapPin,
  Shield,
  Clock,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Settings,
  Navigation,
  Bell,
} from "lucide-react"

interface Device {
  id: number
  device_id: string
  device_name: string
  device_type: "mobile" | "tablet" | "desktop"
  platform: "ios" | "android" | "web"
  browser?: string
  os_version?: string
  app_version?: string
  supports_gps: boolean
  supports_push: boolean
  push_token?: string
  is_active: boolean
  is_trusted: boolean
  last_seen: string
  location_permission: "granted" | "denied" | "prompt"
  background_location_enabled: boolean
  created_at: string
}

interface DeviceManagementProps {
  userId: number
  devices: Device[]
  onDeviceUpdate: () => void
  onDeviceRemove: (deviceId: number) => void
}

export function DeviceManagement({ userId, devices, onDeviceUpdate, onDeviceRemove }: DeviceManagementProps) {
  const [currentDevice, setCurrentDevice] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Detect current device
    const deviceId = localStorage.getItem("deviceId") || generateDeviceId()
    setCurrentDevice(deviceId)
  }, [])

  const generateDeviceId = () => {
    const id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem("deviceId", id)
    return id
  }

  const getDeviceIcon = (device: Device) => {
    switch (device.device_type) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "tablet":
        return <Tablet className="h-4 w-4" />
      case "desktop":
        return <Monitor className="h-4 w-4" />
      default:
        return <Smartphone className="h-4 w-4" />
    }
  }

  const getPlatformBadge = (platform: string) => {
    const colors = {
      ios: "bg-gray-900",
      android: "bg-green-600",
      web: "bg-blue-600",
    }
    return <Badge className={colors[platform as keyof typeof colors] || "bg-gray-500"}>{platform.toUpperCase()}</Badge>
  }

  const getLocationPermissionBadge = (permission: string) => {
    switch (permission) {
      case "granted":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            مجاز
          </Badge>
        )
      case "denied":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            رد شده
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <AlertTriangle className="w-3 h-3 mr-1" />
            در انتظار
          </Badge>
        )
    }
  }

  const getLastSeenText = (lastSeen: string) => {
    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "همین الان"
    if (diffInMinutes < 60) return `${diffInMinutes} دقیقه پیش`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ساعت پیش`
    return `${Math.floor(diffInMinutes / 1440)} روز پیش`
  }

  const toggleDeviceTrust = async (deviceId: number, trusted: boolean) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/devices/${deviceId}/trust`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trusted: !trusted }),
      })

      if (response.ok) {
        onDeviceUpdate()
      }
    } catch (error) {
      console.error("Error updating device trust:", error)
    } finally {
      setLoading(false)
    }
  }

  const requestLocationPermission = async (deviceId: number) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await fetch(`/api/devices/${deviceId}/location`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                permission: "granted",
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }),
            })
            onDeviceUpdate()
          } catch (error) {
            console.error("Error updating location permission:", error)
          }
        },
        async (error) => {
          try {
            await fetch(`/api/devices/${deviceId}/location`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ permission: "denied" }),
            })
            onDeviceUpdate()
          } catch (err) {
            console.error("Error updating location permission:", err)
          }
        },
      )
    }
  }

  const enablePushNotifications = async (deviceId: number) => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        await fetch(`/api/devices/${deviceId}/push`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pushToken: JSON.stringify(subscription),
            supportsPush: true,
          }),
        })

        onDeviceUpdate()
      } catch (error) {
        console.error("Error enabling push notifications:", error)
      }
    }
  }

  const activeDevices = devices.filter((d) => d.is_active)
  const trustedDevices = devices.filter((d) => d.is_trusted)
  const devicesWithLocation = devices.filter((d) => d.location_permission === "granted")

  return (
    <div className="space-y-6">
      {/* Device Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">کل دستگاه‌ها</p>
                <p className="text-2xl font-bold">{devices.length}</p>
              </div>
              <Smartphone className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">دستگاه‌های فعال</p>
                <p className="text-2xl font-bold text-green-600">{activeDevices.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">دستگاه‌های مورد اعتماد</p>
                <p className="text-2xl font-bold text-blue-600">{trustedDevices.length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">با موقعیت مکانی</p>
                <p className="text-2xl font-bold text-purple-600">{devicesWithLocation.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Device Alert */}
      {currentDevice && (
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            شما در حال حاضر از دستگاه با شناسه <code className="bg-gray-100 px-1 rounded">{currentDevice}</code> استفاده
            می‌کنید.
          </AlertDescription>
        </Alert>
      )}

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            مدیریت دستگاه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>دستگاه</TableHead>
                  <TableHead>پلتفرم</TableHead>
                  <TableHead>قابلیت‌ها</TableHead>
                  <TableHead>موقعیت مکانی</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>آخرین فعالیت</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      هیچ دستگاهی ثبت نشده است
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.id} className={device.device_id === currentDevice ? "bg-blue-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(device)}
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {device.device_name}
                              {device.device_id === currentDevice && (
                                <Badge variant="outline" className="text-xs">
                                  دستگاه فعلی
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {device.browser && `${device.browser} • `}
                              {device.os_version}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{getPlatformBadge(device.platform)}</TableCell>

                      <TableCell>
                        <div className="flex gap-1">
                          {device.supports_gps && (
                            <Badge variant="outline" className="text-xs">
                              <Navigation className="w-3 h-3 mr-1" />
                              GPS
                            </Badge>
                          )}
                          {device.supports_push && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="w-3 h-3 mr-1" />
                              Push
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {getLocationPermissionBadge(device.location_permission)}
                          {device.background_location_enabled && (
                            <Badge variant="outline" className="text-xs block w-fit">
                              پس‌زمینه فعال
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {device.is_active ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              فعال
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              غیرفعال
                            </Badge>
                          )}
                          {device.is_trusted && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              مورد اعتماد
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{getLastSeenText(device.last_seen)}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => toggleDeviceTrust(device.id, device.is_trusted)}
                              disabled={loading}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {device.is_trusted ? "حذف اعتماد" : "اعتماد به دستگاه"}
                            </DropdownMenuItem>

                            {device.location_permission !== "granted" && device.supports_gps && (
                              <DropdownMenuItem onClick={() => requestLocationPermission(device.id)}>
                                <MapPin className="mr-2 h-4 w-4" />
                                درخواست مجوز موقعیت
                              </DropdownMenuItem>
                            )}

                            {device.supports_push && !device.push_token && (
                              <DropdownMenuItem onClick={() => enablePushNotifications(device.id)}>
                                <Bell className="mr-2 h-4 w-4" />
                                فعال‌سازی اعلان‌ها
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => onDeviceRemove(device.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              حذف دستگاه
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
