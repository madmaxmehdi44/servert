import { NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, mockUsers, mockLocations, mockActivities } from "@/lib/database"

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log("Using mock data - Supabase not configured")
      const stats = {
        total_users: mockUsers.length,
        active_users: mockUsers.filter((u) => u.status === "active").length,
        total_locations: mockLocations.length,
        total_activities: mockActivities.length,
      }

      return NextResponse.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        mock: true,
      })
    }

    const supabase = createClient()

    // Get users count
    const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true })

    // Get active users count
    const { count: activeUsersCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")

    // Get locations count
    const { count: locationsCount } = await supabase.from("locations").select("*", { count: "exact", head: true })

    // Get activities count
    const { count: activitiesCount } = await supabase.from("server_logs").select("*", { count: "exact", head: true })

    const stats = {
      total_users: usersCount || 0,
      active_users: activeUsersCount || 0,
      total_locations: locationsCount || 0,
      total_activities: activitiesCount || 0,
    }

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching stats:", error)

    // Fallback to mock data on error
    const stats = {
      total_users: mockUsers.length,
      active_users: mockUsers.filter((u) => u.status === "active").length,
      total_locations: mockLocations.length,
      total_activities: mockActivities.length,
    }

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      mock: true,
      error: "Using fallback data",
    })
  }
}
