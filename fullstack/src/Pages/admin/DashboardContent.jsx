import { useState, useEffect } from "react"
import { 
  Users, 
  Calendar, 
  Scissors, 
  ShoppingBag 
} from "lucide-react"

export default function DashboardContent() {
  const [dashboardStats, setDashboardStats] = useState(null)
  const [recentAppointments, setRecentAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("access_token")
      
      try {
        // Fetch dashboard stats
        const statsResponse = await fetch("http://127.0.0.1:8000/api/admin/dashboard/stats/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setDashboardStats(statsData)
        }
        
        // Fetch recent appointments
        const appointmentsResponse = await fetch("http://127.0.0.1:8000/api/admin/dashboard/appointments/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json()
          setRecentAppointments(appointmentsData)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
        </div>
      </header>
      
      {/* Dashboard content */}
      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Stats cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-500">
                <Users size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Customers</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {dashboardStats ? dashboardStats.total_customers : "-"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-500">
                <Calendar size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Appointments Today</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {dashboardStats ? dashboardStats.appointments_today : "-"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-500">
                <Scissors size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Services</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {dashboardStats ? dashboardStats.services : "-"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-100 text-amber-500">
                <ShoppingBag size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Products</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {dashboardStats ? dashboardStats.products : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent appointments */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Recent Appointments</h3>
          </div>
          <div className="p-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentAppointments.length > 0 ? (
                  recentAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.service}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          appointment.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No recent appointments
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}