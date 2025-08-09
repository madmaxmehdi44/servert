import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, resetCode, newPassword } = await request.json()

    if (!email || !resetCode || !newPassword) {
      return NextResponse.json({ success: false, message: "تمام فیلدها الزامی است" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, message: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      // Mock reset for demo
      return NextResponse.json({
        success: true,
        message: "رمز عبور با موفقیت تغییر کرد (حالت نمایشی)",
      })
    }

    const supabase = createClient()

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single()

    if (findError || !user) {
      return NextResponse.json({ success: false, message: "کاربر یافت نشد" }, { status: 404 })
    }

    // Find and validate reset token
    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("token", resetCode)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !resetToken) {
      return NextResponse.json({ success: false, message: "کد بازیابی نامعتبر یا منقضی شده است" }, { status: 400 })
    }

    // Hash new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update user password
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: hashedPassword,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json({ success: false, message: "خطا در تغییر رمز عبور" }, { status: 500 })
    }

    // Mark reset token as used
    await supabase.from("password_reset_tokens").update({ used: true }).eq("id", resetToken.id)

    // Invalidate all existing sessions for security
    await supabase.from("user_sessions").update({ is_active: false }).eq("user_id", user.id)

    // Log the password reset
    await supabase.from("server_logs").insert({
      action: "PASSWORD_RESET_SUCCESS",
      details: `Password successfully reset for ${user.email}`,
      user_id: user.id,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      message: "رمز عبور با موفقیت تغییر کرد",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ success: false, message: "خطا در تغییر رمز عبور" }, { status: 500 })
  }
}
