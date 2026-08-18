import React, { useEffect, useState } from 'react'
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  CheckCheck
} from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'

const Notifications = () => {

  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)


  // =========================================================
  // FETCH NOTIFICATIONS
  // =========================================================

  const fetchNotifications = async () => {

    try {

      const token = await getToken()

      const response = await fetch(
        'https://stayintouch-server.onrender.com/api/notifications',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to fetch notifications'
        )
      }

      setNotifications(data.notifications || [])

    } catch (error) {

      console.error(
        'Error fetching notifications:',
        error
      )

    } finally {

      setLoading(false)

    }

  }


  // =========================================================
  // FETCH UNREAD COUNT
  // =========================================================

  const fetchUnreadCount = async () => {

    try {

      const token = await getToken()

      const response = await fetch(
        'https://stayintouch-server.onrender.com/api/notifications/unread-count',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to fetch unread count'
        )
      }

      setUnreadCount(data.unreadCount || 0)

    } catch (error) {

      console.error(
        'Error fetching unread count:',
        error
      )

    }

  }


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    fetchNotifications()
    fetchUnreadCount()

  }, [])


  // =========================================================
  // MARK SINGLE NOTIFICATION AS READ
  // =========================================================

  const markAsRead = async (notification) => {

    // Already read
    if (notification.isRead) {
      return
    }

    try {

      const token = await getToken()

      const response = await fetch(
        `https://stayintouch-server.onrender.com/api/notifications/${notification._id}/read`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to mark notification as read'
        )
      }

      setNotifications((previousNotifications) =>
        previousNotifications.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                isRead: true
              }
            : item
        )
      )

      setUnreadCount(data.unreadCount)

    } catch (error) {

      console.error(
        'Error marking notification as read:',
        error
      )

    }

  }


  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  const markAllAsRead = async () => {

    if (unreadCount === 0) {
      return
    }

    try {

      setMarkingAll(true)

      const token = await getToken()

      const response = await fetch(
        'https://stayintouch-server.onrender.com/api/notifications/read-all',
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to mark notifications as read'
        )
      }

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) => ({
          ...notification,
          isRead: true
        }))
      )

      setUnreadCount(data.unreadCount || 0)

    } catch (error) {

      console.error(
        'Error marking all notifications as read:',
        error
      )

    } finally {

      setMarkingAll(false)

    }

  }


  // =========================================================
  // NOTIFICATION CLICK
  // =========================================================

  const handleNotificationClick = async (notification) => {

    await markAsRead(notification)

    if (notification.post) {

      const postId =
        typeof notification.post === 'object'
          ? notification.post._id
          : notification.post

      if (postId) {

        navigate(`/?post=${postId}`)

      }

    }

  }


  // =========================================================
  // NOTIFICATION ICON
  // =========================================================

  const getNotificationIcon = (type) => {

    if (type === 'like') {

      return (
        <div className='w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0'>
          <Heart
            className='w-5 h-5 text-red-500 fill-red-500'
          />
        </div>
      )

    }

    if (type === 'comment') {

      return (
        <div className='w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0'>
          <MessageCircle
            className='w-5 h-5 text-blue-500'
          />
        </div>
      )

    }

    if (type === 'follow') {

      return (
        <div className='w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center shrink-0'>
          <UserPlus
            className='w-5 h-5 text-purple-500'
          />
        </div>
      )

    }

    return (
      <div className='w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0'>
        <Bell className='w-5 h-5 text-gray-500' />
      </div>
    )

  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (
      <div className='h-full flex items-center justify-center'>

        <div className='w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin' />

      </div>
    )

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className='h-full overflow-y-auto no-scrollbar py-8 px-4 sm:px-6 lg:px-8'>

      <div className='max-w-4xl mx-auto'>

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className='flex items-center justify-between mb-6'>

          <div>

            <h1 className='text-3xl font-bold text-slate-900'>
              Notifications
            </h1>

            <p className='text-slate-500 mt-1'>
              Stay updated with your activity
            </p>

          </div>


          {unreadCount > 0 && (

            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className='
                flex
                items-center
                gap-2
                text-sm
                text-indigo-600
                hover:text-indigo-800
                font-medium
                cursor-pointer
                disabled:opacity-50
              '
            >

              <CheckCheck className='w-5 h-5' />

              {markingAll
                ? 'Marking...'
                : 'Mark all as read'}

            </button>

          )}

        </div>


        {/* =====================================================
            NOTIFICATION LIST
        ===================================================== */}

        <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>

          {notifications.length === 0 ? (

            <div className='py-20 px-6 text-center'>

              <div className='w-16 h-16 mx-auto rounded-full bg-indigo-50 flex items-center justify-center mb-4'>

                <Bell className='w-7 h-7 text-indigo-500' />

              </div>

              <h2 className='text-lg font-semibold text-slate-800'>
                No notifications
              </h2>

              <p className='text-sm text-gray-500 mt-1'>
                You're all caught up!
              </p>

            </div>

          ) : (

            notifications.map((notification) => (

              <button
                key={notification._id}
                onClick={() =>
                  handleNotificationClick(notification)
                }
                className={`
                  w-full
                  flex
                  items-start
                  gap-4
                  p-4
                  sm:p-5
                  text-left
                  border-b
                  border-gray-100
                  last:border-b-0
                  transition
                  cursor-pointer
                  hover:bg-gray-50
                  ${
                    !notification.isRead
                      ? 'bg-indigo-50/50'
                      : 'bg-white'
                  }
                `}
              >

                {/* Notification type */}

                {getNotificationIcon(
                  notification.type
                )}


                {/* Sender avatar */}

                <div className='relative shrink-0'>

                  <img
                    src={
                      notification.sender?.profile_picture ||
                      '/default-avatar.png'
                    }
                    alt=''
                    className='
                      w-11
                      h-11
                      rounded-full
                      object-cover
                      border
                      border-gray-100
                    '
                  />

                  {!notification.isRead && (

                    <span className='absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white' />

                  )}

                </div>


                {/* Content */}

                <div className='flex-1 min-w-0'>

                  <p className='text-sm sm:text-base text-slate-700 leading-6'>

                    <span className='font-semibold text-slate-900'>

                      {notification.sender?.full_name ||
                        'Someone'}

                    </span>{' '}

                    {notification.message ||
                      'sent you a notification'}

                  </p>


                  <p className='text-xs sm:text-sm text-gray-400 mt-1'>

                    {moment(
                      notification.createdAt
                    ).fromNow()}

                  </p>

                </div>


                {/* Unread indicator */}

                {!notification.isRead && (

                  <div className='shrink-0 mt-2'>

                    <span className='block w-2.5 h-2.5 bg-indigo-500 rounded-full' />

                  </div>

                )}

              </button>

            ))

          )}

        </div>

      </div>

    </div>

  )

}

export default Notifications
