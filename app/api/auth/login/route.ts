import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { email, password, deviceInfo, locationPermission, currentLocation } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "ایمیل و رمز عبور الزامی است" }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      // Mock login for demo
      const mockUser = {
        id: 1,
        name: "کاربر نمونه",
        email,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent("کاربر نمونه")}&background=random&size=200`,
        auth_provider: "email",
        role: "user",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        user: mockUser,
        token: "mock_login_token_123",
        message: "ورود موفقیت‌آمیز بود (حالت نمایشی)",
      })
    }

    const supabase = createClient()

    // Find user by email
    const { data: user, error: findError } = await supabase.from("users").select("*").eq("email", email).single()

    if (findError || !user) {
      return NextResponse.json({ success: false, message: "ایمیل یا رمز عبور اشتباه است" }, { status: 401 })
    }

    // Check if account is locked
    if (user.status === "locked") {
      return NextResponse.json(
        {
          success: false,
          message: "حساب کاربری شما قفل شده است. لطفاً با پشتیبانی تماس بگیرید",
        },
        { status: 423 },
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1
      const updateData: any = {
        failed_login_attempts: failedAttempts,
        last_failed_login: new Date().toISOString(),
      }

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updateData.status = "locked"
        updateData.locked_at = new Date().toISOString()
      }

      await supabase.from("users").update(updateData).eq("id", user.id)

      // Log failed login attempt
      await supabase.from("server_logs").insert({
        action: "FAILED_LOGIN",
        details: `Failed login attempt for ${email}`,
        user_id: user.id,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      })

      if (failedAttempts >= 5) {
        return NextResponse.json(
          {
            success: false,
            message: "حساب کاربری شما به دلیل تلاش‌های ناموفق متعدد قفل شد",
          },
          { status: 423 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          message: `ایمیل یا رمز عبور اشتباه است. ${5 - failedAttempts} تلاش باقی مانده`,
        },
        { status: 401 },
      )
    }

    // Reset failed login attempts on successful login
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        failed_login_attempts: 0,
        last_login: new Date().toISOString(),
        last_failed_login: null,
        is_location_enabled: locationPermission === "granted",
        current_latitude: currentLocation?.lat,
        current_longitude: currentLocation?.lng,
        last_location_update: currentLocation ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json({ success: false, message: "خطا در به‌روزرسانی اطلاعات کاربر" }, { status: 500 })
    }

    // Create session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        authProvider: "email",
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    )

    // Store session in database
    await supabase.from("user_sessions").insert({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })

    // Log successful login
    await supabase.from("server_logs").insert({
      action: "USER_LOGIN",
      details: `User ${user.name} logged in successfully`,
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
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar_url: updatedUser.avatar_url,
        auth_provider: updatedUser.auth_provider,
        role: updatedUser.role,
        status: updatedUser.status,
      },
      token: sessionToken,
      message: "ورود موفقیت‌آمیز بود",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ success: false, message: "خطا در ورود" }, { status: 500 })
  }
}
