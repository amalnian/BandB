import React from 'react';
import { 
  FaCalendarCheck, 
  FaMoneyBillWave, 
  FaUserFriends, 
  FaShoppingBag,
  FaCalendarAlt,
  FaUsers,
  FaChartLine,
  FaClipboardList,
  FaTimes,
  FaBell
} from 'react-icons/fa';

const DashboardContent = ({ displayStats, displayAppointments, displayNotifications, navigateToSection }) => {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{displayStats.appointments_today}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <FaCalendarCheck />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigateToSection("appointments")}
              className="text-sm text-blue-600 hover:underline"
            >
              View all appointments
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">${displayStats.total_sales}</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <FaMoneyBillWave />
            </div>
          </div>
          <div className="mt-4">
            <button className="text-sm text-blue-600 hover:underline">View sales history</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{displayStats.total_customers}</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <FaUserFriends />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigateToSection("customers")}
              className="text-sm text-blue-600 hover:underline"
            >
              View customers
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Services</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{displayStats.products}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <FaShoppingBag />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigateToSection("services")}
              className="text-sm text-blue-600 hover:underline"
            >
              Manage services
            </button>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="py-4 px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Recent Appointments</h3>
            <button 
              onClick={() => navigateToSection("appointments")}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
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
                {displayAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-900">{appointment.customer_name}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{appointment.service}</td>
                    <td className="py-3 px-2 text-gray-700">{appointment.time}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : appointment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <FaClipboardList />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800">
                          <FaTimes />
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
        <div className="bg-white rounded-lg shadow">
          <div className="py-4 px-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
          </div>
          <div className="p-4">
            <ul className="divide-y divide-gray-200">
              {displayNotifications.map((notification) => (
                <li key={notification.id} className={`py-3 px-2 ${!notification.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-200 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                      <FaBell className="text-sm" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {displayNotifications.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <p>No notifications at this time</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="py-4 px-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200"
                onClick={() => navigateToSection("appointments")}
              >
                <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-2">
                  <FaCalendarAlt />
                </div>
                <span className="text-sm font-medium">Add Appointment</span>
              </button>
              
              <button 
                className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition duration-200"
                onClick={() => navigateToSection("customers")}
              >
                <div className="p-3 bg-green-100 rounded-full text-green-600 mb-2">
                  <FaUsers />
                </div>
                <span className="text-sm font-medium">Add Customer</span>
              </button>
              
              <button 
                className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition duration-200"
                onClick={() => navigateToSection("services")}
              >
                <div className="p-3 bg-amber-100 rounded-full text-amber-600 mb-2">
                  <FaShoppingBag />
                </div>
                <span className="text-sm font-medium">Add Service</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition duration-200">
                <div className="p-3 bg-purple-100 rounded-full text-purple-600 mb-2">
                  <FaChartLine />
                </div>
                <span className="text-sm font-medium">View Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardContent;