import { type NextRequest, NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      deviceId,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      isBackground,
      networkStatus,
      timestamp,
    } = await request.json()

    if (!isSupabaseConfigured()) {
      // Mock response for demo
      return NextResponse.json({
        success: true,
        message: "موقعیت به‌روزرسانی شد (حالت نمایشی)",
      })
    }

    const supabase = createClient()

    // Update user's current location
    await supabase
      .from("users")
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        location_accuracy: accuracy,
        last_location_update: new Date().toISOString(),
      })
      .eq("id", userId)

    // Add to location history
    await supabase.from("user_location_history").insert({
      user_id: userId,
      device_id: deviceId,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      location_method: accuracy <= 10 ? "gps" : accuracy <= 100 ? "network" : "passive",
      is_background: isBackground || false,
      battery_level: batteryLevel,
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
    })

    // Update device last seen
    await supabase
      .from("user_devices")
      .update({
        last_seen: new Date().toISOString(),
      })
      .eq("id", deviceId)

    // Check for geofence events
    const { data: geofences } = await supabase.from("geofences").select("*").eq("is_active", true)

    if (geofences) {
      for (const geofence of geofences) {
        const distance = calculateDistance(latitude, longitude, geofence.latitude, geofence.longitude)

        if (distance <= geofence.radius) {
          // User entered geofence
          const { data: lastEvent } = await supabase
            .from("geofence_events")
            .select("*")
            .eq("user_id", userId)
            .eq("geofence_id", geofence.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (!lastEvent || lastEvent.event_type === "exit") {
            // Log entry event
            await supabase.from("geofence_events").insert({
              user_id: userId,
              device_id: deviceId,
              geofence_id: geofence.id,
              event_type: "enter",
              latitude,
              longitude,
            })

            // Log activity
            await supabase.from("server_logs").insert({
              action: "GEOFENCE_ENTER",
              details: `User entered geofence: ${geofence.name}`,
              user_id: userId,
              device_id: deviceId,
            })
          }
        } else {
          // Check if user was previously inside and now outside
          const { data: lastEvent } = await supabase
            .from("geofence_events")
            .select("*")
            .eq("user_id", userId)
            .eq("geofence_id", geofence.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (lastEvent && lastEvent.event_type === "enter") {
            // Log exit event
            await supabase.from("geofence_events").insert({
              user_id: userId,
              device_id: deviceId,
              geofence_id: geofence.id,
              event_type: "exit",
              latitude,
              longitude,
            })

            // Log activity
            await supabase.from("server_logs").insert({
              action: "GEOFENCE_EXIT",
              details: `User exited geofence: ${geofence.name}`,
              user_id: userId,
              device_id: deviceId,
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "موقعیت با موفقیت به‌روزرسانی شد",
    })
  } catch (error) {
    console.error("Location update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "خطا در به‌روزرسانی موقعیت",
      },
      { status: 500 },
    )
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
