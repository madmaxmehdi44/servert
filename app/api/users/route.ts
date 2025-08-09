import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, mockUsers } from "@/lib/database"

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
      })
    }

    const supabase = createClient()

    const { data: users, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

    if (error) throw error

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

    // Fallback to mock data on error
    return NextResponse.json({
      success: true,
      data: mockUsers,
      total: mockUsers.length,
      timestamp: new Date().toISOString(),
      mock: true,
      error: "Using fallback data",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Simulate creating user with mock data
      const newUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        status: userData.status || "active",
        location_id: userData.location_id || null,
        created_at: new Date().toISOString(),
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
          status: userData.status || "active",
          location_id: userData.location_id || null,
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from("server_logs").insert({
      action: "CREATE_USER",
      details: `Created user: ${newUser.name} (${newUser.email})`,
    })

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
      },
      { status: 500 },
    )
  }
}
