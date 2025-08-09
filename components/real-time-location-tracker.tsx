"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MapPin, Navigation, Battery, Wifi, Smartphone, AlertTriangle, Clock, Zap, Target } from "lucide-react"

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  speed?: number
  heading?: number
  timestamp: number
}

interface RealTimeLocationTrackerProps {
  userId: number
  deviceId: number
  onLocationUpdate: (location: LocationData) => void
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}

export function RealTimeLocationTracker({
  userId,
  deviceId,
  onLocationUpdate,
  isEnabled,
  onToggle,
}: RealTimeLocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([])
  const [tracking, setTracking] = useState(false)
  const [error, setError] = useState<string>("")
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online")
  const [accuracy, setAccuracy] = useState<"high" | "medium" | "low">("medium")
  const [backgroundTracking, setBackgroundTracking] = useState(false)

  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Monitor battery level
    if ("getBattery" in navigator) {
      ;(navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100))

        battery.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(battery.level * 100))
        })
      })
    }

    // Monitor network status
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? "online" : "offline")
    }

    window.addEventListener("online", updateNetworkStatus)
    window.addEventListener("offline", updateNetworkStatus)

    return () => {
      window.removeEventListener("online", updateNetworkStatus)
      window.removeEventListener("offline", updateNetworkStatus)
    }
  }, [])

  useEffect(() => {
    if (isEnabled && tracking) {
      startLocationTracking()
    } else {
      stopLocationTracking()
    }

    return () => stopLocationTracking()
  }, [isEnabled, tracking, accuracy])

  const getLocationOptions = () => {
    const options: PositionOptions = {
      enableHighAccuracy: accuracy === "high",
      timeout: accuracy === "high" ? 15000 : 10000,
      maximumAge: accuracy === "high" ? 30000 : 60000,
    }
    return options
  }

  const startLocationTracking = () => {
    if (!("geolocation" in navigator)) {
      setError("مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند")
      return
    }

    const options = getLocationOptions()

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: position.timestamp,
        }

        setCurrentLocation(locationData)
        setLocationHistory((prev) => [...prev.slice(-49), locationData]) // Keep last 50 locations
        onLocationUpdate(locationData)
        setError("")

        // Send to server
        sendLocationToServer(locationData)
      },
      (error) => {
        let errorMessage = "خطا در دریافت موقعیت مکانی"

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "مجوز دسترسی به موقعیت مکانی رد شده است"
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "موقعیت مکانی در دسترس نیست"
            break
          case error.TIMEOUT:
            errorMessage = "زمان درخواست موقعیت مکانی به پایان رسید"
            break
        }

        setError(errorMessage)
      },
      options,
    )

    // Set up periodic updates for background tracking
    if (backgroundTracking) {
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude || undefined,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
              timestamp: position.timestamp,
            }

            sendLocationToServer(locationData, true) // Mark as background update
          },
          (error) => console.error("Background location error:", error),
          { ...options, timeout: 5000 },
        )
      }, 60000) // Every minute for background updates
    }
  }

  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const sendLocationToServer = async (location: LocationData, isBackground = false) => {
    try {
      await fetch("/api/location/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          deviceId,
          ...location,
          batteryLevel,
          isBackground,
          networkStatus,
        }),
      })
    } catch (error) {
      console.error("Error sending location to server:", error)
    }
  }

  const handleToggleTracking = (enabled: boolean) => {
    setTracking(enabled)
    onToggle(enabled)
  }

  const getAccuracyColor = (acc: number) => {
    if (acc <= 10) return "text-green-600"
    if (acc <= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getAccuracyText = (acc: number) => {
    if (acc <= 10) return "بسیار دقیق"
    if (acc <= 50) return "دقیق"
    if (acc <= 100) return "متوسط"
    return "کم دقت"
  }

  const formatSpeed = (speed?: number) => {
    if (!speed) return "نامشخص"
    return `${(speed * 3.6).toFixed(1)} کیلومتر بر ساعت`
  }

  const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const distance = R * c

    if (distance < 1000) {
      return `${distance.toFixed(0)} متر`
    } else {
      return `${(distance / 1000).toFixed(2)} کیلومتر`
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Control Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              ردیابی موقعیت زنده
            </div>
            <div className="flex items-center gap-2">
              {tracking && (
                <Badge className="bg-green-500 animate-pulse">
                  <Target className="w-3 h-3 mr-1" />
                  در حال ردیابی
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">فعال‌سازی ردیابی موقعیت</Label>
              <p className="text-sm text-gray-500">ردیابی مداوم موقعیت مکانی شما</p>
            </div>
            <Switch checked={tracking} onCheckedChange={handleToggleTracking} disabled={!isEnabled} />
          </div>

          {/* Accuracy Settings */}
          <div className="space-y-2">
            <Label>دقت ردیابی</Label>
            <div className="flex gap-2">
              <Button
                variant={accuracy === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setAccuracy("high")}
              >
                بالا
              </Button>
              <Button
                variant={accuracy === "medium" ? "default" : "outline"}
                size="sm"
                onClick={() => setAccuracy("medium")}
              >
                متوسط
              </Button>
              <Button variant={accuracy === "low" ? "default" : "outline"} size="sm" onClick={() => setAccuracy("low")}>
                پایین
              </Button>
            </div>
            <p className="text-xs text-gray-500">دقت بالا: مصرف باتری بیشتر، دقت بهتر • دقت پایین: مصرف باتری کمتر</p>
          </div>

          {/* Background Tracking */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>ردیابی در پس‌زمینه</Label>
              <p className="text-sm text-gray-500">ادامه ردیابی حتی زمانی که برنامه بسته است</p>
            </div>
            <Switch checked={backgroundTracking} onCheckedChange={setBackgroundTracking} disabled={!tracking} />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Location Info */}
      {currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              موقعیت فعلی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">مختصات جغرافیایی</Label>
                <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                  <div>عرض: {currentLocation.latitude.toFixed(6)}</div>
                  <div>طول: {currentLocation.longitude.toFixed(6)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">دقت موقعیت</Label>
                <div className={`font-medium ${getAccuracyColor(currentLocation.accuracy)}`}>
                  ±{currentLocation.accuracy.toFixed(1)} متر ({getAccuracyText(currentLocation.accuracy)})
                </div>
              </div>

              {currentLocation.speed !== undefined && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">سرعت</Label>
                  <div className="font-medium">{formatSpeed(currentLocation.speed)}</div>
                </div>
              )}

              {currentLocation.altitude !== undefined && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">ارتفاع</Label>
                  <div className="font-medium">{currentLocation.altitude.toFixed(1)} متر</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(currentLocation.timestamp).toLocaleString("fa-IR")}
              </div>

              {batteryLevel !== null && (
                <div className="flex items-center gap-1">
                  <Battery className="h-4 w-4" />
                  {batteryLevel}%
                </div>
              )}

              <div className="flex items-center gap-1">
                <Wifi className={`h-4 w-4 ${networkStatus === "online" ? "text-green-500" : "text-red-500"}`} />
                {networkStatus === "online" ? "آنلاین" : "آفلاین"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location History */}
      {locationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              تاریخچه موقعیت ({locationHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {locationHistory
                .slice(-10)
                .reverse()
                .map((location, index) => {
                  const prevLocation = locationHistory[locationHistory.length - index - 2]
                  const distance = prevLocation
                    ? formatDistance(
                        prevLocation.latitude,
                        prevLocation.longitude,
                        location.latitude,
                        location.longitude,
                      )
                    : null

                  return (
                    <div
                      key={location.timestamp}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-mono">
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          ±{location.accuracy.toFixed(0)}m
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        {distance && <span className="text-xs">{distance}</span>}
                        <span className="text-xs">{new Date(location.timestamp).toLocaleTimeString("fa-IR")}</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            وضعیت دستگاه
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Battery
                  className={`h-8 w-8 ${
                    batteryLevel !== null && batteryLevel > 20 ? "text-green-500" : "text-red-500"
                  }`}
                />
              </div>
              <div className="text-sm font-medium">{batteryLevel !== null ? `${batteryLevel}%` : "نامشخص"}</div>
              <div className="text-xs text-gray-500">باتری</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Wifi className={`h-8 w-8 ${networkStatus === "online" ? "text-green-500" : "text-red-500"}`} />
              </div>
              <div className="text-sm font-medium">{networkStatus === "online" ? "متصل" : "قطع"}</div>
              <div className="text-xs text-gray-500">اتصال</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className={`h-8 w-8 ${tracking ? "text-green-500" : "text-gray-400"}`} />
              </div>
              <div className="text-sm font-medium">{tracking ? "فعال" : "غیرفعال"}</div>
              <div className="text-xs text-gray-500">ردیابی</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className={`h-8 w-8 ${accuracy === "high" ? "text-yellow-500" : "text-green-500"}`} />
              </div>
              <div className="text-sm font-medium">
                {accuracy === "high" ? "بالا" : accuracy === "medium" ? "متوسط" : "پایین"}
              </div>
              <div className="text-xs text-gray-500">دقت</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
