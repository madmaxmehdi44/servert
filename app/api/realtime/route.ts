import { createClient, isSupabaseConfigured, mockUsers, mockLocations, mockActivities } from "@/lib/database"

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = async () => {
        try {
          let users, locations, activities, stats

          if (!isSupabaseConfigured()) {
            // Use mock data
            users = mockUsers
            locations = mockLocations
            activities = mockActivities
            stats = {
              total_users: mockUsers.length,
              active_users: mockUsers.filter((u) => u.status === "active").length,
              total_locations: mockLocations.length,
              total_activities: mockActivities.length,
            }
          } else {
            // Use Supabase data
            const supabase = createClient()

            const [usersRes, locationsRes, activitiesRes] = await Promise.all([
              supabase.from("users").select("*").order("created_at", { ascending: false }),
              supabase.from("locations").select("*").order("created_at", { ascending: false }),
              supabase.from("server_logs").select("*").order("created_at", { ascending: false }).limit(50),
            ])

            users = usersRes.data || []
            locations = locationsRes.data || []
            activities = activitiesRes.data || []

            stats = {
              total_users: users.length,
              active_users: users.filter((u) => u.status === "active").length,
              total_locations: locations.length,
              total_activities: activities.length,
            }
          }

          // Send updates
          const updates = [
            { type: "users_update", users },
            { type: "locations_update", locations },
            { type: "activities_update", activities },
            { type: "stats_update", stats },
            { type: "time_update", time: new Date().toISOString() },
          ]

          for (const update of updates) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`))
          }
        } catch (error) {
          console.error("Real-time update error:", error)

          // Send mock data on error
          const updates = [
            { type: "users_update", users: mockUsers },
            { type: "locations_update", locations: mockLocations },
            { type: "activities_update", activities: mockActivities },
            {
              type: "stats_update",
              stats: {
                total_users: mockUsers.length,
                active_users: mockUsers.filter((u) => u.status === "active").length,
                total_locations: mockLocations.length,
                total_activities: mockActivities.length,
              },
            },
            { type: "time_update", time: new Date().toISOString() },
          ]

          for (const update of updates) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`))
          }
        }
      }

      // Send initial update
      sendUpdate()

      // Send updates every 5 seconds
      const interval = setInterval(sendUpdate, 5000)

      // Cleanup on close
      return () => clearInterval(interval)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
