"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Smartphone, Key, Copy, CheckCircle, AlertTriangle, Download, QrCode } from "lucide-react"

interface TwoFactorSetupProps {
  user: {
    id: number
    name: string
    email: string
    two_factor_enabled?: boolean
  }
  onSetupComplete: (backupCodes: string[]) => void
  onDisable: () => void
}

export function TwoFactorSetup({ user, onSetupComplete, onDisable }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user.two_factor_enabled) {
      generateTwoFactorSecret()
    }
  }, [user.two_factor_enabled])

  const generateTwoFactorSecret = async () => {
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      const result = await response.json()

      if (result.success) {
        setSecret(result.secret)
        setQrCode(result.qrCode)
      } else {
        setError(result.message || "خطا در تولید کد امنیتی")
      }
    } catch (error) {
      setError("خطا در ارتباط با سرور")
    }
  }

  const verifyTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("کد 6 رقمی وارد کنید")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          token: verificationCode,
          secret,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setBackupCodes(result.backupCodes)
        setStep("backup")
      } else {
        setError(result.message || "کد وارد شده صحیح نیست")
      }
    } catch (error) {
      setError("خطا در تأیید کد")
    } finally {
      setLoading(false)
    }
  }

  const disableTwoFactor = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      const result = await response.json()

      if (result.success) {
        onDisable()
      } else {
        setError(result.message || "خطا در غیرفعال‌سازی")
      }
    } catch (error) {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadBackupCodes = () => {
    const content = `کدهای پشتیبان احراز هویت دو مرحله‌ای
کاربر: ${user.name} (${user.email})
تاریخ: ${new Date().toLocaleDateString("fa-IR")}

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join("\n")}

نکات مهم:
- هر کد فقط یک بار قابل استفاده است
- این کدها را در مکان امنی نگهداری کنید
- در صورت از دست دادن دستگاه احراز هویت، از این کدها استفاده کنید`

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `backup-codes-${user.email}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (user.two_factor_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            احراز هویت دو مرحله‌ای
            <Badge className="bg-green-500">فعال</Badge>
          </CardTitle>
          <CardDescription>احراز هویت دو مرحله‌ای برای حساب شما فعال است</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              حساب شما با احراز هویت دو مرحله‌ای محافظت می‌شود. برای ورود به سیستم، علاوه بر رمز عبور، نیاز به کد احراز
              هویت دارید.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" onClick={generateTwoFactorSecret}>
              <QrCode className="h-4 w-4 mr-2" />
              تولید QR Code جدید
            </Button>
            <Button variant="destructive" onClick={disableTwoFactor} disabled={loading}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              غیرفعال‌سازی
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          راه‌اندازی احراز هویت دو مرحله‌ای
        </CardTitle>
        <CardDescription>امنیت حساب خود را با احراز هویت دو مرحله‌ای افزایش دهید</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup" disabled={step !== "setup"}>
              راه‌اندازی
            </TabsTrigger>
            <TabsTrigger value="verify" disabled={step !== "verify"}>
              تأیید
            </TabsTrigger>
            <TabsTrigger value="backup" disabled={step !== "backup"}>
              کدهای پشتیبان
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <Smartphone className="h-12 w-12 text-blue-600" />
              </div>

              <div>
                <h3 className="font-semibold mb-2">مرحله 1: نصب اپلیکیشن احراز هویت</h3>
                <p className="text-sm text-gray-600 mb-4">یکی از اپلیکیشن‌های زیر را روی گوشی خود نصب کنید:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">Google Authenticator</Badge>
                  <Badge variant="outline">Microsoft Authenticator</Badge>
                  <Badge variant="outline">Authy</Badge>
                  <Badge variant="outline">1Password</Badge>
                </div>
              </div>

              {qrCode && (
                <div className="space-y-4">
                  <h3 className="font-semibold">مرحله 2: اسکن QR Code</h3>
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      {/* QR Code would be displayed here */}
                      <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded">
                        <QrCode className="h-16 w-16 text-gray-400" />
                        <div className="absolute text-xs text-gray-500 mt-20">QR Code</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>یا کد زیر را دستی وارد کنید:</Label>
                    <div className="flex items-center gap-2">
                      <Input value={secret} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(secret)}>
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={() => setStep("verify")} className="w-full">
                ادامه به تأیید
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-6">
            <div className="text-center space-y-4">
              <Key className="h-12 w-12 text-green-600 mx-auto" />

              <div>
                <h3 className="font-semibold mb-2">مرحله 3: تأیید راه‌اندازی</h3>
                <p className="text-sm text-gray-600">کد 6 رقمی نمایش داده شده در اپلیکیشن احراز هویت را وارد کنید</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification">کد تأیید</Label>
                  <Input
                    id="verification"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                </div>

                <Button
                  onClick={verifyTwoFactor}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      در حال تأیید...
                    </>
                  ) : (
                    "تأیید و فعال‌سازی"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />

              <div>
                <h3 className="font-semibold text-green-600 mb-2">احراز هویت دو مرحله‌ای فعال شد!</h3>
                <p className="text-sm text-gray-600">کدهای پشتیبان زیر را در مکان امنی نگهداری کنید</p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  این کدها فقط یک بار قابل استفاده هستند و در صورت از دست دادن دستگاه احراز هویت، برای ورود به حساب
                  استفاده می‌شوند.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span>{code}</span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadBackupCodes} className="flex-1 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  دانلود کدها
                </Button>
                <Button onClick={() => onSetupComplete(backupCodes)} className="flex-1">
                  تکمیل راه‌اندازی
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
