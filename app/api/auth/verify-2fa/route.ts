import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { email, twoFactorCode, deviceInfo, locationPermission, currentLocation } = await request.json()

    if (!email || !twoFactorCode) {
      return NextResponse.json({ success: false, message: "ایمیل و کد احراز هویت الزامی است" }, { status: 400 })
    }

    if (twoFactorCode.length !== 6) {
      return NextResponse.json({ success: false, message: "کد احراز هویت باید ۶ رقم باشد" }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      // Mock 2FA verification for demo
      const mockUser = {
        id: 1,
        name: "کاربر نمونه",
        email,
        phone: "09121234567",
        national_id: "0123456789",
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent("کاربر نمونه")}&background=random&size=200`,
        auth_provider: "email",
        role: "user",
        status: "active",
        two_factor_enabled: true,
      }

      return NextResponse.json({
        success: true,
        user: mockUser,
        token: "mock_2fa_token_123",
        message: "احراز هویت دو مرحله‌ای موفقیت‌آمیز بود (حالت نمایشی)",
      })
    }

    const supabase = createClient()

    // Find user by email
    const { data: user, error: findError } = await supabase.from("users").select("*").eq("email", email).single()

    if (findError || !user) {
      return NextResponse.json({ success: false, message: "کاربر یافت نشد" }, { status: 404 })
    }

    if (!user.two_factor_enabled) {
      return NextResponse.json({ success: false, message: "احراز هویت دو مرحله‌ای فعال نیست" }, { status: 400 })
    }

    // In a real implementation, you would verify the 2FA code using:
    // - TOTP (Time-based One-Time Password) with libraries like 'otplib'
    // - SMS verification
    // - Email verification
    // For demo purposes, we'll accept any 6-digit code

    const isValidCode = twoFactorCode === "123456" || twoFactorCode.length === 6

    if (!isValidCode) {
      // Log failed 2FA attempt
      await supabase.from("server_logs").insert({
        action: "TWO_FACTOR_FAILED",
        details: `Failed 2FA attempt for ${user.email}`,
        user_id: user.id,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      })

      return NextResponse.json({ success: false, message: "کد احراز هویت نامعتبر است" }, { status: 401 })
    }

    // Create session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        authProvider: user.auth_provider,
        twoFactorVerified: true,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    )

    // Store session in database
    await supabase.from("user_sessions").insert({
      user_id: user.id,
      session_token: sessionToken,
      device_info: deviceInfo,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })

    // Update user login info
    await supabase
      .from("users")
      .update({
        last_login: new Date().toISOString(),
        login_count: (user.login_count || 0) + 1,
        failed_login_attempts: 0,
        is_location_enabled: locationPermission === "granted",
        current_latitude: currentLocation?.lat,
        current_longitude: currentLocation?.lng,
        last_location_update: currentLocation ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    // Log successful 2FA
    await supabase.from("server_logs").insert({
      action: "TWO_FACTOR_SUCCESS",
      details: `Successful 2FA login for ${user.email}`,
      user_id: user.id,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    // Add location history if provided
    if (currentLocation) {
      await supabase.from("user_location_history").insert({
        user_id: user.id,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        accuracy: 10.0,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        national_id: user.national_id,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider,
        role: user.role,
        status: user.status,
        two_factor_enabled: user.two_factor_enabled,
      },
      token: sessionToken,
      message: "احراز هویت دو مرحله‌ای موفقیت‌آمیز بود",
    })
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json({ success: false, message: "خطا در احراز هویت دو مرحله‌ای" }, { status: 500 })
  }
}
