import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const locationData = await request.json()
    const locationId = Number.parseInt(params.id)

    const { data: updatedLocation, error } = await supabase
      .from("locations")
      .update({
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        country: locationData.country,
        coordinates: locationData.coordinates || null,
      })
      .eq("id", locationId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from("server_logs").insert({
      action: "UPDATE_LOCATION",
      details: `Updated location: ${updatedLocation.name}`,
    })

    return NextResponse.json({
      success: true,
      message: "مکان با موفقیت به‌روزرسانی شد",
      data: updatedLocation,
    })
  } catch (error) {
    console.error("Error updating location:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update location",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const locationId = Number.parseInt(params.id)

    // Get location name before deletion
    const { data: location } = await supabase.from("locations").select("name").eq("id", locationId).single()

    const { error } = await supabase.from("locations").delete().eq("id", locationId)

    if (error) throw error

    // Log activity
    await supabase.from("server_logs").insert({
      action: "DELETE_LOCATION",
      details: `Deleted location: ${location?.name || "Unknown"}`,
    })

    return NextResponse.json({
      success: true,
      message: "مکان با موفقیت حذف شد",
    })
  } catch (error) {
    console.error("Error deleting location:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete location",
      },
      { status: 500 },
    )
  }
}
