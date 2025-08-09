"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GoogleAuth } from "@/components/google-auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle } from "lucide-react"

interface AuthUser {
  id: number
  name: string
  email: string
  avatar_url?: string
  google_id?: string
  auth_provider: string
  role: string
  status: string
}

export default function AuthPage() {
  const [authMessage, setAuthMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const router = useRouter()

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthMessage({
      type: "success",
      message: `خوش آمدید ${user.name}! در حال انتقال به داشبورد...`,
    })

    // Store user info in localStorage for demo purposes
    localStorage.setItem("currentUser", JSON.stringify(user))

    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push("/dashboard")
    }, 2000)
  }

  const handleAuthError = (error: string) => {
    setAuthMessage({
      type: "error",
      message: error,
    })

    // Clear error message after 5 seconds
    setTimeout(() => {
      setAuthMessage(null)
    }, 5000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success/Error Messages */}
      {authMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert
            className={authMessage.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}
          >
            {authMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={authMessage.type === "success" ? "text-green-800" : "text-red-800"}>
              {authMessage.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Authentication Component */}
      <GoogleAuth onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} />
    </div>
  )
}
