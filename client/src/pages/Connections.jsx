import React, { useEffect, useState } from 'react'
import {
  Users,
  UserCheck,
  UserRoundPen,
  MessageSquare,
  UserPlus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import Loading from '../components/Loading'

const Connections = () => {

  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [currentTab, setCurrentTab] = useState('Followers')

  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [pendingConnections, setPendingConnections] = useState([])
  const [connections, setConnections] = useState([])

  const [counts, setCounts] = useState({
    followers: 0,
    following: 0,
    pending: 0,
    connections: 0
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch connections
  const fetchConnections = async () => {
    try {
      setLoading(true)
      setError('')

      const token = await getToken()

      const response = await fetch(
        'https://stayintouch-server.onrender.com/api/connections',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to fetch connections'
        )
      }

      setFollowers(data.followers || [])
      setFollowing(data.following || [])
      setPendingConnections(data.pending || [])
      setConnections(data.connections || [])

      setCounts({
        followers: data.counts?.followers || 0,
        following: data.counts?.following || 0,
        pending: data.counts?.pending || 0,
        connections: data.counts?.connections || 0
      })

    } catch (error) {
      console.error('Error fetching connections:', error)
      setError('Failed to load connections')
    } finally {
      setLoading(false)
    }
  }





  const acceptConnection = async (senderId) => {
    try {
      const token = await getToken()

      const response = await fetch(
        `https://stayintouch-server.onrender.com/api/connections/${senderId}/accept`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to accept connection request'
        )
      }

      // Refresh all connection data
      await fetchConnections()

      // Move to Connections tab after accepting
      setCurrentTab('Connections')

    } catch (error) {
      console.error(
        'Error accepting connection request:',
        error
      )

      setError(
        error.message || 'Failed to accept connection request'
      )
    }
  }







  useEffect(() => {
    fetchConnections()
  }, [])

  const dataArray = [
    {
      label: 'Followers',
      value: followers,
      count: counts.followers,
      icon: Users
    },
    {
      label: 'Following',
      value: following,
      count: counts.following,
      icon: UserCheck
    },
    {
      label: 'Pending',
      value: pendingConnections,
      count: counts.pending,
      icon: UserRoundPen
    },
    {
      label: 'Connections',
      value: connections,
      count: counts.connections,
      icon: UserPlus
    }
  ]

  const currentData =
    dataArray.find(
      (item) => item.label === currentTab
    )?.value || []

  if (loading) {
    return <Loading height="80vh" />
  }

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="max-w-6xl mx-auto p-6">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Connections
          </h1>

          <p className="text-slate-600">
            Manage your network and discover new connections
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-600">
            {error}
          </div>
        )}

        {/* Counts */}
        <div className="mb-8 flex flex-wrap gap-6">

          {dataArray.map((item) => {

            const Icon = item.icon

            return (
              <button
                key={item.label}
                onClick={() => setCurrentTab(item.label)}
                className={`flex flex-col items-center justify-center gap-1 border h-20 w-40 border-gray-200 bg-white shadow rounded-md cursor-pointer transition hover:shadow-md ${currentTab === item.label
                    ? 'ring-2 ring-indigo-400'
                    : ''
                  }`}
              >

                <div className="flex items-center gap-2">

                  <Icon className="w-4 h-4 text-indigo-500" />

                  <b className="text-lg">
                    {item.count}
                  </b>

                </div>

                <p className="text-slate-600">
                  {item.label}
                </p>

              </button>
            )
          })}

        </div>

        {/* Tabs */}
        <div className="inline-flex flex-wrap items-center border border-gray-200 rounded-md p-1 bg-white shadow-sm">

          {dataArray.map((tab) => {

            const Icon = tab.icon

            return (
              <button
                key={tab.label}
                onClick={() => setCurrentTab(tab.label)}
                className={`
                  cursor-pointer
                  flex
                  items-center
                  px-3
                  py-2
                  text-sm
                  rounded-md
                  transition-colors
                  ${currentTab === tab.label
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-500 hover:text-black'
                  }
                `}
              >

                <Icon className="w-4 h-4" />

                <span className="ml-1">
                  {tab.label}
                </span>

                <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>

              </button>
            )
          })}

        </div>

        {/* Users */}
        <div className="flex flex-wrap gap-6 mt-6">

          {currentData.length === 0 ? (

            <div className="w-full bg-white border border-gray-200 shadow-sm rounded-md p-10 text-center">

              <p className="text-slate-500">
                No {currentTab.toLowerCase()} yet.
              </p>

            </div>

          ) : (

            currentData.map((user) => (

              <div
                key={user._id}
                className="w-full max-w-md flex gap-5 p-6 bg-white shadow rounded-md"
              >

                {/* Profile picture */}
                <img
                  src={
                    user.profile_picture ||
                    '/default-avatar.png'
                  }
                  alt={user.full_name}
                  className="rounded-full w-14 h-14 object-cover shadow-md"
                />

                {/* User information */}
                <div className="flex-1 min-w-0">

                  <p className="font-medium text-slate-700">
                    {user.full_name}
                  </p>

                  {user.username && (
                    <p className="text-sm text-gray-500">
                      @{user.username}
                    </p>
                  )}

                  {user.bio && (
                    <p className="text-sm text-gray-600 mt-1">
                      {user.bio.slice(0, 50)}
                      {user.bio.length > 50 ? '...' : ''}
                    </p>
                  )}

                  {user.location && (
                    <p className="text-xs text-gray-500 mt-1">
                      {user.location}
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">

                    {/* View Profile */}
                    <button
                      onClick={() =>
                        navigate(`/profile/${user._id}`)
                      }
                      className="p-2 text-sm rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition text-white cursor-pointer"
                    >
                      View Profile
                    </button>

                    {/* Following */}
                    {currentTab === 'Following' && (
                      <button
                        className="p-2 text-sm rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition cursor-pointer"
                      >
                        Unfollow
                      </button>
                    )}

                    {/* Pending */}
                    {currentTab === 'Pending' && (
                      <button
                        onClick={() => acceptConnection(user._id)}
                        className="p-2 text-sm rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white active:scale-95 transition cursor-pointer"
                      >
                        Accept
                      </button>
                    )}

                    {/* Connection */}
                    {currentTab === 'Connections' && (
                      <button
                        onClick={() =>
                          navigate(`/messages/${user._id}`)
                        }
                        className="p-2 text-sm rounded bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </button>
                    )}

                  </div>

                </div>

              </div>

            ))
          )}

        </div>

      </div>

    </div>
  )
}

export default Connections
