import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, mockLocations } from "@/lib/database"

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log("Using mock data - Supabase not configured")
      return NextResponse.json({
        success: true,
        data: mockLocations,
        total: mockLocations.length,
        timestamp: new Date().toISOString(),
        mock: true,
      })
    }

    const supabase = createClient()

    const { data: locations, error } = await supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Log activity
    await supabase.from("server_logs").insert({
      action: "GET_LOCATIONS",
      details: `Retrieved ${locations?.length || 0} locations`,
    })

    return NextResponse.json({
      success: true,
      data: locations || [],
      total: locations?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching locations:", error)

    // Fallback to mock data on error
    return NextResponse.json({
      success: true,
      data: mockLocations,
      total: mockLocations.length,
      timestamp: new Date().toISOString(),
      mock: true,
      error: "Using fallback data",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const locationData = await request.json()

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Simulate creating location with mock data
      const newLocation = {
        id: Date.now(),
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        country: locationData.country,
        coordinates: locationData.coordinates || null,
        created_at: new Date().toISOString(),
      }

      return NextResponse.json(
        {
          success: true,
          message: "مکان با موفقیت ایجاد شد (حالت نمایشی)",
          data: newLocation,
          mock: true,
        },
        { status: 201 },
      )
    }

    const supabase = createClient()

    const { data: newLocation, error } = await supabase
      .from("locations")
      .insert([
        {
          name: locationData.name,
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          coordinates: locationData.coordinates || null,
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from("server_logs").insert({
      action: "CREATE_LOCATION",
      details: `Created location: ${newLocation.name} in ${newLocation.city}`,
    })

    return NextResponse.json(
      {
        success: true,
        message: "مکان با موفقیت ایجاد شد",
        data: newLocation,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating location:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create location",
        message: "خطا در ایجاد مکان",
      },
      { status: 500 },
    )
  }
}
