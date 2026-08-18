import React, { useEffect, useState } from 'react'
import { Eye, MessageSquare, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

const Messages = () => {

  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  // =========================================================
  // FETCH CONNECTIONS
  // =========================================================

  const fetchConnections = async () => {

    try {

      setLoading(true)
      setError('')

      // -----------------------------------------------------
      // Get authentication token
      // -----------------------------------------------------

      const token = await getToken()

      if (!token) {
        throw new Error(
          'Authentication session not found. Please sign in again.'
        )
      }


      // -----------------------------------------------------
      // API request
      // -----------------------------------------------------

      const response = await fetch(
        'http://localhost:4000/api/connections',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )


      // -----------------------------------------------------
      // Safely parse response
      // -----------------------------------------------------

      const contentType =
        response.headers.get('content-type') || ''

      let data = null

      if (contentType.includes('application/json')) {

        data = await response.json()

      } else {

        const responseText = await response.text()

        console.error(
          'Non-JSON response from connections API:',
          responseText
        )

        throw new Error(
          `Server returned an unexpected response (${response.status}).`
        )

      }


      // -----------------------------------------------------
      // Handle HTTP/API errors
      // -----------------------------------------------------

      if (!response.ok) {

        throw new Error(
          data?.message ||
          `Failed to fetch connections (${response.status})`
        )

      }


      if (!data?.success) {

        throw new Error(
          data?.message ||
          'Failed to fetch connections'
        )

      }


      // -----------------------------------------------------
      // Store connections
      // -----------------------------------------------------

      setConnections(
        Array.isArray(data.connections)
          ? data.connections
          : []
      )

    } catch (error) {

      console.error(
        'Error fetching connections:',
        error
      )

      // Clear old data when request fails
      setConnections([])

      // Show a user-friendly error
      setError(
        error?.message ||
        'Unable to load your connections. Please try again.'
      )

    } finally {

      setLoading(false)

    }

  }


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    fetchConnections()

  }, [])


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>

        <div className='flex flex-col items-center gap-3'>

          <div className='w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin' />

          <p className='text-sm text-slate-500'>
            Loading connections...
          </p>

        </div>

      </div>

    )

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className='min-h-screen relative bg-slate-50'>

      <div className='max-w-6xl mx-auto p-6'>

        {/* Title */}

        <div className='mb-8'>

          <h1 className='text-3xl font-bold text-slate-900 mb-2'>
            Messages
          </h1>

          <p className='text-slate-600'>
            Talk to your friends and family
          </p>

        </div>


        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (

          <div className='max-w-xl mb-6 p-5 bg-red-50 border border-red-200 rounded-md'>

            <p className='text-red-600 font-medium'>
              Unable to load connections
            </p>

            <p className='text-sm text-red-500 mt-1'>
              {error}
            </p>


            {/* Retry */}

            <button
              onClick={fetchConnections}
              className='
                mt-4
                px-4
                py-2
                flex
                items-center
                gap-2
                rounded-md
                bg-red-500
                hover:bg-red-600
                text-white
                text-sm
                transition
                active:scale-95
                cursor-pointer
              '
            >

              <RefreshCw className='w-4 h-4' />

              Try Again

            </button>

          </div>

        )}


        {/* =====================================================
            CONNECTED USERS
        ===================================================== */}

        {!error && (

          <div className='flex flex-col gap-3'>

            {connections.length === 0 ? (

              <div className='max-w-xl bg-white shadow rounded-md p-8 text-center'>

                <p className='text-slate-500'>
                  You don't have any connections yet.
                </p>

                <button
                  onClick={() => navigate('/connections')}
                  className='
                    mt-4
                    px-4
                    py-2
                    rounded-md
                    bg-gradient-to-r
                    from-indigo-500
                    to-purple-600
                    text-white
                    cursor-pointer
                    active:scale-95
                    transition
                  '
                >
                  Find Connections
                </button>

              </div>

            ) : (

              connections.map((user) => (

                <div
                  key={user._id}
                  className='max-w-xl flex items-center gap-5 p-6 bg-white shadow rounded-md'
                >

                  {/* Profile picture */}

                  <img
                    src={
                      user.profile_picture ||
                      '/default-avatar.png'
                    }
                    alt={user.full_name || 'User'}
                    className='rounded-full w-12 h-12 object-cover'
                  />


                  {/* User information */}

                  <div className='flex-1 min-w-0'>

                    <p className='font-medium text-slate-700'>
                      {user.full_name}
                    </p>

                    {user.username && (

                      <p className='text-slate-500'>
                        @{user.username}
                      </p>

                    )}

                    {user.bio && (

                      <p className='text-sm text-gray-600'>
                        {user.bio}
                      </p>

                    )}

                  </div>


                  {/* Buttons */}

                  <div className='flex flex-col gap-2 mt-4'>

                    {/* Message */}

                    <button
                      onClick={() =>
                        navigate(`/messages/${user._id}`)
                      }
                      className='size-10 flex items-center justify-center text-sm rounded bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95 transition cursor-pointer'
                    >

                      <MessageSquare className='w-4 h-4' />

                    </button>


                    {/* View Profile */}

                    <button
                      onClick={() =>
                        navigate(`/profile/${user._id}`)
                      }
                      className='size-10 flex items-center justify-center text-sm rounded bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95 transition cursor-pointer'
                    >

                      <Eye className='w-4 h-4' />

                    </button>

                  </div>

                </div>

              ))

            )}

          </div>

        )}

      </div>

    </div>

  )

}

export default Messages