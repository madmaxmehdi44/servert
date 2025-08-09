"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Shield, Smartphone, Key, CheckCircle, AlertTriangle } from "lucide-react"

interface GoogleAuthProps {
  onAuthSuccess: (user: any) => void
  onAuthError: (error: string) => void
}

export function GoogleAuth({ onAuthSuccess, onAuthError }: GoogleAuthProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt")

  useEffect(() => {
    // Get device information
    const getDeviceInfo = () => {
      const userAgent = navigator.userAgent
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isIOS = /iPad|iPhone|iPod/.test(userAgent)
      const isAndroid = /Android/.test(userAgent)

      return {
        deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        deviceName: `${isIOS ? "iOS" : isAndroid ? "Android" : "Web"} Device`,
        deviceType: isMobile ? (isIOS && userAgent.includes("iPad") ? "tablet" : "mobile") : "desktop",
        platform: isIOS ? "ios" : isAndroid ? "android" : "web",
        browser: getBrowserName(),
        supportsGPS: "geolocation" in navigator,
        supportsPush: "serviceWorker" in navigator && "PushManager" in window,
        userAgent,
      }
    }

    setDeviceInfo(getDeviceInfo())
    checkLocationPermission()
  }, [])

  const getBrowserName = () => {
    const userAgent = navigator.userAgent
    if (userAgent.includes("Chrome")) return "Chrome"
    if (userAgent.includes("Firefox")) return "Firefox"
    if (userAgent.includes("Safari")) return "Safari"
    if (userAgent.includes("Edge")) return "Edge"
    return "Unknown"
  }

  const checkLocationPermission = async () => {
    if ("permissions" in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: "geolocation" as PermissionName })
        setLocationPermission(permission.state as any)

        permission.addEventListener("change", () => {
          setLocationPermission(permission.state as any)
        })
      } catch (error) {
        console.error("Error checking location permission:", error)
      }
    }
  }

  const requestLocationPermission = async () => {
    if ("geolocation" in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationPermission("granted")
            resolve(position)
          },
          (error) => {
            setLocationPermission("denied")
            resolve(null)
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        )
      })
    }
    return null
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // Simulate Google OAuth flow
      // In a real app, you'd use Google OAuth SDK
      const mockGoogleUser = {
        id: "google_123456789",
        email: "user@gmail.com",
        name: "کاربر گوگل",
        picture: "https://lh3.googleusercontent.com/a/default-user",
        verified_email: true,
      }

      // Request location permission during login
      await requestLocationPermission()

      // Register device
      const deviceRegistration = await registerDevice(mockGoogleUser.id)

      if (deviceRegistration.success) {
        onAuthSuccess({
          ...mockGoogleUser,
          device: deviceInfo,
          locationPermission,
        })
      } else {
        onAuthError("خطا در ثبت دستگاه")
      }
    } catch (error) {
      onAuthError("خطا در ورود با گوگل")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          deviceInfo,
          twoFactorCode: showTwoFactor ? twoFactorCode : undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (result.requiresTwoFactor) {
          setShowTwoFactor(true)
        } else {
          // Request location permission after successful login
          await requestLocationPermission()
          onAuthSuccess(result.user)
        }
      } else {
        onAuthError(result.message || "خطا در ورود")
      }
    } catch (error) {
      onAuthError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  const registerDevice = async (userId: string) => {
    try {
      const response = await fetch("/api/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          deviceInfo: {
            ...deviceInfo,
            locationPermission,
            backgroundLocationEnabled: locationPermission === "granted",
          },
        }),
      })

      return await response.json()
    } catch (error) {
      return { success: false, error: "Device registration failed" }
    }
  }

  const getLocationPermissionBadge = () => {
    switch (locationPermission) {
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
            <AlertTriangle className="w-3 h-3 mr-1" />
            رد شده
          </Badge>
        )
      default:
        return <Badge variant="outline">در انتظار</Badge>
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            ورود امن
          </CardTitle>
          <CardDescription>ورود با گوگل یا ایمیل و رمز عبور</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Device Information */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              <span className="font-medium">اطلاعات دستگاه:</span>
            </div>
            <div className="text-xs space-y-1 text-gray-600">
              <div>
                نوع: {deviceInfo?.deviceType} ({deviceInfo?.platform})
              </div>
              <div>مرورگر: {deviceInfo?.browser}</div>
              <div className="flex items-center gap-2">
                <span>موقعیت مکانی:</span>
                {getLocationPermissionBadge()}
              </div>
              <div className="flex items-center gap-2">
                <span>GPS:</span>
                <Badge variant={deviceInfo?.supportsGPS ? "default" : "secondary"}>
                  {deviceInfo?.supportsGPS ? "پشتیبانی" : "عدم پشتیبانی"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Google Login */}
          <Button onClick={handleGoogleLogin} disabled={loading} className="w-full gap-2 bg-red-600 hover:bg-red-700">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            ورود با گوگل
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">یا</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {!showTwoFactor ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">ایمیل</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور خود را وارد کنید"
                    required
                    disabled={loading}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="twoFactor" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  کد احراز هویت دو مرحله‌ای
                </Label>
                <Input
                  id="twoFactor"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  disabled={loading}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-gray-500 text-center">کد 6 رقمی را از اپلیکیشن احراز هویت خود وارد کنید</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : showTwoFactor ? (
                <Key className="h-4 w-4 mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              {showTwoFactor ? "تأیید کد" : "ورود"}
            </Button>
          </form>

          {/* Location Permission Request */}
          {locationPermission === "prompt" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                برای استفاده بهتر از سیستم، لطفاً مجوز دسترسی به موقعیت مکانی را اعطا کنید.
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full bg-transparent"
                  onClick={requestLocationPermission}
                >
                  اعطای مجوز موقعیت مکانی
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {locationPermission === "denied" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                مجوز موقعیت مکانی رد شده است. برای فعال‌سازی ردیابی موقعیت، لطفاً در تنظیمات مرورگر مجوز را اعطا کنید.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
