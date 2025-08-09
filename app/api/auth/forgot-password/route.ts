import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"

// Generate 6-digit random code
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Mock email sending function
async function sendResetEmail(email: string, code: string, name: string): Promise<boolean> {
  // In a real application, you would integrate with an email service like:
  // - SendGrid
  // - AWS SES
  // - Nodemailer with SMTP
  // - Resend

  console.log(`Sending reset code ${code} to ${email} for user ${name}`)

  // For demo purposes, we'll just log the code
  // In production, you would send an actual email
  return true
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, message: "ایمیل الزامی است" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: "فرمت ایمیل نامعتبر است" }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      // Mock forgot password for demo
      const resetCode = generateResetCode()
      console.log(`Demo reset code for ${email}: ${resetCode}`)

      return NextResponse.json({
        success: true,
        message: `کد بازیابی به ایمیل شما ارسال شد (نمایشی): ${resetCode}`,
        resetCode, // Only for demo - remove in production
      })
    }

    const supabase = createClient()

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from("users")
      .select("id, name, email, auth_provider")
      .eq("email", email)
      .single()

    if (findError || !user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: "اگر ایمیل شما در سیستم موجود باشد، کد بازیابی ارسال خواهد شد",
      })
    }

    // Check if user signed up with Google
    if (user.auth_provider === "google") {
      return NextResponse.json(
        {
          success: false,
          message: "این حساب با گوگل ثبت‌نام شده است. لطفاً از گوگل وارد شوید",
        },
        { status: 400 },
      )
    }

    // Generate reset code
    const resetCode = generateResetCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store reset token in database
    const { error: tokenError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token: resetCode,
      expires_at: expiresAt.toISOString(),
    })

    if (tokenError) {
      console.error("Error storing reset token:", tokenError)
      return NextResponse.json({ success: false, message: "خطا در ایجاد کد بازیابی" }, { status: 500 })
    }

    // Send reset email
    const emailSent = await sendResetEmail(user.email, resetCode, user.name)

    if (!emailSent) {
      return NextResponse.json({ success: false, message: "خطا در ارسال ایمیل" }, { status: 500 })
    }

    // Log the password reset request
    await supabase.from("server_logs").insert({
      action: "PASSWORD_RESET_REQUEST",
      details: `Password reset requested for ${user.email}`,
      user_id: user.id,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      message: "کد بازیابی به ایمیل شما ارسال شد",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ success: false, message: "خطا در درخواست بازیابی رمز عبور" }, { status: 500 })
  }
}
