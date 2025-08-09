import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, checkTablesExist, mockUsers } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = Number.parseInt(params.id)

    if (!isSupabaseConfigured() || !(await checkTablesExist())) {
      const mockUser = mockUsers.find((u) => u.id === userId)
      if (!mockUser) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: mockUser, mock: true })
    }

    const supabase = createClient()

    // Check what columns exist in the users table
    const { data: tableInfo } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "users")

    const availableColumns = tableInfo?.map((col) => col.column_name) || []

    // Build select query based on available columns
    const baseColumns = ["id", "name", "email", "created_at", "updated_at"]
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
    ]

    const selectColumns = [...baseColumns, ...optionalColumns.filter((col) => availableColumns.includes(col))].join(
      ", ",
    )

    const { data: user, error } = await supabase.from("users").select(selectColumns).eq("id", userId).single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Normalize user data
    const normalizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      avatar_url: user.avatar_url || "/portrait-thoughtful-man.png",
      status: user.status || "active",
      role: user.role || "user",
      location_id: user.location_id || null,
      current_latitude: user.current_latitude || null,
      current_longitude: user.current_longitude || null,
      last_location_update: user.last_location_update || null,
      is_location_enabled: user.is_location_enabled || false,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }

    return NextResponse.json({ success: true, data: normalizedUser })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = Number.parseInt(params.id)
    const userData = await request.json()

    if (!isSupabaseConfigured() || !(await checkTablesExist())) {
      return NextResponse.json(
        {
          success: true,
          message: "کاربر با موفقیت به‌روزرسانی شد (حالت نمایشی)",
          data: { id: userId, ...userData },
          mock: true,
        },
        { status: 200 },
      )
    }

    const supabase = createClient()

    // Check what columns exist before updating
    const { data: tableInfo } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "users")

    const availableColumns = tableInfo?.map((col) => col.column_name) || []

    // Build update data based on available columns
    const updateData: any = {}

    if (userData.name) updateData.name = userData.name
    if (userData.email) updateData.email = userData.email
    if (availableColumns.includes("phone")) updateData.phone = userData.phone || null
    if (availableColumns.includes("avatar_url")) updateData.avatar_url = userData.avatar_url || null
    if (availableColumns.includes("status")) updateData.status = userData.status || "active"
    if (availableColumns.includes("role")) updateData.role = userData.role || "user"
    if (availableColumns.includes("location_id")) updateData.location_id = userData.location_id || null
    if (availableColumns.includes("current_latitude")) updateData.current_latitude = userData.current_latitude || null
    if (availableColumns.includes("current_longitude"))
      updateData.current_longitude = userData.current_longitude || null
    if (availableColumns.includes("is_location_enabled"))
      updateData.is_location_enabled = userData.is_location_enabled || false
    if (availableColumns.includes("last_location_update")) {
      updateData.last_location_update = userData.is_location_enabled ? new Date().toISOString() : null
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          message: "خطا در به‌روزرسانی کاربر",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Normalize the response
    const normalizedUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || null,
      avatar_url: updatedUser.avatar_url || "/portrait-thoughtful-man.png",
      status: updatedUser.status || "active",
      role: updatedUser.role || "user",
      location_id: updatedUser.location_id || null,
      current_latitude: updatedUser.current_latitude || null,
      current_longitude: updatedUser.current_longitude || null,
      last_location_update: updatedUser.last_location_update || null,
      is_location_enabled: updatedUser.is_location_enabled || false,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    }

    // Log activity
    try {
      await supabase.from("server_logs").insert({
        action: "UPDATE_USER",
        details: `Updated user: ${normalizedUser.name} (${normalizedUser.email})`,
        user_id: normalizedUser.id,
      })
    } catch (logError) {
      console.warn("Could not log activity:", logError)
    }

    // If location tracking is enabled and history table exists, add to location history
    if (normalizedUser.is_location_enabled && normalizedUser.current_latitude && normalizedUser.current_longitude) {
      try {
        await supabase.from("user_location_history").insert({
          user_id: normalizedUser.id,
          latitude: normalizedUser.current_latitude,
          longitude: normalizedUser.current_longitude,
          accuracy: 10.0, // Default accuracy
        })
      } catch (historyError) {
        console.warn("Could not add location history:", historyError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "کاربر با موفقیت به‌روزرسانی شد",
      data: normalizedUser,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
        message: "خطا در به‌روزرسانی کاربر",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = Number.parseInt(params.id)

    if (!isSupabaseConfigured() || !(await checkTablesExist())) {
      return NextResponse.json(
        {
          success: true,
          message: "کاربر با موفقیت حذف شد (حالت نمایشی)",
          mock: true,
        },
        { status: 200 },
      )
    }

    const supabase = createClient()

    const { error } = await supabase.from("users").delete().eq("id", userId)

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          message: "خطا در حذف کاربر",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Log activity
    try {
      await supabase.from("server_logs").insert({
        action: "DELETE_USER",
        details: `Deleted user with ID: ${userId}`,
        user_id: userId,
      })
    } catch (logError) {
      console.warn("Could not log activity:", logError)
    }

    return NextResponse.json({
      success: true,
      message: "کاربر با موفقیت حذف شد",
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete user",
        message: "خطا در حذف کاربر",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
