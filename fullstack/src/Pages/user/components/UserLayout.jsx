import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"

export default function UserLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - always visible */}
      <Sidebar />
      
      {/* Main content area - renders the nested route components */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}