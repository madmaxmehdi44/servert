import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, checkTablesExist, mockUsers } from "@/lib/database"

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log("Using mock data - Supabase not configured")
      return NextResponse.json({
        success: true,
        data: mockUsers,
        total: mockUsers.length,
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
        data: mockUsers,
        total: mockUsers.length,
        timestamp: new Date().toISOString(),
        mock: true,
        reason: "Database tables not found",
      })
    }

    const supabase = createClient()

    const { data: users, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      // Fallback to mock data on database error
      return NextResponse.json({
        success: true,
        data: mockUsers,
        total: mockUsers.length,
        timestamp: new Date().toISOString(),
        mock: true,
        reason: "Database error",
        error: error.message,
      })
    }

    // Log activity
    await supabase.from("server_logs").insert({
      action: "GET_USERS",
      details: `Retrieved ${users?.length || 0} users`,
    })

    return NextResponse.json({
      success: true,
      data: users || [],
      total: users?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching users:", error)

    // Fallback to mock data on any error
    return NextResponse.json({
      success: true,
      data: mockUsers,
      total: mockUsers.length,
      timestamp: new Date().toISOString(),
      mock: true,
      reason: "Unexpected error",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    // Check if Supabase is configured and tables exist
    if (!isSupabaseConfigured() || !(await checkTablesExist())) {
      // Simulate creating user with mock data
      const newUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        avatar_url: userData.avatar_url || null,
        status: userData.status || "active",
        role: userData.role || "user",
        location_id: userData.location_id || null,
        current_latitude: userData.current_latitude || null,
        current_longitude: userData.current_longitude || null,
        last_location_update: userData.is_location_enabled ? new Date().toISOString() : null,
        is_location_enabled: userData.is_location_enabled || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json(
        {
          success: true,
          message: "کاربر با موفقیت ایجاد شد (حالت نمایشی)",
          data: newUser,
          mock: true,
        },
        { status: 201 },
      )
    }

    const supabase = createClient()

    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          name: userData.name,
          email: userData.email,
          phone: userData.phone || null,
          avatar_url: userData.avatar_url || null,
          status: userData.status || "active",
          role: userData.role || "user",
          location_id: userData.location_id || null,
          current_latitude: userData.current_latitude || null,
          current_longitude: userData.current_longitude || null,
          last_location_update: userData.is_location_enabled ? new Date().toISOString() : null,
          is_location_enabled: userData.is_location_enabled || false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          message: "خطا در ایجاد کاربر",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Log activity
    await supabase.from("server_logs").insert({
      action: "CREATE_USER",
      details: `Created user: ${newUser.name} (${newUser.email})`,
      user_id: newUser.id,
    })

    // If location tracking is enabled, add to location history
    if (newUser.is_location_enabled && newUser.current_latitude && newUser.current_longitude) {
      await supabase.from("user_location_history").insert({
        user_id: newUser.id,
        latitude: newUser.current_latitude,
        longitude: newUser.current_longitude,
        accuracy: 10.0, // Default accuracy
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: "کاربر با موفقیت ایجاد شد",
        data: newUser,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create user",
        message: "خطا در ایجاد کاربر",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
