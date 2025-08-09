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

// Mock data for when Supabase is not configured
export const mockUsers = [
  {
    id: 1,
    name: "علی احمدی",
    email: "ali@example.com",
    status: "active",
    location_id: 1,
    created_at: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    name: "فاطمه محمدی",
    email: "fateme@example.com",
    status: "active",
    location_id: 2,
    created_at: "2024-01-16T11:30:00Z",
  },
  {
    id: 3,
    name: "حسن رضایی",
    email: "hassan@example.com",
    status: "inactive",
    location_id: 3,
    created_at: "2024-01-17T12:30:00Z",
  },
  {
    id: 4,
    name: "مریم کریمی",
    email: "maryam@example.com",
    status: "active",
    location_id: 1,
    created_at: "2024-01-18T13:30:00Z",
  },
  {
    id: 5,
    name: "محمد صادقی",
    email: "mohammad@example.com",
    status: "active",
    location_id: 2,
    created_at: "2024-01-19T14:30:00Z",
  },
]

export const mockLocations = [
  {
    id: 1,
    name: "دفتر مرکزی",
    address: "خیابان ولیعصر، پلاک 123",
    city: "تهران",
    country: "ایران",
    coordinates: "35.6892,51.3890",
    created_at: "2024-01-10T09:00:00Z",
  },
  {
    id: 2,
    name: "شعبه اصفهان",
    address: "خیابان چهارباغ، پلاک 456",
    city: "اصفهان",
    country: "ایران",
    coordinates: "32.6546,51.6680",
    created_at: "2024-01-11T09:00:00Z",
  },
  {
    id: 3,
    name: "شعبه شیراز",
    address: "خیابان زند، پلاک 789",
    city: "شیراز",
    country: "ایران",
    coordinates: "29.5918,52.5837",
    created_at: "2024-01-12T09:00:00Z",
  },
  {
    id: 4,
    name: "شعبه مشهد",
    address: "خیابان امام رضا، پلاک 321",
    city: "مشهد",
    country: "ایران",
    coordinates: "36.2605,59.6168",
    created_at: "2024-01-13T09:00:00Z",
  },
]

export const mockActivities = [
  {
    id: 1,
    action: "SYSTEM_START",
    details: "سیستم راه‌اندازی شد",
    created_at: "2024-01-20T08:00:00Z",
  },
  {
    id: 2,
    action: "USER_LOGIN",
    details: "کاربر علی احمدی وارد سیستم شد",
    created_at: "2024-01-20T08:30:00Z",
  },
  {
    id: 3,
    action: "CREATE_USER",
    details: "کاربر جدید مریم کریمی ایجاد شد",
    created_at: "2024-01-20T09:00:00Z",
  },
  {
    id: 4,
    action: "UPDATE_LOCATION",
    details: "مکان دفتر مرکزی به‌روزرسانی شد",
    created_at: "2024-01-20T09:30:00Z",
  },
  {
    id: 5,
    action: "DELETE_USER",
    details: "کاربر حذف شد",
    created_at: "2024-01-20T10:00:00Z",
  },
]
