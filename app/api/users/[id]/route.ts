import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const userData = await request.json()
    const userId = Number.parseInt(params.id)

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        name: userData.name,
        email: userData.email,
        status: userData.status || "active",
        location_id: userData.location_id || null,
      })
      .eq("id", userId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from("server_logs").insert({
      action: "UPDATE_USER",
      details: `Updated user: ${updatedUser.name} (${updatedUser.email})`,
    })

    return NextResponse.json({
      success: true,
      message: "کاربر با موفقیت به‌روزرسانی شد",
      data: updatedUser,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const userId = Number.parseInt(params.id)

    // Get user name before deletion
    const { data: user } = await supabase.from("users").select("name, email").eq("id", userId).single()

    const { error } = await supabase.from("users").delete().eq("id", userId)

    if (error) throw error

    // Log activity
    await supabase.from("server_logs").insert({
      action: "DELETE_USER",
      details: `Deleted user: ${user?.name || "Unknown"} (${user?.email || "Unknown"})`,
    })

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
      },
      { status: 500 },
    )
  }
}
