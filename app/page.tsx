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
            <Link href="/dashboard">
              <Button className="gap-2">📊 داشبورد مدیریت</Button>
            </Link>
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
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">🧪 Test the API:</h3>
            <p className="text-gray-600 mb-4">برای تست API می‌توانید از curl یا Postman استفاده کنید:</p>
            <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl https://your-domain.vercel.app/api/users
curl -X POST https://your-domain.vercel.app/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"نام جدید","email":"test@example.com"}'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
