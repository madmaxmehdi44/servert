import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { email, resetCode } = await request.json()

    if (!email || !resetCode) {
      return NextResponse.json({ success: false, message: "ایمیل و کد بازیابی الزامی است" }, { status: 400 })
    }

    if (resetCode.length !== 6) {
      return NextResponse.json({ success: false, message: "کد بازیابی باید ۶ رقم باشد" }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      // Mock verification for demo
      return NextResponse.json({
        success: true,
        message: "کد بازیابی تأیید شد",
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

    // Find valid reset token
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

    // Log the verification
    await supabase.from("server_logs").insert({
      action: "RESET_CODE_VERIFIED",
      details: `Reset code verified for ${user.email}`,
      user_id: user.id,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      message: "کد بازیابی تأیید شد",
    })
  } catch (error) {
    console.error("Verify reset code error:", error)
    return NextResponse.json({ success: false, message: "خطا در تأیید کد بازیابی" }, { status: 500 })
  }
}
