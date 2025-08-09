import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">🚀 Simple Server on Vercel</h1>
              <p className="text-center text-gray-600 mb-8">سرور با موفقیت روی Vercel راه‌اندازی شده است!</p>
            </div>
            <div className="flex gap-4">
              <Link href="/auth">
                <Button className="gap-2">🔐 ورود / ثبت‌نام</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2 bg-transparent">
                  📊 داشبورد مدیریت
                </Button>
              </Link>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">📋 Available Endpoints:</h2>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">GET</span>
              <strong className="ml-2">/</strong> - صفحه اصلی
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">GET</span>
              <strong className="ml-2">/api/users</strong> - دریافت لیست کاربران
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <span className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-medium">POST</span>
              <strong className="ml-2">/api/users</strong> - ایجاد کاربر جدید
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">GET</span>
              <strong className="ml-2">/api/status</strong> - وضعیت سرور
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">GET</span>
              <strong className="ml-2">/api/time</strong> - زمان سرور
            </div>

            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">POST</span>
              <strong className="ml-2">/api/auth/google</strong> - احراز هویت گوگل
            </div>

            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">POST</span>
              <strong className="ml-2">/api/auth/login</strong> - ورود با ایمیل
            </div>

            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">POST</span>
              <strong className="ml-2">/api/auth/signup</strong> - ثبت‌نام با ایمیل
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">🔐 Google Authentication Features:</h3>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  ورود و ثبت‌نام با گوگل
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  ورود و ثبت‌نام با ایمیل و رمز عبور
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  مدیریت جلسات کاربری امن
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  ردیابی موقعیت مکانی در هنگام ورود
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  تشخیص خودکار نوع دستگاه
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  لاگ کامل فعالیت‌های کاربران
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">🧪 Test the Authentication:</h3>
            <p className="text-gray-600 mb-4">برای تست احراز هویت می‌توانید:</p>
            <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`# ورود با گوگل (نیاز به تنظیم Google OAuth)
# یا استفاده از حالت نمایشی

# ثبت‌نام با ایمیل
curl -X POST /api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "نام کاربر",
    "email": "user@example.com",
    "password": "password123",
    "phone": "09123456789"
  }'

# ورود با ایمیل
curl -X POST /api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
