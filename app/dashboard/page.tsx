"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, MapPin, Plus, Edit, Trash2, Search, RefreshCw, Clock, Database, AlertTriangle } from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  created_at: string
  status?: "active" | "inactive"
  location_id?: number
}

interface Location {
  id: number
  name: string
  address: string
  city: string
  country: string
  coordinates?: string
  created_at: string
}

interface UserData {
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
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [activities, setActivities] = useState<UserData[]>([])
  const [stats, setStats] = useState<Stats>({
    total_users: 0,
    total_locations: 0,
    total_activities: 0,
    active_users: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [usingMockData, setUsingMockData] = useState(false)

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
      if (statsData.success) setStats(statsData.data)

      // Check if using mock data
      setUsingMockData(usersData.mock || locationsData.mock || activitiesData.mock || statsData.mock)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (type: "user" | "location", id: number) => {
    if (!confirm(`آیا مطمئن هستید که می‌خواهید این ${type === "user" ? "کاربر" : "مکان"} را حذف کنید؟`)) {
      return
    }

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

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Mock Data Warning */}
        {usingMockData && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>حالت نمایشی:</strong> پایگاه داده Supabase پیکربندی نشده است. از داده‌های نمونه استفاده می‌شود. برای
              استفاده از پایگاه داده واقعی، متغیرهای محیطی Supabase را تنظیم کنید.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 داشبورد مدیریت</h1>
            <p className="text-gray-600">مدیریت کاربران، مکان‌ها و فعالیت‌ها</p>
          </div>
          <Button onClick={loadData} variant="outline" className="gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            به‌روزرسانی
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="text-2xl font-bold text-green-600">سالم</div>
              <p className="text-xs text-muted-foreground">{usingMockData ? "حالت نمایشی" : "متصل به پایگاه داده"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="جستجو در کاربران و مکان‌ها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              کاربران
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              مکان‌ها
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-2">
              <Plus className="h-4 w-4" />
              فعالیت‌ها
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>مدیریت کاربران</CardTitle>
                  <Button className="gap-2" disabled={usingMockData}>
                    <Plus className="h-4 w-4" />
                    کاربر جدید
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام</TableHead>
                      <TableHead>ایمیل</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>مکان</TableHead>
                      <TableHead>تاریخ ایجاد</TableHead>
                      <TableHead>عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status === "active" ? "فعال" : "غیرفعال"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.location_id
                            ? locations.find((l) => l.id === user.location_id)?.name || "نامشخص"
                            : "تعیین نشده"}
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString("fa-IR")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={usingMockData}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete("user", user.id)}
                              disabled={usingMockData}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>مدیریت مکان‌ها</CardTitle>
                  <Button className="gap-2" disabled={usingMockData}>
                    <Plus className="h-4 w-4" />
                    مکان جدید
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام</TableHead>
                      <TableHead>شهر</TableHead>
                      <TableHead>کشور</TableHead>
                      <TableHead>آدرس</TableHead>
                      <TableHead>تاریخ ایجاد</TableHead>
                      <TableHead>عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>{location.city}</TableCell>
                        <TableCell>{location.country}</TableCell>
                        <TableCell className="max-w-xs truncate">{location.address}</TableCell>
                        <TableCell>{new Date(location.created_at).toLocaleDateString("fa-IR")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={usingMockData}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete("location", location.id)}
                              disabled={usingMockData}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>عملیات</TableHead>
                      <TableHead>جزئیات</TableHead>
                      <TableHead>زمان</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.slice(0, 50).map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Badge variant="outline">{activity.action}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{activity.details}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {new Date(activity.created_at).toLocaleString("fa-IR")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
