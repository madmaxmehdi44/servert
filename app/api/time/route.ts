import { NextResponse } from "next/server"

export async function GET() {
  try {
    const now = new Date()

    return NextResponse.json({
      timestamp: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      persian_date: now.toLocaleDateString("fa-IR"),
      persian_time: now.toLocaleTimeString("fa-IR"),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      server_time: now.toLocaleString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطا در دریافت زمان سرور",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
