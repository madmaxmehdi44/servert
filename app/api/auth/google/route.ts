import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { googleUser, phone, nationalId, deviceInfo, locationPermission, currentLocation } = await request.json()

    if (!googleUser || !googleUser.email) {
      return NextResponse.json({ success: false, message: "اطلاعات گوگل نامعتبر است" }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      // Mock Google auth for demo
      const mockUser = {
        id: Math.floor(Math.random() * 1000) + 1,
        name: googleUser.name,
        email: googleUser.email,
        phone: phone || "09121234567",
        national_id: nationalId || "0123456789",
        avatar_url: googleUser.picture,
        auth_provider: "google",
        google_id: googleUser.id,
        role: "user",
        status: "active",
        two_factor_enabled: false,
      }

      return NextResponse.json({
        success: true,
        user: mockUser,
        token: "mock_google_token_123",
        message: "ورود با گوگل موفقیت‌آمیز بود (حالت نمایشی)",
      })
    }

    const supabase = createClient()

    // Check if user exists with Google ID
    let { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("google_id", googleUser.id)
      .single()

    if (findError && findError.code !== "PGRST116") {
      console.error("Error finding user by Google ID:", findError)
      return NextResponse.json({ success: false, message: "خطا در جستجوی کاربر" }, { status: 500 })
    }

    // If not found by Google ID, check by email
    if (!existingUser) {
      const { data: emailUser, error: emailError } = await supabase
        .from("users")
        .select("*")
        .eq("email", googleUser.email)
        .single()

      if (emailError && emailError.code !== "PGRST116") {
        console.error("Error finding user by email:", emailError)
        return NextResponse.json({ success: false, message: "خطا در جستجوی کاربر" }, { status: 500 })
      }

      if (emailUser) {
        // Link Google account to existing email account
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .update({
            google_id: googleUser.id,
            avatar_url: googleUser.picture,
            auth_provider: "google",
            last_login: new Date().toISOString(),
            login_count: (emailUser.login_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", emailUser.id)
          .select()
          .single()

        if (updateError) {
          console.error("Error linking Google account:", updateError)
          return NextResponse.json({ success: false, message: "خطا در اتصال حساب گوگل" }, { status: 500 })
        }

        existingUser = updatedUser
      }
    }

    let user = existingUser

    // Create new user if doesn't exist
    if (!user) {
      // For new Google users, we need phone and national ID
      if (!phone || !nationalId) {
        return NextResponse.json(
          {
            success: false,
            message: "برای ثبت‌نام با گوگل، شماره تلفن و کد ملی الزامی است",
            requiresAdditionalInfo: true,
          },
          { status: 400 },
        )
      }

      // Validate phone and national ID
      if (!/^09\d{9}$/.test(phone)) {
        return NextResponse.json(
          { success: false, message: "شماره تلفن باید با 09 شروع شده و ۱۱ رقم باشد" },
          { status: 400 },
        )
      }

      // Check if phone or national ID already exists
      const { data: existingPhone } = await supabase.from("users").select("id").eq("phone", phone).single()

      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: "کاربری با این شماره تلفن قبلاً ثبت‌نام کرده است" },
          { status: 409 },
        )
      }

      const { data: existingNationalId } = await supabase
        .from("users")
        .select("id")
        .eq("national_id", nationalId)
        .single()

      if (existingNationalId) {
        return NextResponse.json(
          { success: false, message: "کاربری با این کد ملی قبلاً ثبت‌نام کرده است" },
          { status: 409 },
        )
      }

      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          name: googleUser.name,
          email: googleUser.email,
          phone,
          national_id: nationalId,
          avatar_url: googleUser.picture,
          auth_provider: "google",
          google_id: googleUser.id,
          status: "active",
          role: "user",
          email_verified: googleUser.verified_email,
          is_location_enabled: locationPermission === "granted",
          current_latitude: currentLocation?.lat,
          current_longitude: currentLocation?.lng,
          last_location_update: currentLocation ? new Date().toISOString() : null,
          last_login: new Date().toISOString(),
          login_count: 1,
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating Google user:", createError)
        return NextResponse.json({ success: false, message: "خطا در ایجاد حساب کاربری" }, { status: 500 })
      }

      user = newUser

      // Log new user creation
      await supabase.from("server_logs").insert({
        action: "GOOGLE_SIGNUP",
        details: `New user ${user.name} signed up with Google`,
        user_id: user.id,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      })
    } else {
      // Update existing user login info
      await supabase
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          login_count: (user.login_count || 0) + 1,
          is_location_enabled: locationPermission === "granted",
          current_latitude: currentLocation?.lat,
          current_longitude: currentLocation?.lng,
          last_location_update: currentLocation ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        message: "کد احراز هویت دو مرحله‌ای مورد نیاز است",
      })
    }

    // Create session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        authProvider: "google",
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

    // Register device if provided
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
        location_permission: locationPermission || "prompt",
        background_location_enabled: locationPermission === "granted",
        is_active: true,
        last_seen: new Date().toISOString(),
      })
    }

    // Log successful login
    await supabase.from("server_logs").insert({
      action: "GOOGLE_LOGIN",
      details: `User ${user.name} logged in with Google`,
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
        google_id: user.google_id,
        role: user.role,
        status: user.status,
        two_factor_enabled: user.two_factor_enabled,
      },
      token: sessionToken,
      message: "ورود با گوگل موفقیت‌آمیز بود",
    })
  } catch (error) {
    console.error("Google auth error:", error)
    return NextResponse.json({ success: false, message: "خطا در ورود با گوگل" }, { status: 500 })
  }
}
