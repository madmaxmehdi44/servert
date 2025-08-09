import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { authenticator } from "otplib"

export async function POST(request: NextRequest) {
  try {
    const { email, password, deviceInfo, twoFactorCode } = await request.json()

    if (!isSupabaseConfigured()) {
      // Mock authentication for demo
      const mockUser = {
        id: 1,
        name: "کاربر نمونه",
        email: email,
        two_factor_enabled: false,
        google_id: null,
      }

      return NextResponse.json({
        success: true,
        user: mockUser,
        token: "mock_token_123",
        requiresTwoFactor: false,
      })
    }

    const supabase = createClient()

    // Find user by email
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("email", email).single()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "ایمیل یا رمز عبور اشتباه است",
        },
        { status: 401 },
      )
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "حساب شما موقتاً قفل شده است",
        },
        { status: 423 },
      )
    }

    // Verify password
    if (!user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      // Increment failed login attempts
      await supabase
        .from("users")
        .update({
          failed_login_attempts: (user.failed_login_attempts || 0) + 1,
          locked_until:
            (user.failed_login_attempts || 0) >= 4 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null, // Lock for 30 minutes after 5 failed attempts
        })
        .eq("id", user.id)

      return NextResponse.json(
        {
          success: false,
          message: "ایمیل یا رمز عبور اشتباه است",
        },
        { status: 401 },
      )
    }

    // Check 2FA if enabled
    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return NextResponse.json({
          success: true,
          requiresTwoFactor: true,
          message: "کد احراز هویت دو مرحله‌ای مورد نیاز است",
        })
      }

      // Verify 2FA code
      const isValidToken = authenticator.verify({
        token: twoFactorCode,
        secret: user.two_factor_secret,
      })

      if (!isValidToken) {
        // Check backup codes
        const backupCodes = user.backup_codes || []
        const hashedCode = bcrypt.hashSync(twoFactorCode, 10)
        const isValidBackupCode = backupCodes.some((code) => bcrypt.compareSync(twoFactorCode, code))

        if (!isValidBackupCode) {
          return NextResponse.json(
            {
              success: false,
              message: "کد احراز هویت نامعتبر است",
            },
            { status: 401 },
          )
        }

        // Remove used backup code
        const updatedBackupCodes = backupCodes.filter((code) => !bcrypt.compareSync(twoFactorCode, code))
        await supabase.from("users").update({ backup_codes: updatedBackupCodes }).eq("id", user.id)
      }
    }

    // Register/update device
    if (deviceInfo) {
      await supabase.from("user_devices").upsert({
        user_id: user.id,
        device_id: deviceInfo.deviceId,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        platform: deviceInfo.platform,
        browser: deviceInfo.browser,
        supports_gps: deviceInfo.supportsGPS,
        supports_push: deviceInfo.supportsPush,
        location_permission: deviceInfo.locationPermission || "prompt",
        background_location_enabled: deviceInfo.backgroundLocationEnabled || false,
        is_active: true,
        last_seen: new Date().toISOString(),
      })
    }

    // Create session
    const sessionToken = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "7d",
    })

    // Update user login info
    await supabase
      .from("users")
      .update({
        last_login: new Date().toISOString(),
        login_count: (user.login_count || 0) + 1,
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", user.id)

    // Log activity
    await supabase.from("server_logs").insert({
      action: "USER_LOGIN",
      details: `User ${user.name} logged in from ${deviceInfo?.platform || "unknown"} device`,
      user_id: user.id,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        two_factor_enabled: user.two_factor_enabled,
      },
      token: sessionToken,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "خطا در ورود به سیستم",
      },
      { status: 500 },
    )
  }
}
