import React, { useState, useEffect } from 'react';
// Using Lucide React icons (available in Claude environment)
import { 
  CalendarCheck, 
  DollarSign, 
  Users, 
  ShoppingBag,
  Calendar,
  TrendingUp,
  ClipboardList,
  X,
  Bell,
  Eye,
  Edit
} from 'lucide-react';

const DemoShopDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('dashboard');

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock data
  const mockStats = {
    appointments_today: 12,
    total_sales: 85420,
    total_customers: 247,
    products: 18
  };

  const mockAppointments = [
    {
      id: 1,
      customer_name: "Rajesh Kumar",
      service: "Hair Cut & Styling",
      time: "2:30 PM",
      status: "confirmed"
    },
    {
      id: 2,
      customer_name: "Priya Sharma",
      service: "Facial Treatment",
      time: "3:15 PM",
      status: "completed"
    },
    {
      id: 3,
      customer_name: "Amit Patel",
      service: "Beard Trimming",
      time: "4:00 PM",
      status: "pending"
    },
    {
      id: 4,
      customer_name: "Sneha Reddy",
      service: "Manicure & Pedicure",
      time: "4:45 PM",
      status: "confirmed"
    },
    {
      id: 5,
      customer_name: "Vikram Singh",
      service: "Hair Wash & Cut",
      time: "5:30 PM",
      status: "pending"
    }
  ];

  const mockNotifications = [
    {
      id: 1,
      message: "New appointment booked by Rajesh Kumar for tomorrow",
      time: "2 hours ago",
      read: false
    },
    {
      id: 2,
      message: "Payment received for booking #123 - ₹1,500",
      time: "5 hours ago",
      read: true
    },
    {
      id: 3,
      message: "Reminder: Staff meeting at 6 PM today",
      time: "1 day ago",
      read: false
    },
    {
      id: 4,
      message: "Customer review: 5 stars from Priya Sharma",
      time: "2 days ago",
      read: true
    }
  ];

  const navigateToSection = (section) => {
    setSelectedSection(section);
    // In a real app, this would use React Router
    console.log(`Navigating to: ${section}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shop Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's what's happening at your shop today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{mockStats.appointments_today}</h3>
                <p className="text-xs text-green-600 mt-1">↑ 12% from yesterday</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => navigateToSection("appointments")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all appointments →
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{mockStats.total_sales.toLocaleString()}</h3>
                <p className="text-xs text-green-600 mt-1">↑ 8% from last month</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => navigateToSection("sales")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View sales history →
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Customers</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{mockStats.total_customers}</h3>
                <p className="text-xs text-green-600 mt-1">↑ 15% this month</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => navigateToSection("customers")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View customers →
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Services</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{mockStats.products}</h3>
                <p className="text-xs text-blue-600 mt-1">3 new this week</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => navigateToSection("services")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Manage services →
              </button>
            </div>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
              <button 
                onClick={() => navigateToSection("appointments")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 px-2">Customer</th>
                    <th className="pb-3 px-2">Service</th>
                    <th className="pb-3 px-2">Time</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-gray-600">
                              {appointment.customer_name.charAt(0)}
                            </span>
                          </div>
                          <div className="font-medium text-gray-900">{appointment.customer_name}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-700">{appointment.service}</td>
                      <td className="py-3 px-2 text-gray-700 font-medium">{appointment.time}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          appointment.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : appointment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 p-1">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800 p-1">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-800 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {mockNotifications.map((notification) => (
                  <div key={notification.id} className={`p-3 rounded-lg border ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-start">
                      <div className={`p-2 rounded-full mr-3 ${!notification.read ? 'bg-blue-200 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
                  onClick={() => navigateToSection("appointments")}
                >
                  <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-2">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Add Appointment</span>
                </button>
                
                <button 
                  className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200 border border-green-200"
                  onClick={() => navigateToSection("customers")}
                >
                  <div className="p-3 bg-green-100 rounded-full text-green-600 mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Add Customer</span>
                </button>
                
                <button 
                  className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors duration-200 border border-amber-200"
                  onClick={() => navigateToSection("services")}
                >
                  <div className="p-3 bg-amber-100 rounded-full text-amber-600 mb-2">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Add Service</span>
                </button>
                
                <button 
                  className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200 border border-purple-200"
                  onClick={() => navigateToSection("reports")}
                >
                  <div className="p-3 bg-purple-100 rounded-full text-purple-600 mb-2">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">View Reports</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-blue-600 mr-3">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-blue-800">
                <strong>Demo Mode:</strong> This is a demonstration dashboard with mock data. 
                In a real application, this would connect to your backend APIs.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Selected section: <strong>{selectedSection}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoShopDashboard;