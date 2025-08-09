import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return !!(url && key && url !== "your-project-url" && key !== "your-anon-key" && url.startsWith("http"))
}

// Create Supabase client with error handling
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not properly configured")
  }

  try {
    return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    throw new Error("Failed to initialize database connection")
  }
}

// Check if required tables exist
export async function checkTablesExist(): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) return false

    const supabase = createClient()

    // Try to query the users table
    const { error } = await supabase.from("users").select("id").limit(1)

    return !error
  } catch (error) {
    console.error("Error checking tables:", error)
    return false
  }
}

// Get table columns dynamically
export async function getTableColumns(tableName: string): Promise<string[]> {
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

// Mock data for when Supabase is not configured
export const mockUsers = [
  {
    id: 1,
    name: "علی احمدی",
    email: "ali@example.com",
    phone: "09121234567",
    avatar_url: "/ali-portrait.png",
    status: "active",
    role: "admin",
    auth_provider: "email",
    google_id: null,
    location_id: 1,
    current_latitude: 35.6892,
    current_longitude: 51.389,
    last_location_update: new Date().toISOString(),
    is_location_enabled: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
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
    auth_provider: "google",
    google_id: "google_123456",
    location_id: 2,
    current_latitude: 32.6546,
    current_longitude: 51.668,
    last_location_update: new Date().toISOString(),
    is_location_enabled: true,
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
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
    auth_provider: "email",
    google_id: null,
    location_id: 3,
    current_latitude: 29.5918,
    current_longitude: 52.5837,
    last_location_update: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_location_enabled: false,
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 4,
    name: "مریم کریمی",
    email: "maryam@example.com",
    phone: "09127654321",
    avatar_url: "/maryam-portrait.png",
    status: "active",
    role: "user",
    auth_provider: "email",
    google_id: null,
    location_id: 1,
    current_latitude: 35.695,
    current_longitude: 51.395,
    last_location_update: new Date().toISOString(),
    is_location_enabled: true,
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
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
    auth_provider: "google",
    google_id: "google_789012",
    location_id: 2,
    current_latitude: 32.66,
    current_longitude: 51.67,
    last_location_update: new Date().toISOString(),
    is_location_enabled: true,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
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
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 2,
    name: "شعبه اصفهان",
    address: "خیابان چهارباغ، پلاک 456",
    city: "اصفهان",
    country: "ایران",
    latitude: 32.6546,
    longitude: 51.668,
    created_at: new Date(Date.now() - 86400000 * 50).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: 3,
    name: "شعبه شیراز",
    address: "خیابان زند، پلاک 789",
    city: "شیراز",
    country: "ایران",
    latitude: 29.5918,
    longitude: 52.5837,
    created_at: new Date(Date.now() - 86400000 * 40).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: 4,
    name: "شعبه مشهد",
    address: "خیابان امام رضا، پلاک 321",
    city: "مشهد",
    country: "ایران",
    latitude: 36.2605,
    longitude: 59.6168,
    created_at: new Date(Date.now() - 86400000 * 35).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 5,
    name: "شعبه تبریز",
    address: "خیابان شهریار، پلاک 654",
    city: "تبریز",
    country: "ایران",
    latitude: 38.0962,
    longitude: 46.2738,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
]

export const mockActivities = [
  {
    id: 1,
    action: "USER_LOGIN",
    details: "علی احمدی وارد سیستم شد",
    user_id: 1,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    action: "GOOGLE_LOGIN",
    details: "فاطمه محمدی از طریق گوگل وارد شد",
    user_id: 2,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3,
    action: "USER_SIGNUP",
    details: "کاربر جدید مریم کریمی ثبت‌نام کرد",
    user_id: 4,
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 4,
    action: "LOCATION_UPDATE",
    details: "موقعیت محمد صادقی به‌روزرسانی شد",
    user_id: 5,
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 5,
    action: "SYSTEM_BACKUP",
    details: "پشتیبان‌گیری خودکار انجام شد",
    user_id: null,
    created_at: new Date(Date.now() - 18000000).toISOString(),
  },
]
