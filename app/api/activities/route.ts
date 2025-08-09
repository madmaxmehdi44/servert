import { NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, checkTablesExist, mockActivities } from "@/lib/database"

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
        reason: "Supabase not configured",
      })
    }

    // Check if tables exist
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      console.log("Using mock data - Database tables not found")
      return NextResponse.json({
        success: true,
        data: mockActivities,
        total: mockActivities.length,
        timestamp: new Date().toISOString(),
        mock: true,
        reason: "Database tables not found",
      })
    }

    const supabase = createClient()

    const { data: activities, error } = await supabase
      .from("server_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Supabase error:", error)
      // Fallback to mock data on database error
      return NextResponse.json({
        success: true,
        data: mockActivities,
        total: mockActivities.length,
        timestamp: new Date().toISOString(),
        mock: true,
        reason: "Database error",
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      data: activities || [],
      total: activities?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching activities:", error)

    // Fallback to mock data on any error
    return NextResponse.json({
      success: true,
      data: mockActivities,
      total: mockActivities.length,
      timestamp: new Date().toISOString(),
      mock: true,
      reason: "Unexpected error",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
