"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Users, RefreshCw, Navigation, AlertTriangle } from "lucide-react"
import { InteractiveMap } from "./interactive-map"

interface User {
  id: number
  name: string
  email: string
  status: "active" | "inactive"
  role?: "admin" | "manager" | "user"
  current_latitude?: number
  current_longitude?: number
  last_location_update?: string
  is_location_enabled?: boolean
  location_accuracy?: number
  location_id?: number
  phone?: string
  avatar_url?: string
}

interface Location {
  id: number
  name: string
  city: string
  latitude?: number
  longitude?: number
  radius?: number
}

interface UserLocationMapProps {
  users: User[]
  locations: Location[]
  onRefresh: () => void
}

export function UserLocationMap({ users, locations, onRefresh }: UserLocationMapProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Filter users with location data
  const usersWithLocation = users.filter(
    (user) => user.current_latitude && user.current_longitude && user.is_location_enabled,
  )

  const getLocationName = (locationId?: number) => {
    if (!locationId) return "نامشخص"
    const location = locations.find((l) => l.id === locationId)
    return location ? `${location.name} - ${location.city}` : "نامشخص"
  }

  const getTimeSinceUpdate = (timestamp?: string) => {
    if (!timestamp) return "نامشخص"
    const now = new Date()
    const updateTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "همین الان"
    if (diffInMinutes < 60) return `${diffInMinutes} دقیقه پیش`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ساعت پیش`
    return `${Math.floor(diffInMinutes / 1440)} روز پیش`
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">کل کاربران</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">کاربران آنلاین</p>
                <p className="text-2xl font-bold text-green-600">{usersWithLocation.length}</p>
              </div>
              <Navigation className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">مکان‌های ثبت شده</p>
                <p className="text-2xl font-bold text-blue-600">{locations.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">درصد آنلاین</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.length > 0 ? Math.round((usersWithLocation.length / users.length) * 100) : 0}%
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Location Alert */}
      {usersWithLocation.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            هیچ کاربری با موقعیت فعال یافت نشد. کاربران باید مجوز موقعیت مکانی را اعطا کرده و ردیابی موقعیت را فعال
            کنند.
          </AlertDescription>
        </Alert>
      )}

      {/* Interactive Map */}
      <InteractiveMap users={users} locations={locations} onRefresh={onRefresh} onUserSelect={setSelectedUser} />

      {/* Selected User Details */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">جزئیات کاربر انتخاب شده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url || "/placeholder.svg"}
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <span className="text-sm font-bold">
                    {selectedUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <h4 className="font-medium">{selectedUser.name}</h4>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                {selectedUser.phone && <p className="text-sm text-gray-500">{selectedUser.phone}</p>}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>وضعیت:</span>
                <Badge variant={selectedUser.status === "active" ? "default" : "secondary"}>
                  {selectedUser.status === "active" ? "فعال" : "غیرفعال"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>نقش:</span>
                <Badge
                  variant="outline"
                  className={
                    selectedUser.role === "admin"
                      ? "border-red-500 text-red-600"
                      : selectedUser.role === "manager"
                        ? "border-blue-500 text-blue-600"
                        : "border-green-500 text-green-600"
                  }
                >
                  {selectedUser.role === "admin" ? "مدیر کل" : selectedUser.role === "manager" ? "مدیر" : "کاربر"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>مکان سازمانی:</span>
                <span>{getLocationName(selectedUser.location_id)}</span>
              </div>
              <div className="flex justify-between">
                <span>آخرین به‌روزرسانی:</span>
                <span>{getTimeSinceUpdate(selectedUser.last_location_update)}</span>
              </div>
              {selectedUser.location_accuracy && (
                <div className="flex justify-between">
                  <span>دقت موقعیت:</span>
                  <span>±{selectedUser.location_accuracy.toFixed(1)} متر</span>
                </div>
              )}
            </div>

            {selectedUser.current_latitude && selectedUser.current_longitude && (
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 mb-1">مختصات جغرافیایی:</div>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                  عرض: {selectedUser.current_latitude.toFixed(6)}
                  <br />
                  طول: {selectedUser.current_longitude.toFixed(6)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
