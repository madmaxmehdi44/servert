// Service Worker for background location tracking and push notifications

const CACHE_NAME = "location-tracker-v1"
const urlsToCache = ["/", "/dashboard", "/manifest.json"]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    }),
  )
})

// Background sync for location updates
self.addEventListener("sync", (event) => {
  if (event.tag === "background-location-sync") {
    event.waitUntil(syncLocationData())
  }
})

// Push notification handler
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "پیام جدید دریافت شد",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
    },
    actions: [
      {
        action: "explore",
        title: "مشاهده",
        icon: "/images/checkmark.png",
      },
      {
        action: "close",
        title: "بستن",
        icon: "/images/xmark.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("ردیاب موقعیت", options))
})

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "explore") {
    // Open the app
    event.waitUntil(clients.openWindow("/dashboard"))
  } else if (event.action === "close") {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(clients.openWindow("/"))
  }
})

// Background location tracking
async function syncLocationData() {
  try {
    // Get stored location data
    const locationData = await getStoredLocationData()

    if (locationData.length > 0) {
      // Send to server
      const response = await fetch("/api/location/batch-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations: locationData,
        }),
      })

      if (response.ok) {
        // Clear stored data after successful sync
        await clearStoredLocationData()
      }
    }
  } catch (error) {
    console.error("Background sync error:", error)
  }
}

// Get current position in background
function getCurrentPositionBackground() {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          })
        },
        (error) => reject(error),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      )
    } else {
      reject(new Error("Geolocation not supported"))
    }
  })
}

// Store location data locally
async function storeLocationData(locationData) {
  try {
    const db = await openDB()
    const transaction = db.transaction(["locations"], "readwrite")
    const store = transaction.objectStore("locations")
    await store.add(locationData)
  } catch (error) {
    console.error("Error storing location data:", error)
  }
}

// Get stored location data
async function getStoredLocationData() {
  try {
    const db = await openDB()
    const transaction = db.transaction(["locations"], "readonly")
    const store = transaction.objectStore("locations")
    return await store.getAll()
  } catch (error) {
    console.error("Error getting stored location data:", error)
    return []
  }
}

// Clear stored location data
async function clearStoredLocationData() {
  try {
    const db = await openDB()
    const transaction = db.transaction(["locations"], "readwrite")
    const store = transaction.objectStore("locations")
    await store.clear()
  } catch (error) {
    console.error("Error clearing stored location data:", error)
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("LocationTrackerDB", 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains("locations")) {
        const store = db.createObjectStore("locations", { keyPath: "id", autoIncrement: true })
        store.createIndex("timestamp", "timestamp", { unique: false })
      }
    }
  })
}

// Periodic background location tracking
setInterval(async () => {
  try {
    const position = await getCurrentPositionBackground()
    await storeLocationData({
      ...position,
      isBackground: true,
      batteryLevel: navigator.getBattery ? (await navigator.getBattery()).level * 100 : null,
    })

    // Register background sync
    if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register("background-location-sync")
    }
  } catch (error) {
    console.error("Background location tracking error:", error)
  }
}, 60000) // Every minute
