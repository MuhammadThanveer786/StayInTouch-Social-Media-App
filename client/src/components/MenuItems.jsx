import React from 'react'
import { NavLink } from 'react-router-dom'
import { menuItemsData } from '../assets/assets'

const MenuItems = ({
  setSidebarOpen,
  unreadMessageCount
}) => {

  return (

    <div className='px-6 text-gray-600 space-y-1 font-medium'>

      {
        menuItemsData.map(({ to, label, Icon }) => (

          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `px-3.5 py-2 flex items-center gap-3 rounded-xl ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-gray-50'
              }`
            }
          >

            <Icon className='w-5 h-5' />

            <span className='flex-1'>
              {label}
            </span>


            {/* Unread Messages Badge */}

            {label === 'Messages' &&
              unreadMessageCount > 0 && (

                <span
                  className='
                    min-w-5
                    h-5
                    px-1.5
                    rounded-full
                    bg-red-500
                    text-white
                    text-[10px]
                    font-bold
                    flex
                    items-center
                    justify-center
                  '
                >
                  {unreadMessageCount > 99
                    ? '99+'
                    : unreadMessageCount}
                </span>

              )}

          </NavLink>

        ))
      }

    </div>

  )
}

export default MenuItems