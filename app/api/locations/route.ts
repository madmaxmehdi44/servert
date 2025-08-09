import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured, checkTablesExist, mockLocations, getTableColumns } from "@/lib/database"

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: mockLocations,
        total: mockLocations.length,
        mock: true,
        reason: "Supabase not configured",
      })
    }

    // Check if tables exist
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      return NextResponse.json({
        success: true,
        data: mockLocations,
        total: mockLocations.length,
        mock: true,
        reason: "Database tables not found",
      })
    }

    const supabase = createClient()

    // Get available columns for locations table
    const availableColumns = await getTableColumns("locations")

    // Build select query based on available columns
    const requiredColumns = ["id", "name", "address", "city", "country"]
    const optionalColumns = ["latitude", "longitude", "created_at", "updated_at"]

    const selectColumns = [...requiredColumns, ...optionalColumns.filter((col) => availableColumns.includes(col))]

    const { data: locations, error } = await supabase
      .from("locations")
      .select(selectColumns.join(", "))
      .order(availableColumns.includes("created_at") ? "created_at" : "id", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({
        success: true,
        data: mockLocations,
        total: mockLocations.length,
        mock: true,
        reason: "Database error",
        error: error.message,
      })
    }

    // Normalize location data
    const normalizedLocations = (locations || []).map((location: any) => ({
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      country: location.country,
      latitude: location.latitude || null,
      longitude: location.longitude || null,
      created_at: location.created_at || new Date().toISOString(),
      updated_at: location.updated_at || location.created_at || new Date().toISOString(),
    }))

    // Log activity if possible
    try {
      await supabase.from("server_logs").insert({
        action: "GET_LOCATIONS",
        details: `Retrieved ${normalizedLocations.length} locations`,
        user_id: null,
      })
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json({
      success: true,
      data: normalizedLocations,
      total: normalizedLocations.length,
    })
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json({
      success: true,
      data: mockLocations,
      total: mockLocations.length,
      mock: true,
      reason: "Unexpected error",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const locationData = await request.json()

    if (!isSupabaseConfigured() || !(await checkTablesExist())) {
      const newLocation = {
        id: Date.now(),
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        country: locationData.country,
        latitude: locationData.latitude || null,
        longitude: locationData.longitude || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json(
        {
          success: true,
          message: "موقعیت با موفقیت ایجاد شد (حالت نمایشی)",
          data: newLocation,
          mock: true,
        },
        { status: 201 },
      )
    }

    const supabase = createClient()
    const availableColumns = await getTableColumns("locations")

    const insertData: any = {
      name: locationData.name,
      address: locationData.address,
      city: locationData.city,
      country: locationData.country,
    }

    if (availableColumns.includes("latitude")) insertData.latitude = locationData.latitude || null
    if (availableColumns.includes("longitude")) insertData.longitude = locationData.longitude || null

    const { data: newLocation, error } = await supabase.from("locations").insert([insertData]).select().single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          message: "خطا در ایجاد موقعیت",
          details: error.message,
        },
        { status: 500 },
      )
    }

    const normalizedLocation = {
      id: newLocation.id,
      name: newLocation.name,
      address: newLocation.address,
      city: newLocation.city,
      country: newLocation.country,
      latitude: newLocation.latitude || null,
      longitude: newLocation.longitude || null,
      created_at: newLocation.created_at || new Date().toISOString(),
      updated_at: newLocation.updated_at || new Date().toISOString(),
    }

    // Log activity if possible
    try {
      await supabase.from("server_logs").insert({
        action: "CREATE_LOCATION",
        details: `Created location: ${newLocation.name} in ${newLocation.city}`,
        user_id: null,
      })
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        success: true,
        message: "موقعیت با موفقیت ایجاد شد",
        data: normalizedLocation,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating location:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create location",
        message: "خطا در ایجاد موقعیت",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
