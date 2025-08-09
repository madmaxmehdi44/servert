"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MapPin, Navigation, RefreshCw, Search, Target, Clock, Phone, Mail, Maximize, Minimize } from "lucide-react"
import { LeafletMap, TileLayer, Marker, Popup, Circle, Polyline } from "./leaflet-map"

interface User {
  id: number
  name: string
  email: string
  phone?: string
  avatar_url?: string
  status: "active" | "inactive"
  role: "admin" | "manager" | "user"
  current_latitude?: number
  current_longitude?: number
  last_location_update?: string
  is_location_enabled?: boolean
  location_accuracy?: number
  location_id?: number
}

interface Location {
  id: number
  name: string
  city: string
  latitude?: number
  longitude?: number
  radius?: number
}

interface Geofence {
  id: number
  name: string
  latitude: number
  longitude: number
  radius: number
  is_active: boolean
  entry_alert: boolean
  exit_alert: boolean
}

interface LocationHistory {
  id: number
  user_id: number
  latitude: number
  longitude: number
  timestamp: string
}

interface InteractiveMapProps {
  users: User[]
  locations: Location[]
  geofences?: Geofence[]
  locationHistory?: LocationHistory[]
  onRefresh: () => void
  onUserSelect?: (user: User) => void
  onLocationSelect?: (location: Location) => void
}

export function InteractiveMap({
  users,
  locations,
  geofences = [],
  locationHistory = [],
  onRefresh,
  onUserSelect,
  onLocationSelect,
}: InteractiveMapProps) {
  const [map, setMap] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6892, 51.389]) // Tehran center
  const [mapZoom, setMapZoom] = useState(10)
  const [showGeofences, setShowGeofences] = useState(true)
  const [showLocationHistory, setShowLocationHistory] = useState(false)
  const [showOfflineUsers, setShowOfflineUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [mapStyle, setMapStyle] = useState<"street" | "satellite" | "terrain">("street")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [userIcons, setUserIcons] = useState<{ [key: string]: any }>({})
  const [isClient, setIsClient] = useState(false)

  const mapRef = useRef<any>(null)

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize Leaflet icons on client side
  useEffect(() => {
    if (isClient && typeof window !== "undefined") {
      import("leaflet").then((L) => {
        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        })

        // Create custom icons for different user types
        const createUserIcon = (color: string, role: string) => {
          return L.divIcon({
            className: "custom-user-marker",
            html: `
              <div class="relative">
                <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold" style="background-color: ${color}">
                  ${role === "admin" ? "A" : role === "manager" ? "M" : "U"}
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full animate-pulse"></div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          })
        }

        const createLocationIcon = () => {
          return L.divIcon({
            className: "custom-location-marker",
            html: `
              <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <div class="w-2 h-2 bg-white rounded-full"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24],
          })
        }

        const createOfflineIcon = () => {
          return L.divIcon({
            className: "custom-offline-marker",
            html: `
              <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center bg-gray-400 text-white text-xs font-bold opacity-60">
                ?
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          })
        }

        setUserIcons({
          admin: createUserIcon("#dc2626", "admin"),
          manager: createUserIcon("#2563eb", "manager"),
          user: createUserIcon("#16a34a", "user"),
          location: createLocationIcon(),
          offline: createOfflineIcon(),
        })
      })
    }
  }, [isClient])

  // Filter users based on search and settings
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const hasLocation = user.current_latitude && user.current_longitude && user.is_location_enabled
    const isOnline = hasLocation && user.status === "active"

    if (!showOfflineUsers && !isOnline) return false

    return matchesSearch
  })

  // Get users with location data
  const usersWithLocation = filteredUsers.filter(
    (user) => user.current_latitude && user.current_longitude && user.is_location_enabled,
  )

  // Get tile layer URL based on map style
  const getTileLayerUrl = () => {
    switch (mapStyle) {
      case "satellite":
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      case "terrain":
        return "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
      default:
        return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    }
  }

  // Get tile layer attribution
  const getTileLayerAttribution = () => {
    switch (mapStyle) {
      case "satellite":
        return "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
      case "terrain":
        return 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  }

  // Center map on user
  const centerOnUser = (user: User) => {
    if (user.current_latitude && user.current_longitude && map) {
      map.setView([user.current_latitude, user.current_longitude], 15)
      setSelectedUser(user)
      onUserSelect?.(user)
    }
  }

  // Center map on location
  const centerOnLocation = (location: Location) => {
    if (location.latitude && location.longitude && map) {
      map.setView([location.latitude, location.longitude], 14)
      setSelectedLocation(location)
      onLocationSelect?.(location)
    }
  }

  // Get time since last update
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

  // Get user location history for selected user
  const getUserLocationHistory = (userId: number) => {
    return locationHistory
      .filter((history) => history.user_id === userId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((history) => [history.latitude, history.longitude] as [number, number])
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isClient) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">در حال بارگذاری نقشه تعاملی...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-white p-4" : ""}`}>
      {/* Map Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              نقشه تعاملی موقعیت کاربران
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={toggleFullscreen} variant="outline" size="sm">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2 bg-transparent">
                <RefreshCw className="h-4 w-4" />
                به‌روزرسانی
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="controls" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="controls">کنترل‌ها</TabsTrigger>
              <TabsTrigger value="users">کاربران ({usersWithLocation.length})</TabsTrigger>
              <TabsTrigger value="locations">مکان‌ها ({locations.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="controls" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>جستجو</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="جستجو کاربران..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Map Style */}
                <div className="space-y-2">
                  <Label>نوع نقشه</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={mapStyle === "street" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMapStyle("street")}
                    >
                      خیابان
                    </Button>
                    <Button
                      variant={mapStyle === "satellite" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMapStyle("satellite")}
                    >
                      ماهواره
                    </Button>
                    <Button
                      variant={mapStyle === "terrain" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMapStyle("terrain")}
                    >
                      توپوگرافی
                    </Button>
                  </div>
                </div>

                {/* Display Options */}
                <div className="space-y-3">
                  <Label>گزینه‌های نمایش</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">محدوده‌های امنیتی</span>
                      <Switch checked={showGeofences} onCheckedChange={setShowGeofences} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">مسیر حرکت</span>
                      <Switch checked={showLocationHistory} onCheckedChange={setShowLocationHistory} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">کاربران آفلاین</span>
                      <Switch checked={showOfflineUsers} onCheckedChange={setShowOfflineUsers} />
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-2">
                  <Label>آمار</Label>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>کل کاربران:</span>
                      <Badge variant="outline">{filteredUsers.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>آنلاین:</span>
                      <Badge className="bg-green-500">{usersWithLocation.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>مکان‌ها:</span>
                      <Badge variant="secondary">{locations.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>محدوده‌ها:</span>
                      <Badge variant="outline">{geofences.length}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                {usersWithLocation.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Navigation className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>هیچ کاربری با موقعیت فعال یافت نشد</p>
                  </div>
                ) : (
                  usersWithLocation.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedUser?.id === user.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => centerOnUser(user)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{user.name}</h4>
                            <Badge
                              variant={user.status === "active" ? "default" : "secondary"}
                              className={
                                user.role === "admin"
                                  ? "bg-red-600"
                                  : user.role === "manager"
                                    ? "bg-blue-600"
                                    : "bg-green-600"
                              }
                            >
                              {user.role === "admin" ? "مدیر" : user.role === "manager" ? "مدیر" : "کاربر"}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{getTimeSinceUpdate(user.last_location_update)}</span>
                            </div>
                            {user.location_accuracy && (
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                <span>دقت: ±{user.location_accuracy.toFixed(0)}m</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => centerOnUser(user)}>
                          <Navigation className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="locations" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                {locations.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>هیچ مکانی تعریف نشده است</p>
                  </div>
                ) : (
                  locations.map((location) => (
                    <div
                      key={location.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedLocation?.id === location.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => centerOnLocation(location)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{location.name}</h4>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{location.city}</span>
                            </div>
                            {location.latitude && location.longitude && (
                              <div className="font-mono text-xs">
                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                              </div>
                            )}
                            {location.radius && (
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                <span>شعاع: {location.radius}m</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => centerOnLocation(location)}>
                          <Navigation className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card className={isFullscreen ? "flex-1" : ""}>
        <CardContent className="p-0">
          <div className={`relative ${isFullscreen ? "h-full" : "h-[600px]"} w-full rounded-lg overflow-hidden`}>
            <LeafletMap center={mapCenter} zoom={mapZoom} onMapReady={setMap}>
              <TileLayer url={getTileLayerUrl()} attribution={getTileLayerAttribution()} />

              {/* User Markers */}
              {usersWithLocation.map((user) => (
                <Marker
                  key={`user-${user.id}`}
                  position={[user.current_latitude!, user.current_longitude!]}
                  icon={userIcons[user.role] || userIcons.user}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url || "/placeholder.svg"}
                              alt={user.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-bold">{getInitials(user.name)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{user.name}</h3>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={
                                user.role === "admin"
                                  ? "border-red-500 text-red-600"
                                  : user.role === "manager"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-green-500 text-green-600"
                              }
                            >
                              {user.role === "admin" ? "مدیر کل" : user.role === "manager" ? "مدیر" : "کاربر"}
                            </Badge>
                            <Badge variant={user.status === "active" ? "default" : "secondary"}>
                              {user.status === "active" ? "فعال" : "غیرفعال"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{getTimeSinceUpdate(user.last_location_update)}</span>
                        </div>
                        {user.location_accuracy && (
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-gray-400" />
                            <span>دقت: ±{user.location_accuracy.toFixed(1)} متر</span>
                          </div>
                        )}
                        <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                          عرض: {user.current_latitude!.toFixed(6)}
                          <br />
                          طول: {user.current_longitude!.toFixed(6)}
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => setSelectedUser(user)}>
                          جزئیات
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => centerOnUser(user)}>
                          مرکز نقشه
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Location Markers */}
              {locations.map(
                (location) =>
                  location.latitude &&
                  location.longitude && (
                    <Marker
                      key={`location-${location.id}`}
                      position={[location.latitude, location.longitude]}
                      icon={userIcons.location}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-semibold mb-2">{location.name}</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{location.city}</span>
                            </div>
                            {location.radius && (
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-gray-400" />
                                <span>شعاع: {location.radius} متر</span>
                              </div>
                            )}
                            <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                              عرض: {location.latitude.toFixed(6)}
                              <br />
                              طول: {location.longitude.toFixed(6)}
                            </div>
                          </div>
                          <div className="mt-3">
                            <Button size="sm" onClick={() => centerOnLocation(location)}>
                              مرکز نقشه
                            </Button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ),
              )}

              {/* Geofences */}
              {showGeofences &&
                geofences.map(
                  (geofence) =>
                    geofence.is_active && (
                      <Circle
                        key={`geofence-${geofence.id}`}
                        center={[geofence.latitude, geofence.longitude]}
                        radius={geofence.radius}
                        pathOptions={{
                          color: geofence.entry_alert || geofence.exit_alert ? "#ef4444" : "#3b82f6",
                          fillColor: geofence.entry_alert || geofence.exit_alert ? "#ef4444" : "#3b82f6",
                          fillOpacity: 0.1,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold mb-2">{geofence.name}</h3>
                            <div className="space-y-1 text-sm">
                              <div>شعاع: {geofence.radius} متر</div>
                              <div className="flex gap-2">
                                {geofence.entry_alert && <Badge className="bg-green-500">هشدار ورود</Badge>}
                                {geofence.exit_alert && <Badge className="bg-red-500">هشدار خروج</Badge>}
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Circle>
                    ),
                )}

              {/* Location History */}
              {showLocationHistory && selectedUser && getUserLocationHistory(selectedUser.id).length > 1 && (
                <Polyline
                  positions={getUserLocationHistory(selectedUser.id)}
                  pathOptions={{
                    color: "#8b5cf6",
                    weight: 3,
                    opacity: 0.7,
                    dashArray: "5, 10",
                  }}
                />
              )}
            </LeafletMap>
          </div>
        </CardContent>
      </Card>

      {/* Map Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            راهنمای نقشه
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded-full border border-white"></div>
              <span className="text-sm">مدیر کل</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full border border-white"></div>
              <span className="text-sm">مدیر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded-full border border-white"></div>
              <span className="text-sm">کاربر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              <span className="text-sm">مکان سازمانی</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-500 rounded-full bg-red-100"></div>
              <span className="text-sm">محدوده امنیتی</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-1 bg-purple-500"
                style={{ clipPath: "polygon(0 0, 100% 0, 90% 100%, 10% 100%)" }}
              ></div>
              <span className="text-sm">مسیر حرکت</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">آنلاین</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm">آفلاین</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
