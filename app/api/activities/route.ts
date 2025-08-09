import { NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, mockActivities } from "@/lib/database"

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log("Using mock data - Supabase not configured")
      return NextResponse.json({
        success: true,
        data: mockActivities,
        total: mockActivities.length,
        timestamp: new Date().toISOString(),
        mock: true,
      })
    }

    const supabase = createClient()

    const { data: activities, error } = await supabase
      .from("server_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: activities || [],
      total: activities?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching activities:", error)

    // Fallback to mock data on error
    return NextResponse.json({
      success: true,
      data: mockActivities,
      total: mockActivities.length,
      timestamp: new Date().toISOString(),
      mock: true,
      error: "Using fallback data",
    })
  }
}
