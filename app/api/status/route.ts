import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({
      status: "active",
      message: "سرور فعال است",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: "connected", // Mock status
      services: {
        authentication: "active",
        location_tracking: "active",
        google_oauth: "configured",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "خطا در دریافت وضعیت سرور",
      },
      { status: 500 },
    )
  }
}
