import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// National ID validation function
function validateNationalId(nationalId: string): boolean {
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

// Phone validation function
function validatePhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone)
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, nationalId, deviceInfo, locationPermission, currentLocation } =
      await request.json()

    // Validation
    if (!name || !email || !password || !phone || !nationalId) {
      return NextResponse.json({ success: false, message: "تمام فیلدها الزامی است" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: "فرمت ایمیل نامعتبر است" }, { status: 400 })
    }

    // Validate phone number
    if (!validatePhone(phone)) {
      return NextResponse.json(
        { success: false, message: "شماره تلفن باید با 09 شروع شده و ۱۱ رقم باشد" },
        { status: 400 },
      )
    }

    // Validate national ID
    if (!validateNationalId(nationalId)) {
      return NextResponse.json({ success: false, message: "کد ملی وارد شده معتبر نیست" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ success: false, message: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      // Mock signup for demo
      const mockUser = {
        id: Math.floor(Math.random() * 1000) + 1,
        name,
        email,
        phone,
        national_id: nationalId,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`,
        auth_provider: "email",
        role: "user",
        status: "active",
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        user: mockUser,
        token: "mock_signup_token_123",
        message: "ثبت‌نام موفقیت‌آمیز بود (حالت نمایشی)",
      })
    }

    const supabase = createClient()

    // Check if user already exists with email
    const { data: existingEmailUser } = await supabase.from("users").select("id, email").eq("email", email).single()

    if (existingEmailUser) {
      return NextResponse.json({ success: false, message: "کاربری با این ایمیل قبلاً ثبت‌نام کرده است" }, { status: 409 })
    }

    // Check if user already exists with phone
    const { data: existingPhoneUser } = await supabase.from("users").select("id, phone").eq("phone", phone).single()

    if (existingPhoneUser) {
      return NextResponse.json(
        { success: false, message: "کاربری با این شماره تلفن قبلاً ثبت‌نام کرده است" },
        { status: 409 },
      )
    }

    // Check if user already exists with national ID
    const { data: existingNationalIdUser } = await supabase
      .from("users")
      .select("id, national_id")
      .eq("national_id", nationalId)
      .single()

    if (existingNationalIdUser) {
      return NextResponse.json(
        { success: false, message: "کاربری با این کد ملی قبلاً ثبت‌نام کرده است" },
        { status: 409 },
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Generate avatar URL
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        name,
        email,
        phone,
        national_id: nationalId,
        password_hash: hashedPassword,
        avatar_url: avatarUrl,
        auth_provider: "email",
        status: "active",
        role: "user",
        is_location_enabled: locationPermission === "granted",
        current_latitude: currentLocation?.lat,
        current_longitude: currentLocation?.lng,
        last_location_update: currentLocation ? new Date().toISOString() : null,
        last_login: new Date().toISOString(),
        email_verified: true, // Auto-verify for demo
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating user:", createError)
      return NextResponse.json({ success: false, message: "خطا در ایجاد حساب کاربری" }, { status: 500 })
    }

    // Create session token
    const sessionToken = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        authProvider: "email",
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    )

    // Store session in database
    await supabase.from("user_sessions").insert({
      user_id: newUser.id,
      session_token: sessionToken,
      device_info: deviceInfo,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })

    // Register device if provided
    if (deviceInfo) {
      await supabase.from("user_devices").insert({
        user_id: newUser.id,
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

    // Log the signup
    await supabase.from("server_logs").insert({
      action: "USER_SIGNUP",
      details: `New user ${newUser.name} signed up with email`,
      user_id: newUser.id,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    // Add initial location if provided
    if (currentLocation) {
      await supabase.from("user_location_history").insert({
        user_id: newUser.id,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        accuracy: 10.0,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        national_id: newUser.national_id,
        avatar_url: newUser.avatar_url,
        auth_provider: newUser.auth_provider,
        role: newUser.role,
        status: newUser.status,
        two_factor_enabled: newUser.two_factor_enabled,
      },
      token: sessionToken,
      message: "ثبت‌نام موفقیت‌آمیز بود",
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ success: false, message: "خطا در ثبت‌نام" }, { status: 500 })
  }
}
