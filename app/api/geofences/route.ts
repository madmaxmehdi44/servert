import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, checkTablesExist } from "@/lib/database"

const mockGeofences = [
  {
    id: 1,
    name: "محدوده دفتر مرکزی",
    latitude: 35.6892,
    longitude: 51.389,
    radius: 100,
    is_active: true,
    entry_alert: true,
    exit_alert: true,
    location_id: 1,
    created_at: "2024-01-20T10:00:00Z",
  },
  {
    id: 2,
    name: "محدوده شعبه اصفهان",
    latitude: 32.6546,
    longitude: 51.668,
    radius: 150,
    is_active: true,
    entry_alert: true,
    exit_alert: false,
    location_id: 2,
    created_at: "2024-01-20T11:00:00Z",
  },
]

export async function GET() {
  try {
    if (!isSupabaseConfigured() || !(await checkTablesExist())) {
      return NextResponse.json({
        success: true,
        data: mockGeofences,
        total: mockGeofences.length,
        mock: true,
      })
    }

    const supabase = createClient()

    const { data: geofences, error } = await supabase
      .from("geofences")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({
        success: true,
        data: mockGeofences,
        total: mockGeofences.length,
        mock: true,
        reason: "Database error",
      })
    }

    return NextResponse.json({
      success: true,
      data: geofences || [],
      total: geofences?.length || 0,
    })
  } catch (error) {
    console.error("Error fetching geofences:", error)
    return NextResponse.json({
      success: true,
      data: mockGeofences,
      total: mockGeofences.length,
      mock: true,
      reason: "Unexpected error",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const geofenceData = await request.json()

    if (!isSupabaseConfigured() || !(await checkTablesExist())) {
      const newGeofence = {
        id: Date.now(),
        ...geofenceData,
        created_at: new Date().toISOString(),
      }

      return NextResponse.json(
        {
          success: true,
          message: "محدوده امنیتی ایجاد شد (حالت نمایشی)",
          data: newGeofence,
          mock: true,
        },
        { status: 201 },
      )
    }

    const supabase = createClient()

    const { data: newGeofence, error } = await supabase.from("geofences").insert([geofenceData]).select().single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          success: false,
          message: "خطا در ایجاد محدوده امنیتی",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "محدوده امنیتی با موفقیت ایجاد شد",
        data: newGeofence,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating geofence:", error)
    return NextResponse.json(
      {
        success: false,
        message: "خطا در ایجاد محدوده امنیتی",
      },
      { status: 500 },
    )
  }
}
