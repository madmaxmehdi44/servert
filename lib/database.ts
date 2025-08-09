import { createClient as supabaseCreateClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not configured")
  }
  return supabaseCreateClient(supabaseUrl, supabaseKey)
}

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseKey)
}

// Check if tables exist in Supabase
export const checkTablesExist = async () => {
  try {
    if (!isSupabaseConfigured()) return false

    const supabase = createClient()

    // Try to query each table to see if it exists
    const [usersCheck, locationsCheck, logsCheck] = await Promise.allSettled([
      supabase.from("users").select("id").limit(1),
      supabase.from("locations").select("id").limit(1),
      supabase.from("server_logs").select("id").limit(1),
    ])

    // If any query succeeds, tables exist
    return (
      usersCheck.status === "fulfilled" || locationsCheck.status === "fulfilled" || logsCheck.status === "fulfilled"
    )
  } catch (error) {
    return false
  }
}

// Enhanced mock data with location tracking
export const mockUsers = [
  {
    id: 1,
    name: "علی احمدی",
    email: "ali@example.com",
    phone: "09121234567",
    avatar_url: "/ali-portrait.png",
    status: "active",
    role: "admin",
    location_id: 1,
    current_latitude: 35.6892,
    current_longitude: 51.389,
    last_location_update: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    is_location_enabled: true,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "فاطمه محمدی",
    email: "fateme@example.com",
    phone: "09129876543",
    avatar_url: "/portrait-Fateme.png",
    status: "active",
    role: "manager",
    location_id: 2,
    current_latitude: 32.6546,
    current_longitude: 51.668,
    last_location_update: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    is_location_enabled: true,
    created_at: "2024-01-16T11:30:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "حسن رضایی",
    email: "hassan@example.com",
    phone: "09123456789",
    avatar_url: "/portrait-thoughtful-man.png",
    status: "inactive",
    role: "user",
    location_id: 3,
    current_latitude: null,
    current_longitude: null,
    last_location_update: null,
    is_location_enabled: false,
    created_at: "2024-01-17T12:30:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: "مریم کریمی",
    email: "maryam@example.com",
    phone: "09127654321",
    avatar_url: "/maryam-portrait.png",
    status: "active",
    role: "user",
    location_id: 1,
    current_latitude: 35.695,
    current_longitude: 51.395,
    last_location_update: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    is_location_enabled: true,
    created_at: "2024-01-18T13:30:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: "محمد صادقی",
    email: "mohammad@example.com",
    phone: "09125555555",
    avatar_url: "/mohammad-calligraphy.png",
    status: "active",
    role: "user",
    location_id: 2,
    current_latitude: 32.66,
    current_longitude: 51.67,
    last_location_update: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    is_location_enabled: true,
    created_at: "2024-01-19T14:30:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    name: "زهرا حسینی",
    email: "zahra@example.com",
    phone: "09124444444",
    avatar_url: "/zahra-portrait.png",
    status: "active",
    role: "user",
    location_id: 4,
    current_latitude: 36.2605,
    current_longitude: 59.6168,
    last_location_update: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 minutes ago
    is_location_enabled: true,
    created_at: "2024-01-20T15:30:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 7,
    name: "رضا موسوی",
    email: "reza@example.com",
    phone: "09123333333",
    avatar_url: "/portrait-thoughtful-man.png",
    status: "active",
    role: "user",
    location_id: 5,
    current_latitude: 38.0962,
    current_longitude: 46.2738,
    last_location_update: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
    is_location_enabled: true,
    created_at: "2024-01-21T16:30:00Z",
    updated_at: new Date().toISOString(),
  },
]

export const mockLocations = [
  {
    id: 1,
    name: "دفتر مرکزی",
    address: "خیابان ولیعصر، پلاک 123",
    city: "تهران",
    country: "ایران",
    latitude: 35.6892,
    longitude: 51.389,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "شعبه اصفهان",
    address: "خیابان چهارباغ، پلاک 456",
    city: "اصفهان",
    country: "ایران",
    latitude: 32.6546,
    longitude: 51.668,
    created_at: "2024-01-11T09:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "شعبه شیراز",
    address: "خیابان زند، پلاک 789",
    city: "شیراز",
    country: "ایران",
    latitude: 29.5918,
    longitude: 52.5837,
    created_at: "2024-01-12T09:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: "شعبه مشهد",
    address: "خیابان امام رضا، پلاک 321",
    city: "مشهد",
    country: "ایران",
    latitude: 36.2605,
    longitude: 59.6168,
    created_at: "2024-01-13T09:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: "شعبه تبریز",
    address: "خیابان شهریار، پلاک 654",
    city: "تبریز",
    country: "ایران",
    latitude: 38.0962,
    longitude: 46.2738,
    created_at: "2024-01-14T09:00:00Z",
    updated_at: new Date().toISOString(),
  },
]

export const mockActivities = [
  {
    id: 1,
    action: "SYSTEM_START",
    details: "سیستم راه‌اندازی شد",
    user_id: null,
    created_at: "2024-01-20T08:00:00Z",
  },
  {
    id: 2,
    action: "USER_LOGIN",
    details: "کاربر علی احمدی وارد سیستم شد",
    user_id: 1,
    created_at: "2024-01-20T08:30:00Z",
  },
  {
    id: 3,
    action: "USER_LOCATION_UPDATE",
    details: "موقعیت کاربر علی احمدی به‌روزرسانی شد",
    user_id: 1,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    action: "USER_LOCATION_UPDATE",
    details: "موقعیت کاربر فاطمه محمدی به‌روزرسانی شد",
    user_id: 2,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    action: "CREATE_USER",
    details: "کاربر جدید مریم کریمی ایجاد شد",
    user_id: 4,
    created_at: "2024-01-20T09:00:00Z",
  },
  {
    id: 6,
    action: "UPDATE_LOCATION",
    details: "مکان دفتر مرکزی به‌روزرسانی شد",
    user_id: null,
    created_at: "2024-01-20T09:30:00Z",
  },
]

export const mockLocationHistory = [
  {
    id: 1,
    user_id: 1,
    latitude: 35.6892,
    longitude: 51.389,
    accuracy: 10.5,
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
  },
  {
    id: 2,
    user_id: 1,
    latitude: 35.69,
    longitude: 51.39,
    accuracy: 8.2,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  },
  {
    id: 3,
    user_id: 2,
    latitude: 32.6546,
    longitude: 51.668,
    accuracy: 12.1,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 4,
    user_id: 2,
    latitude: 32.655,
    longitude: 51.669,
    accuracy: 9.8,
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
  },
  {
    id: 5,
    user_id: 4,
    latitude: 35.695,
    longitude: 51.395,
    accuracy: 7.5,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
  },
]
