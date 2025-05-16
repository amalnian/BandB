import BarberCard from "./components/BarberCard"
import Header from "./components/Header"
import Sidebar from "./components/sidebar"
// Import Image component - assuming you're using Next.js
// If you're using React Router with plain React, you should use standard img tags instead
import { useEffect } from "react"

export default function Home() {
  // Check if user is authenticated on component mount
  useEffect(() => {
    const userToken = localStorage.getItem("user_token")
    if (userToken) {
      console.log("User authenticated, displaying home page")
    } else {
      console.log("Warning: User accessed home without token")
    }
  }, [])

  // Sample barber data
  const barbers = [
    {
      id: 1,
      name: "James Wilson",
      location: "Downtown, 0.8 miles away",
      rating: 4.8,
      reviews: 124,
      price: "$25-45",
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 2,
      name: "Michael Thompson",
      location: "Westside, 1.2 miles away",
      rating: 4.9,
      reviews: 89,
      price: "$30-50",
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 3,
      name: "Robert Davis",
      location: "Northside, 1.5 miles away",
      rating: 4.7,
      reviews: 156,
      price: "$20-40",
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 4,
      name: "Daniel Martinez",
      location: "Eastside, 0.5 miles away",
      rating: 4.6,
      reviews: 112,
      price: "$25-45",
      image: "/placeholder.svg?height=300&width=300",
    },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - visible on desktop, hidden on mobile */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {/* Hero section */}
          <section className="bg-gradient-to-r from-amber-400 to-amber-500 relative">
            <div className="container mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 z-10">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                  Find the Best
                  <br />
                  Barbers Near You!
                </h1>
                <button className="mt-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-md transition">
                  Find Now !
                </button>
              </div>
              <div className="md:w-1/2 mt-8 md:mt-0 relative">
                <div
                  className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-20"
                  style={{ backgroundImage: "url('/placeholder.svg?height=400&width=400')" }}
                ></div>
                {/* Check if you're using Next.js or regular React */}
                {/* For Next.js */}
                {/* <Image
                  src="/placeholder.svg?height=500&width=400"
                  alt="Barber with phone"
                  width={500}
                  height={400}
                  className="relative z-10"
                /> */}
                
                {/* For regular React without Next.js Image component */}
                <img
                  src="/placeholder.svg?height=500&width=400"
                  alt="Barber with phone"
                  className="relative z-10 w-full max-w-md mx-auto"
                />
              </div>
            </div>
          </section>

          {/* Barbers section */}
          <section className="py-12 px-4">
            <div className="container mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">Popular Barbers Near You !</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {barbers.map((barber) => (
                  <BarberCard key={barber.id} barber={barber} />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}