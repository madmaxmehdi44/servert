import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, checkTablesExist, mockUsers } from "@/lib/database"

async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    if (!isSupabaseConfigured()) return []

    const supabase = createClient()

    // Try to get a sample record to determine available columns
    const { data, error } = await supabase.from(tableName).select("*").limit(1)

    if (error || !data || data.length === 0) {
      // Return basic columns as fallback
      return tableName === "users"
        ? ["id", "name", "email", "created_at"]
        : ["id", "name", "address", "city", "country"]
    }

    return Object.keys(data[0])
  } catch (error) {
    console.error("Error getting table columns:", error)
    return tableName === "users" ? ["id", "name", "email", "created_at"] : ["id", "name", "address", "city", "country"]
  }
}

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: mockUsers,
        total: mockUsers.length,
        mock: true,
        reason: "Supabase not configured",
      })
    }

    // Check if tables exist
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      return NextResponse.json({
        success: true,
        data: mockUsers,
        total: mockUsers.length,
        mock: true,
        reason: "Database tables not found",
      })
    }

    const supabase = createClient()

    // Get available columns for users table
    const availableColumns = await getTableColumns("users")

    // Build select query based on available columns
    const requiredColumns = ["id", "name", "email"]
    const optionalColumns = [
      "phone",
      "avatar_url",
      "status",
      "role",
      "location_id",
      "current_latitude",
      "current_longitude",
      "last_location_update",
      "is_location_enabled",
      "created_at",
      "updated_at",
    ]

    const selectColumns = [...requiredColumns, ...optionalColumns.filter((col) => availableColumns.includes(col))]

    const { data: users, error } = await supabase
      .from("users")
      .select(selectColumns.join(", "))
      .order(availableColumns.includes("created_at") ? "created_at" : "id", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({
        success: true,
        data: mockUsers,
        total: mockUsers.length,
        mock: true,
        reason: "Database error",
        error: error.message,
      })
    }

    // Normalize user data to ensure all expected fields exist
    const normalizedUsers = (users || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      avatar_url: user.avatar_url || `/placeholder.svg?height=40&width=40&query=${encodeURIComponent(user.name)}`,
      status: user.status || "active",
      role: user.role || "user",
      location_id: user.location_id || null,
      current_latitude: user.current_latitude || null,
      current_longitude: user.current_longitude || null,
      last_location_update: user.last_location_update || null,
      is_location_enabled: user.is_location_enabled || false,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || user.created_at || new Date().toISOString(),
    }))

    // Log activity if possible
    try {
      if (availableColumns.includes("server_logs")) {
        await supabase.from("server_logs").insert({
          action: "GET_USERS",
          details: `Retrieved ${normalizedUsers.length} users`,
        })
      }
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json({
      success: true,
      data: normalizedUsers,
      total: normalizedUsers.length,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({
      success: true,
      data: mockUsers,
      total: mockUsers.length,
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
        avatar_url:
          userData.avatar_url || `/placeholder.svg?height=40&width=40&query=${encodeURIComponent(userData.name)}`,
        status: userData.status || "active",
        role: userData.role || "user",
        location_id: userData.location_id || null,
        current_latitude: userData.current_latitude || null,
        current_longitude: userData.current_longitude || null,
        last_location_update: userData.last_location_update || null,
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
    const availableColumns = await getTableColumns("users")

    // Build insert data based on available columns
    const insertData: any = {
      name: userData.name,
      email: userData.email,
    }

    // Add optional fields only if columns exist
    if (availableColumns.includes("phone")) insertData.phone = userData.phone || null
    if (availableColumns.includes("avatar_url")) insertData.avatar_url = userData.avatar_url || null
    if (availableColumns.includes("status")) insertData.status = userData.status || "active"
    if (availableColumns.includes("role")) insertData.role = userData.role || "user"
    if (availableColumns.includes("location_id")) insertData.location_id = userData.location_id || null
    if (availableColumns.includes("current_latitude")) insertData.current_latitude = userData.current_latitude || null
    if (availableColumns.includes("current_longitude"))
      insertData.current_longitude = userData.current_longitude || null
    if (availableColumns.includes("last_location_update"))
      insertData.last_location_update = userData.last_location_update || null
    if (availableColumns.includes("is_location_enabled"))
      insertData.is_location_enabled = userData.is_location_enabled || false

    const { data: newUser, error } = await supabase.from("users").insert([insertData]).select().single()

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

    // Normalize the response
    const normalizedUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || null,
      avatar_url: newUser.avatar_url || `/placeholder.svg?height=40&width=40&query=${encodeURIComponent(newUser.name)}`,
      status: newUser.status || "active",
      role: newUser.role || "user",
      location_id: newUser.location_id || null,
      current_latitude: newUser.current_latitude || null,
      current_longitude: newUser.current_longitude || null,
      last_location_update: newUser.last_location_update || null,
      is_location_enabled: newUser.is_location_enabled || false,
      created_at: newUser.created_at || new Date().toISOString(),
      updated_at: newUser.updated_at || new Date().toISOString(),
    }

    // Log activity if possible
    try {
      await supabase.from("server_logs").insert({
        action: "CREATE_USER",
        details: `Created user: ${newUser.name} (${newUser.email})`,
        user_id: newUser.id,
      })
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        success: true,
        message: "کاربر با موفقیت ایجاد شد",
        data: normalizedUser,
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
