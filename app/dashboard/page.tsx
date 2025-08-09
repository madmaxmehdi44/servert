"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Clock,
  Database,
  AlertTriangle,
  ExternalLink,
  MoreHorizontal,
  Mail,
  Calendar,
  Filter,
  Phone,
  Navigation,
  Shield,
} from "lucide-react"
import { EnhancedUserFormDialog } from "@/components/enhanced-user-form-dialog"
import { LocationFormDialog } from "@/components/location-form-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { UserLocationMap } from "@/components/user-location-map"

interface User {
  id: number
  name: string
  email: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
  status?: "active" | "inactive"
  role?: "admin" | "manager" | "user"
  location_id?: number
  current_latitude?: number
  current_longitude?: number
  last_location_update?: string
  is_location_enabled?: boolean
}

interface Location {
  id: number
  name: string
  address: string
  city: string
  country: string
  latitude?: number
  longitude?: number
  created_at: string
  updated_at?: string
}

interface Activity {
  id: number
  action: string
  details: string
  created_at: string
  user_id?: number
}

interface Stats {
  total_users: number
  total_locations: number
  total_activities: number
  active_users: number
  users_with_location: number
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [stats, setStats] = useState<Stats>({
    total_users: 0,
    total_locations: 0,
    total_activities: 0,
    active_users: 0,
    users_with_location: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "manager" | "user">("all")
  const [usingMockData, setUsingMockData] = useState(false)
  const [mockReason, setMockReason] = useState("")

  // Dialog states
  const [userDialog, setUserDialog] = useState<{
    open: boolean
    user?: User | null
  }>({ open: false, user: null })

  const [locationDialog, setLocationDialog] = useState<{
    open: boolean
    location?: Location | null
  }>({ open: false, location: null })

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type?: "user" | "location"
    item?: User | Location | null
  }>({ open: false, type: undefined, item: null })

  // Real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime")

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "users_update") {
        setUsers(data.users)
      } else if (data.type === "locations_update") {
        setLocations(data.locations)
      } else if (data.type === "activities_update") {
        setActivities(data.activities)
      } else if (data.type === "stats_update") {
        setStats(data.stats)
      }
    }

    return () => eventSource.close()
  }, [])

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, locationsRes, activitiesRes, statsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/locations"),
        fetch("/api/activities"),
        fetch("/api/stats"),
      ])

      const usersData = await usersRes.json()
      const locationsData = await locationsRes.json()
      const activitiesData = await activitiesRes.json()
      const statsData = await statsRes.json()

      if (usersData.success) setUsers(usersData.data)
      if (locationsData.success) setLocations(locationsData.data)
      if (activitiesData.success) setActivities(activitiesData.data)
      if (statsData.success) {
        const enhancedStats = {
          ...statsData.data,
          users_with_location:
            usersData.data?.filter((u: User) => u.current_latitude && u.current_longitude && u.is_location_enabled)
              .length || 0,
        }
        setStats(enhancedStats)
      }

      // Check if using mock data and get reason
      const isMock = usersData.mock || locationsData.mock || activitiesData.mock || statsData.mock
      setUsingMockData(isMock)

      if (isMock) {
        const reason = usersData.reason || locationsData.reason || activitiesData.reason || statsData.reason
        setMockReason(reason)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (type: "user" | "location", id: number) => {
    try {
      const response = await fetch(`/api/${type === "user" ? "users" : "locations"}/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm))

    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.country.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getLocationName = (locationId?: number) => {
    if (!locationId) return "تعیین نشده"
    const location = locations.find((l) => l.id === locationId)
    return location ? `${location.name} - ${location.city}` : "نامشخص"
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">مدیر کل</Badge>
      case "manager":
        return <Badge variant="default">مدیر</Badge>
      case "user":
        return <Badge variant="secondary">کاربر</Badge>
      default:
        return <Badge variant="outline">نامشخص</Badge>
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getSetupInstructions = () => {
    switch (mockReason) {
      case "Supabase not configured":
        return {
          title: "پیکربندی Supabase",
          description: "متغیرهای محیطی Supabase تنظیم نشده‌اند",
          steps: [
            "یک پروژه جدید در supabase.com ایجاد کنید",
            "URL و Anon Key پروژه را کپی کنید",
            "متغیرهای NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را تنظیم کنید",
          ],
        }
      case "Database tables not found":
        return {
          title: "ایجاد جداول پایگاه داده",
          description: "جداول پایگاه داده ایجاد نشده‌اند",
          steps: [
            "به SQL Editor در Supabase بروید",
            "اسکریپت setup-enhanced-database.sql را اجرا کنید",
            "جداول users، locations، user_location_history و server_logs ایجاد خواهند شد",
          ],
        }
      case "Database error":
        return {
          title: "خطای پایگاه داده",
          description: "خطا در اتصال یا اجرای کوئری",
          steps: [
            "اتصال اینترنت خود را بررسی کنید",
            "تنظیمات Supabase را مجدداً بررسی کنید",
            "وضعیت سرویس Supabase را چک کنید",
          ],
        }
      default:
        return {
          title: "حالت نمایشی",
          description: "از داده‌های نمونه استفاده می‌شود",
          steps: [
            "برای استفاده از پایگاه داده واقعی، Supabase را پیکربندی کنید",
            "جداول مورد نیاز را ایجاد کنید",
            "صفحه را مجدداً بارگذاری کنید",
          ],
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>در حال بارگذاری داشبورد...</span>
        </div>
      </div>
    )
  }

  const setupInfo = getSetupInstructions()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Mock Data Warning */}
        {usingMockData && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-2">
                <div>
                  <strong>{setupInfo.title}:</strong> {setupInfo.description}
                </div>
                <div className="text-sm">
                  <strong>مراحل راه‌اندازی:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    {setupInfo.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" asChild>
                    <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Supabase
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={loadData}>
                    <RefreshCw className="h-3 w-3" />
                    تلاش مجدد
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 داشبورد مدیریت پیشرفته</h1>
            <p className="text-gray-600">مدیریت کاربران، مکان‌ها و ردیابی موقعیت زنده</p>
          </div>
          <Button onClick={loadData} variant="outline" className="gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            به‌روزرسانی
          </Button>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">کل کاربران</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">{stats.active_users} کاربر فعال</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">کل مکان‌ها</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_locations}</div>
              <p className="text-xs text-muted-foreground">در {new Set(locations.map((l) => l.country)).size} کشور</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">موقعیت زنده</CardTitle>
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users_with_location}</div>
              <p className="text-xs text-muted-foreground">کاربر با موقعیت فعال</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">فعالیت‌ها</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_activities}</div>
              <p className="text-xs text-muted-foreground">
                امروز{" "}
                {activities.filter((a) => new Date(a.created_at).toDateString() === new Date().toDateString()).length}{" "}
                فعالیت
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">وضعیت سیستم</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${usingMockData ? "text-orange-600" : "text-green-600"}`}>
                {usingMockData ? "نمایشی" : "سالم"}
              </div>
              <p className="text-xs text-muted-foreground">{usingMockData ? "حالت نمایشی" : "متصل به پایگاه داده"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="جستجو در کاربران و مکان‌ها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                وضعیت ({statusFilter === "all" ? "همه" : statusFilter === "active" ? "فعال" : "غیرفعال"})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>همه کاربران</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>کاربران فعال</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>کاربران غیرفعال</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Shield className="h-4 w-4" />
                نقش (
                {roleFilter === "all"
                  ? "همه"
                  : roleFilter === "admin"
                    ? "مدیر کل"
                    : roleFilter === "manager"
                      ? "مدیر"
                      : "کاربر"}
                )
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setRoleFilter("all")}>همه نقش‌ها</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter("admin")}>مدیر کل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter("manager")}>مدیر</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter("user")}>کاربر</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              کاربران ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <Navigation className="h-4 w-4" />
              نقشه زنده ({stats.users_with_location})
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              مکان‌ها ({filteredLocations.length})
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-2">
              <Plus className="h-4 w-4" />
              فعالیت‌ها ({activities.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>مدیریت کاربران</CardTitle>
                  <Button
                    className="gap-2"
                    onClick={() => setUserDialog({ open: true, user: null })}
                    disabled={usingMockData}
                  >
                    <Plus className="h-4 w-4" />
                    کاربر جدید
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">شناسه</TableHead>
                        <TableHead>کاربر</TableHead>
                        <TableHead>تماس</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>نقش</TableHead>
                        <TableHead>مکان</TableHead>
                        <TableHead>موقعیت زنده</TableHead>
                        <TableHead>تاریخ ایجاد</TableHead>
                        <TableHead className="w-[100px]">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            {searchTerm || statusFilter !== "all" || roleFilter !== "all"
                              ? "کاربری با این فیلترها یافت نشد"
                              : "هیچ کاربری یافت نشد"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-mono text-sm">{user.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                                  <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  <span className="truncate max-w-[150px]">{user.email}</span>
                                </div>
                                {user.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span>{user.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.status === "active" ? "default" : "secondary"}>
                                {user.status === "active" ? "فعال" : "غیرفعال"}
                              </Badge>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>{getLocationName(user.location_id)}</TableCell>
                            <TableCell>
                              {user.is_location_enabled && user.current_latitude && user.current_longitude ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-green-600">آنلاین</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <span className="text-xs text-gray-500">آفلاین</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{new Date(user.created_at).toLocaleDateString("fa-IR")}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setUserDialog({ open: true, user })}
                                    disabled={usingMockData}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    ویرایش
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: "user",
                                        item: user,
                                      })
                                    }
                                    disabled={usingMockData}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <UserLocationMap users={users} locations={locations} onRefresh={loadData} />
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>مدیریت مکان‌ها</CardTitle>
                  <Button
                    className="gap-2"
                    onClick={() => setLocationDialog({ open: true, location: null })}
                    disabled={usingMockData}
                  >
                    <Plus className="h-4 w-4" />
                    مکان جدید
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">شناسه</TableHead>
                        <TableHead>نام</TableHead>
                        <TableHead>شهر</TableHead>
                        <TableHead>کشور</TableHead>
                        <TableHead>آدرس</TableHead>
                        <TableHead>مختصات</TableHead>
                        <TableHead>تاریخ ایجاد</TableHead>
                        <TableHead className="w-[100px]">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            {searchTerm ? "مکانی با این جستجو یافت نشد" : "هیچ مکانی یافت نشد"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLocations.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell className="font-mono text-sm">{location.id}</TableCell>
                            <TableCell className="font-medium">{location.name}</TableCell>
                            <TableCell>{location.city}</TableCell>
                            <TableCell>{location.country}</TableCell>
                            <TableCell className="max-w-xs truncate" title={location.address}>
                              {location.address}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {location.latitude && location.longitude
                                ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">
                                  {new Date(location.created_at).toLocaleDateString("fa-IR")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setLocationDialog({ open: true, location })}
                                    disabled={usingMockData}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    ویرایش
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: "location",
                                        item: location,
                                      })
                                    }
                                    disabled={usingMockData}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>فعالیت‌های سیستم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">شناسه</TableHead>
                        <TableHead>عملیات</TableHead>
                        <TableHead>جزئیات</TableHead>
                        <TableHead>کاربر</TableHead>
                        <TableHead>زمان</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            هیچ فعالیتی یافت نشد
                          </TableCell>
                        </TableRow>
                      ) : (
                        activities.slice(0, 100).map((activity) => {
                          const user = users.find((u) => u.id === activity.user_id)
                          return (
                            <TableRow key={activity.id}>
                              <TableCell className="font-mono text-sm">{activity.id}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{activity.action}</Badge>
                              </TableCell>
                              <TableCell className="max-w-md truncate" title={activity.details}>
                                {activity.details}
                              </TableCell>
                              <TableCell>
                                {user ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                                      <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{user.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">سیستم</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">
                                    {new Date(activity.created_at).toLocaleString("fa-IR")}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <EnhancedUserFormDialog
          open={userDialog.open}
          onOpenChange={(open) => setUserDialog({ open, user: null })}
          user={userDialog.user}
          locations={locations}
          onSuccess={loadData}
          disabled={usingMockData}
        />

        <LocationFormDialog
          open={locationDialog.open}
          onOpenChange={(open) => setLocationDialog({ open, location: null })}
          location={locationDialog.location}
          onSuccess={loadData}
          disabled={usingMockData}
        />

        <DeleteConfirmationDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, type: undefined, item: null })}
          title={`حذف ${deleteDialog.type === "user" ? "کاربر" : "مکان"}`}
          description={`آیا مطمئن هستید که می‌خواهید ${
            deleteDialog.type === "user"
              ? `کاربر "${(deleteDialog.item as User)?.name}"`
              : `مکان "${(deleteDialog.item as Location)?.name}"`
          } را حذف کنید؟ این عمل قابل بازگشت نیست.`}
          onConfirm={async () => {
            if (deleteDialog.type && deleteDialog.item) {
              await handleDelete(deleteDialog.type, deleteDialog.item.id)
            }
          }}
          disabled={usingMockData}
        />
      </div>
    </div>
  )
}
