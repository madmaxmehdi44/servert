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
import {
  Loader2,
  Shield,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  MapPin,
  User,
  Mail,
  Phone,
  CreditCard,
  Key,
  ArrowLeft,
} from "lucide-react"

interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  verified_email: boolean
}

interface AuthUser {
  id: number
  name: string
  email: string
  phone: string
  national_id: string
  avatar_url?: string
  google_id?: string
  auth_provider: string
  role: string
  status: string
  two_factor_enabled: boolean
}

interface GoogleAuthProps {
  onAuthSuccess: (user: AuthUser) => void
  onAuthError: (error: string) => void
}

export function GoogleAuth({ onAuthSuccess, onAuthError }: GoogleAuthProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetStep, setResetStep] = useState<"email" | "code" | "password">("email")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt")
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(true)

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

    // Check if we're in a production environment with proper Google OAuth setup
    const hasGoogleClientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== "demo-client-id"

    if (hasGoogleClientId && typeof window !== "undefined" && window.location.hostname !== "localhost") {
      setIsDemoMode(false)
      initializeGoogleSignIn()
    }
  }, [])

  const initializeGoogleSignIn = () => {
    // Only load Google Sign-In script in production with valid client ID
    if (!isDemoMode && !document.getElementById("google-signin-script")) {
      const script = document.createElement("script")
      script.id = "google-signin-script"
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          })
        }
      }
      script.onerror = () => {
        console.warn("Failed to load Google Sign-In script, falling back to demo mode")
        setIsDemoMode(true)
      }
      document.head.appendChild(script)
    }
  }

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
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
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

  const validateNationalId = (nationalId: string): boolean => {
    if (!/^\d{10}$/.test(nationalId)) return false

    const digits = nationalId.split("").map(Number)
    const checkDigit = digits[9]

    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i)
    }

    const remainder = sum % 11
    return (remainder < 2 && checkDigit === remainder) || (remainder >= 2 && checkDigit === 11 - remainder)
  }

  const validatePhone = (phone: string): boolean => {
    return /^09\d{9}$/.test(phone)
  }

  const handleGoogleResponse = async (response: any) => {
    setLoading(true)
    try {
      // Decode JWT token to get user info
      const userInfo = JSON.parse(atob(response.credential.split(".")[1]))

      const googleUser: GoogleUser = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified_email: userInfo.email_verified,
      }

      await requestLocationPermission()

      // Send to backend for authentication
      const authResponse = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleUser,
          deviceInfo,
          locationPermission,
          currentLocation,
        }),
      })

      const result = await authResponse.json()

      if (result.success) {
        if (result.requiresTwoFactor) {
          setShowTwoFactor(true)
        } else {
          onAuthSuccess(result.user)
        }
      } else {
        onAuthError(result.message || "خطا در ورود با گوگل")
      }
    } catch (error) {
      console.error("Google auth error:", error)
      onAuthError("خطا در پردازش اطلاعات گوگل")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!isDemoMode && window.google) {
      // Use real Google Sign-In
      window.google.accounts.id.prompt()
    } else {
      // Use demo mode
      setLoading(true)
      try {
        // Generate random demo user data
        const demoUsers = [
          { name: "علی احمدی", email: "ali@gmail.com", phone: "09121234567", national_id: "0123456789" },
          { name: "فاطمه محمدی", email: "fateme@gmail.com", phone: "09129876543", national_id: "1234567890" },
          { name: "محمد رضایی", email: "mohammad@gmail.com", phone: "09123456789", national_id: "2345678901" },
          { name: "زهرا کریمی", email: "zahra@gmail.com", phone: "09127654321", national_id: "3456789012" },
          { name: "مریم حسینی", email: "maryam@gmail.com", phone: "09125555555", national_id: "4567890123" },
        ]

        const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)]

        const mockGoogleUser: GoogleUser = {
          id: `google_${Date.now()}`,
          email: randomUser.email,
          name: randomUser.name,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(randomUser.name)}&background=4285f4&color=fff&size=200`,
          verified_email: true,
        }

        await requestLocationPermission()

        const authResponse = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleUser: mockGoogleUser,
            phone: randomUser.phone,
            nationalId: randomUser.national_id,
            deviceInfo,
            locationPermission,
            currentLocation,
          }),
        })

        const result = await authResponse.json()

        if (result.success) {
          if (result.requiresTwoFactor) {
            setShowTwoFactor(true)
          } else {
            onAuthSuccess(result.user)
          }
        } else {
          onAuthError(result.message || "خطا در ورود با گوگل")
        }
      } catch (error) {
        onAuthError("خطا در ورود با گوگل")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (showTwoFactor) {
      // Handle 2FA verification
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        onAuthError("کد احراز هویت ۶ رقمی وارد کنید")
        return
      }

      setLoading(true)
      try {
        const response = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            twoFactorCode,
            deviceInfo,
            locationPermission,
            currentLocation,
          }),
        })

        const result = await response.json()

        if (result.success) {
          onAuthSuccess(result.user)
        } else {
          onAuthError(result.message || "کد احراز هویت نامعتبر است")
        }
      } catch (error) {
        onAuthError("خطا در تأیید کد احراز هویت")
      } finally {
        setLoading(false)
      }
      return
    }

    // Validation
    if (isSignUp) {
      if (!name || !email || !password || !phone || !nationalId) {
        onAuthError("تمام فیلدها الزامی است")
        return
      }

      if (!validatePhone(phone)) {
        onAuthError("شماره تلفن باید با 09 شروع شده و ۱۱ رقم باشد")
        return
      }

      if (!validateNationalId(nationalId)) {
        onAuthError("کد ملی وارد شده معتبر نیست")
        return
      }

      if (password.length < 8) {
        onAuthError("رمز عبور باید حداقل ۸ کاراکتر باشد")
        return
      }
    }

    setLoading(true)

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login"
      const payload = isSignUp
        ? { name, email, password, phone, nationalId, deviceInfo, locationPermission, currentLocation }
        : { email, password, deviceInfo, locationPermission, currentLocation }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        if (result.requiresTwoFactor) {
          setShowTwoFactor(true)
        } else {
          await requestLocationPermission()
          onAuthSuccess(result.user)
        }
      } else {
        onAuthError(result.message || "خطا در احراز هویت")
      }
    } catch (error) {
      onAuthError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (resetStep === "email") {
        if (!email) {
          onAuthError("ایمیل را وارد کنید")
          return
        }

        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })

        const result = await response.json()

        if (result.success) {
          setResetStep("code")
          onAuthError("کد بازیابی به ایمیل شما ارسال شد")
        } else {
          onAuthError(result.message || "خطا در ارسال کد بازیابی")
        }
      } else if (resetStep === "code") {
        if (!resetCode || resetCode.length !== 6) {
          onAuthError("کد بازیابی ۶ رقمی وارد کنید")
          return
        }

        const response = await fetch("/api/auth/verify-reset-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, resetCode }),
        })

        const result = await response.json()

        if (result.success) {
          setResetStep("password")
        } else {
          onAuthError(result.message || "کد بازیابی نامعتبر است")
        }
      } else if (resetStep === "password") {
        if (!newPassword || !confirmPassword) {
          onAuthError("رمز عبور جدید و تأیید آن را وارد کنید")
          return
        }

        if (newPassword !== confirmPassword) {
          onAuthError("رمز عبور و تأیید آن یکسان نیست")
          return
        }

        if (newPassword.length < 8) {
          onAuthError("رمز عبور باید حداقل ۸ کاراکتر باشد")
          return
        }

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, resetCode, newPassword }),
        })

        const result = await response.json()

        if (result.success) {
          setIsForgotPassword(false)
          setResetStep("email")
          setResetCode("")
          setNewPassword("")
          setConfirmPassword("")
          onAuthError("رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید")
        } else {
          onAuthError(result.message || "خطا در تغییر رمز عبور")
        }
      }
    } catch (error) {
      onAuthError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
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

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setName("")
    setPhone("")
    setNationalId("")
    setTwoFactorCode("")
    setResetCode("")
    setNewPassword("")
    setConfirmPassword("")
    setShowTwoFactor(false)
    setIsForgotPassword(false)
    setResetStep("email")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            {isForgotPassword
              ? "بازیابی رمز عبور"
              : showTwoFactor
                ? "احراز هویت دو مرحله‌ای"
                : isSignUp
                  ? "ثبت‌نام"
                  : "ورود امن"}
          </CardTitle>
          <CardDescription>
            {isForgotPassword
              ? "بازیابی رمز عبور از طریق ایمیل"
              : showTwoFactor
                ? "کد احراز هویت را وارد کنید"
                : isSignUp
                  ? "ایجاد حساب کاربری جدید"
                  : "ورود با گوگل یا ایمیل و رمز عبور"}
            {isDemoMode && !isForgotPassword && !showTwoFactor && (
              <span className="block mt-2 text-xs text-orange-600">حالت نمایشی - Google OAuth واقعی غیرفعال است</span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Device Information */}
          {!isForgotPassword && !showTwoFactor && (
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
                {currentLocation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>
                      موقعیت فعلی: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Two-Factor Authentication Form */}
          {showTwoFactor && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="text-center space-y-4">
                <Key className="h-12 w-12 text-blue-600 mx-auto" />
                <div>
                  <h3 className="font-semibold mb-2">کد احراز هویت دو مرحله‌ای</h3>
                  <p className="text-sm text-gray-600">کد ۶ رقمی ارسال شده به تلفن همراه یا ایمیل خود را وارد کنید</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">کد احراز هویت</Label>
                <Input
                  id="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || twoFactorCode.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                تأیید کد
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTwoFactor(false)
                  setTwoFactorCode("")
                }}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                بازگشت
              </Button>
            </form>
          )}

          {/* Forgot Password Form */}
          {isForgotPassword && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {resetStep === "email" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      ایمیل
                    </Label>
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    ارسال کد بازیابی
                  </Button>
                </>
              )}

              {resetStep === "code" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="resetCode">کد بازیابی</Label>
                    <Input
                      id="resetCode"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="text-center text-lg tracking-widest"
                      maxLength={6}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || resetCode.length !== 6}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                    تأیید کد
                  </Button>
                </>
              )}

              {resetStep === "password" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">رمز عبور جدید</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="رمز عبور جدید (حداقل ۸ کاراکتر)"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأیید رمز عبور</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="تأیید رمز عبور جدید"
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                    تغییر رمز عبور
                  </Button>
                </>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsForgotPassword(false)
                  setResetStep("email")
                  resetForm()
                }}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                بازگشت به ورود
              </Button>
            </form>
          )}

          {/* Main Auth Forms */}
          {!showTwoFactor && !isForgotPassword && (
            <>
              {/* Google Login */}
              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full gap-2 bg-red-600 hover:bg-red-700 border-dotted border-gray-900 border-0 shadow-md"
              >
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
                {isDemoMode ? "ورود با گوگل (نمایشی)" : "ورود با گوگل"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">یا</span>
                </div>
              </div>

              {/* Email Auth Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      نام کامل
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="نام و نام خانوادگی"
                      required
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    ایمیل
                  </Label>
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

                {isSignUp && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        شماره تلفن همراه
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09123456789"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationalId" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        کد ملی
                      </Label>
                      <Input
                        id="nationalId"
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="1234567890"
                        maxLength={10}
                        required
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUp ? "رمز عبور (حداقل ۸ کاراکتر)" : "رمز عبور خود را وارد کنید"}
                    required
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  {isSignUp ? "ثبت‌نام" : "ورود"}
                </Button>
              </form>

              {/* Toggle Sign Up / Sign In */}
              <div className="text-center space-y-2">
                <Button
                  variant="link"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    resetForm()
                  }}
                  disabled={loading}
                  className="text-sm"
                >
                  {isSignUp ? "قبلاً حساب دارید؟ ورود" : "حساب ندارید؟ ثبت‌نام"}
                </Button>

                {!isSignUp && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsForgotPassword(true)
                      resetForm()
                    }}
                    disabled={loading}
                    className="text-sm text-blue-600"
                  >
                    فراموشی رمز عبور؟
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Location Permission Request */}
          {!isForgotPassword && !showTwoFactor && locationPermission === "prompt" && (
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

          {!isForgotPassword && !showTwoFactor && locationPermission === "denied" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                مجوز موقعیت مکانی رد شده است. برای فعال‌سازی ردیابی موقعیت، لطفاً در تنظیمات مرورگر مجوز را اعطا کنید.
              </AlertDescription>
            </Alert>
          )}

          {/* Demo Mode Notice */}
          {!isForgotPassword && !showTwoFactor && isDemoMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>حالت نمایشی:</strong> Google OAuth واقعی غیرفعال است. برای فعال‌سازی در محیط تولید، Google Client
                ID را در متغیرهای محیطی تنظیم کنید.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Extend window object for Google Sign-In
declare global {
  interface Window {
    google: any
  }
}
