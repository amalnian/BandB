// "use client"

// import { useState, useEffect } from "react"
// import { useNavigate, Link } from "react-router-dom"
// import { 
//   Users, 
//   Calendar, 
//   Settings, 
//   LogOut, 
//   Menu, 
//   Home, 
//   Scissors, 
//   ShoppingBag 
// } from "lucide-react"

// export default function AdminDashboard() {
//   const [userData, setUserData] = useState(null)
//   const [dashboardStats, setDashboardStats] = useState(null)
//   const [recentAppointments, setRecentAppointments] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [sidebarOpen, setSidebarOpen] = useState(true)
//   const navigate = useNavigate()

//   useEffect(() => {
//     // Check if user is logged in and is admin
//     const checkAuthStatus = async () => {
//       const token = localStorage.getItem("access_token")
      
//       if (!token) {
//         navigate("/admin/login")
//         return
//       }
      
//       try {
//         // Check if user is admin
//         const response = await fetch("http://127.0.0.1:8000/api/admin/check/", {
//           headers: {
//             "Authorization": `Bearer ${token}`  // Changed from JWT to Bearer
//           }
//         })
        
//         if (!response.ok) {
//           throw new Error("Not authorized")
//         }
        
//         const data = await response.json()
//         setUserData(data)
        
//         // Fetch dashboard stats - update this header too
//         const statsResponse = await fetch("http://127.0.0.1:8000/api/admin/dashboard/stats/", {
//           headers: {
//             "Authorization": `Bearer ${token}`  // Changed from JWT to Bearer
//           }
//         })
        
//         if (statsResponse.ok) {
//           const statsData = await statsResponse.json()
//           setDashboardStats(statsData)
//         }
        
//         // Fetch recent appointments - update this header too
//         const appointmentsResponse = await fetch("http://127.0.0.1:8000/api/admin/dashboard/appointments/", {
//           headers: {
//             "Authorization": `Bearer ${token}`  // Changed from JWT to Bearer
//           }
//         })
        
//         if (appointmentsResponse.ok) {
//           const appointmentsData = await appointmentsResponse.json()
//           setRecentAppointments(appointmentsData)
//         }
//       } catch (error) {
//         console.error("Authentication error:", error)
//         navigate("/admin/login")
//       } finally {
//         setLoading(false)
//       }
//     }
    
//     checkAuthStatus()
//   }, [navigate])
  
//   const handleLogout = () => {
//     localStorage.removeItem("access_token")
//     localStorage.removeItem("refresh_token")
//     navigate("/admin/login")
//   }

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
//       </div>
//     )
//   }

//   return (
//     <div className="flex h-screen bg-gray-100">
//       {/* Sidebar */}
//       <div className={`bg-gray-900 text-white ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col`}>
//         {/* Logo area */}
//         <div className="flex items-center justify-between p-4 border-b border-gray-800">
//           {sidebarOpen && <h1 className="text-xl font-bold">Admin</h1>}
//           <button 
//             onClick={() => setSidebarOpen(!sidebarOpen)}
//             className="p-2 rounded-md hover:bg-gray-800"
//           >
//             <Menu size={20} />
//           </button>
//         </div>
        
//         {/* Navigation */}
//         <nav className="flex-1 p-4">
//           <ul className="space-y-2">
//             <li>
//               <Link to="/admin/dashboard" className="flex items-center p-2 rounded-md hover:bg-gray-800">
//                 <Home size={20} />
//                 {sidebarOpen && <span className="ml-3">Dashboard</span>}
//               </Link>
//             </li>
//             <li>
//               <Link to="/admin/users" className="flex items-center p-2 rounded-md hover:bg-gray-800">
//                 <Users size={20} />
//                 {sidebarOpen && <span className="ml-3">Users</span>}
//               </Link>
//             </li>
//             <li>
//               <Link to="/admin/shops" className="flex items-center p-2 rounded-md hover:bg-gray-800">
//                 <Calendar size={20} />
//                 {sidebarOpen && <span className="ml-3">Shops</span>}
//               </Link>
//             </li>
//             <li>
//               <Link to="/admin/requests" className="flex items-center p-2 rounded-md hover:bg-gray-800">
//                 <Scissors size={20} />
//                 {sidebarOpen && <span className="ml-3">Requests</span>}
//               </Link>
//             </li>
//             <li>
//               <Link to="/admin/products" className="flex items-center p-2 rounded-md hover:bg-gray-800">
//                 <ShoppingBag size={20} />
//                 {sidebarOpen && <span className="ml-3">Products</span>}
//               </Link>
//             </li>
//             <li>
//               <Link to="/admin/settings" className="flex items-center p-2 rounded-md hover:bg-gray-800">
//                 <Settings size={20} />
//                 {sidebarOpen && <span className="ml-3">Settings</span>}
//               </Link>
//             </li>
//           </ul>
//         </nav>
        
//         {/* Logout */}
//         <div className="p-4 border-t border-gray-800">
//           <button 
//             onClick={handleLogout}
//             className="flex items-center p-2 w-full rounded-md hover:bg-gray-800"
//           >
//             <LogOut size={20} />
//             {sidebarOpen && <span className="ml-3">Logout</span>}
//           </button>
//         </div>
//       </div>
      
//       {/* Main content */}
//       <div className="flex-1 overflow-auto">
//         {/* Header */}
//         <header className="bg-white shadow-sm">
//           <div className="px-6 py-4">
//             <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
//           </div>
//         </header>
        
//         {/* Dashboard content */}
//         <main className="p-6">
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
//             {/* Stats cards */}
//             <div className="bg-white rounded-lg shadow p-6">
//               <div className="flex items-center">
//                 <div className="p-3 rounded-full bg-blue-100 text-blue-500">
//                   <Users size={24} />
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-500">Total Customers</p>
//                   <p className="text-2xl font-semibold text-gray-800">
//                     {dashboardStats ? dashboardStats.total_customers : "-"}
//                   </p>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow p-6">
//               <div className="flex items-center">
//                 <div className="p-3 rounded-full bg-green-100 text-green-500">
//                   <Calendar size={24} />
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-500">Appointments Today</p>
//                   <p className="text-2xl font-semibold text-gray-800">
//                     {dashboardStats ? dashboardStats.appointments_today : "-"}
//                   </p>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow p-6">
//               <div className="flex items-center">
//                 <div className="p-3 rounded-full bg-purple-100 text-purple-500">
//                   <Scissors size={24} />
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-500">Services</p>
//                   <p className="text-2xl font-semibold text-gray-800">
//                     {dashboardStats ? dashboardStats.services : "-"}
//                   </p>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow p-6">
//               <div className="flex items-center">
//                 <div className="p-3 rounded-full bg-amber-100 text-amber-500">
//                   <ShoppingBag size={24} />
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-500">Products</p>
//                   <p className="text-2xl font-semibold text-gray-800">
//                     {dashboardStats ? dashboardStats.products : "-"}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           {/* Recent appointments */}
//           <div className="bg-white rounded-lg shadow mb-6">
//             <div className="p-6 border-b border-gray-200">
//               <h3 className="text-lg font-semibold text-gray-800">Recent Appointments</h3>
//             </div>
//             <div className="p-6">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead>
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {recentAppointments.length > 0 ? (
//                     recentAppointments.map((appointment) => (
//                       <tr key={appointment.id}>
//                         <td className="px-6 py-4 whitespace-nowrap">{appointment.customer_name}</td>
//                         <td className="px-6 py-4 whitespace-nowrap">{appointment.service}</td>
//                         <td className="px-6 py-4 whitespace-nowrap">{appointment.date}</td>
//                         <td className="px-6 py-4 whitespace-nowrap">{appointment.time}</td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className={`px-2 py-1 text-xs rounded-full ${
//                             appointment.status === 'confirmed' 
//                               ? 'bg-green-100 text-green-800' 
//                               : 'bg-yellow-100 text-yellow-800'
//                           }`}>
//                             {appointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
//                           </span>
//                         </td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
//                         No recent appointments
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </main>
//       </div>
//     </div>
//   )
// }