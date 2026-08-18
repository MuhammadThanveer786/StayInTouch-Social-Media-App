import { Menu, X } from 'lucide-react'
import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const Layout = () => {

  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  return (

    <div className="w-full flex h-screen">

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 bg-slate-50">

        <Outlet />

      </div>


      {/* =====================================================
          MOBILE MENU BUTTON
      ===================================================== */}

      {sidebarOpen ? (

        <X
          className="
            absolute
            top-3
            right-3
            p-2
            z-100
            bg-white
            rounded-md
            shadow
            w-10
            h-10
            text-gray-600
            sm:hidden
          "
          onClick={() =>
            setSidebarOpen(false)
          }
        />

      ) : (

        <Menu
          className="
            absolute
            top-3
            right-3
            p-2
            z-100
            bg-white
            rounded-md
            shadow
            w-10
            h-10
            text-gray-600
            sm:hidden
          "
          onClick={() =>
            setSidebarOpen(true)
          }
        />

      )}

    </div>

  )

}

export default Layout
