"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Users, RefreshCw, Navigation, Clock } from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  status: "active" | "inactive"
  current_latitude?: number
  current_longitude?: number
  last_location_update?: string
  is_location_enabled?: boolean
  location_id?: number
}

interface Location {
  id: number
  name: string
  city: string
  latitude?: number
  longitude?: number
}

interface UserLocationMapProps {
  users: User[]
  locations: Location[]
  onRefresh: () => void
}

export function UserLocationMap({ users, locations, onRefresh }: UserLocationMapProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 35.6892, lng: 51.389 }) // Tehran center

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

  const centerMapOnUser = (user: User) => {
    if (user.current_latitude && user.current_longitude) {
      setMapCenter({
        lat: user.current_latitude,
        lng: user.current_longitude,
      })
      setSelectedUser(user)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Container */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                نقشه موقعیت کاربران
              </CardTitle>
              <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2 bg-transparent">
                <RefreshCw className="h-4 w-4" />
                به‌روزرسانی
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Map Placeholder - In a real app, you'd use react-leaflet or similar */}
            <div className="relative w-full h-[500px] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center space-y-4">
                <MapPin className="h-16 w-16 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-600">نقشه تعاملی</h3>
                  <p className="text-gray-500">
                    برای نمایش نقشه واقعی، کتابخانه react-leaflet یا Google Maps را نصب کنید
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  <p>
                    مرکز نقشه: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                  </p>
                  <p>کاربران فعال: {usersWithLocation.length}</p>
                </div>
              </div>

              {/* Simulated markers */}
              <div className="absolute inset-0 pointer-events-none">
                {usersWithLocation.slice(0, 5).map((user, index) => (
                  <div
                    key={user.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{
                      left: `${20 + index * 15}%`,
                      top: `${30 + index * 10}%`,
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer ${
                        user.status === "active" ? "bg-green-500" : "bg-gray-400"
                      } ${selectedUser?.id === user.id ? "ring-2 ring-blue-500" : ""}`}
                      onClick={() => setSelectedUser(user)}
                      title={user.name}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Map Controls */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">کاربران فعال</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">کاربران غیرفعال</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {usersWithLocation.length} از {users.length} کاربر موقعیت فعال دارند
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              کاربران آنلاین ({usersWithLocation.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {usersWithLocation.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Navigation className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>هیچ کاربری موقعیت فعال ندارد</p>
              </div>
            ) : (
              usersWithLocation.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => centerMapOnUser(user)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{user.name}</h4>
                        <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">
                          {user.status === "active" ? "فعال" : "غیرفعال"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{getLocationName(user.location_id)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{getTimeSinceUpdate(user.last_location_update)}</span>
                        </div>
                        {user.current_latitude && user.current_longitude && (
                          <div className="font-mono text-xs">
                            {user.current_latitude.toFixed(4)}, {user.current_longitude.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        centerMapOnUser(user)
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Selected User Details */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">جزئیات کاربر انتخاب شده</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">{selectedUser.name}</h4>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>وضعیت:</span>
                  <Badge variant={selectedUser.status === "active" ? "default" : "secondary"}>
                    {selectedUser.status === "active" ? "فعال" : "غیرفعال"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>مکان:</span>
                  <span>{getLocationName(selectedUser.location_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span>آخرین به‌روزرسانی:</span>
                  <span>{getTimeSinceUpdate(selectedUser.last_location_update)}</span>
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
