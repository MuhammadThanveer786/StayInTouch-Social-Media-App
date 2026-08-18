import React, { useEffect, useState } from 'react'
import { MapPin, MessageCircle, Plus, UserPlus, Check } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

const UserCard = ({ user }) => {

  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [isFollowing, setIsFollowing] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const [followersCount, setFollowersCount] = useState(
    user.followers?.length || 0
  )

  const [loading, setLoading] = useState(false)
  const [connectionLoading, setConnectionLoading] = useState(false)


  // =========================================================
  // CHECK FOLLOWING + CONNECTION REQUEST STATUS
  // =========================================================

  useEffect(() => {

    const checkUserStatus = async () => {

      try {

        const token = await getToken()

        // ---------------------------------------------
        // Get current logged-in user
        // ---------------------------------------------

        const userResponse = await fetch(
          'http://localhost:4000/api/users/me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const userData = await userResponse.json()

        if (userResponse.ok && userData.success) {

          setIsFollowing(
            userData.user.following?.includes(user._id)
          )

        }


        // ---------------------------------------------
        // Get connection information
        // ---------------------------------------------

        const connectionResponse = await fetch(
          'http://localhost:4000/api/connections',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const connectionData = await connectionResponse.json()

        if (
          connectionResponse.ok &&
          connectionData.success
        ) {

          // The backend returns pending requests
          // received by the current user.
          //
          // For this UserCard, we mainly need to know
          // whether we already have a pending request
          // involving this user.

          const pendingUsers =
            connectionData.pending || []

          const isAlreadyPending = pendingUsers.some(
            pendingUser =>
              pendingUser._id === user._id
          )

          setIsPending(isAlreadyPending)

        }

      } catch (error) {

        console.error(
          'Error checking user connection status:',
          error
        )

      }

    }

    checkUserStatus()

  }, [user._id, getToken])


  // =========================================================
  // FOLLOW / UNFOLLOW
  // =========================================================

  const handleFollow = async () => {

    if (loading) return

    try {

      setLoading(true)

      const token = await getToken()

      const method = isFollowing
        ? 'DELETE'
        : 'POST'

      const response = await fetch(
        `http://localhost:4000/api/users/${user._id}/follow`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to update follow status'
        )

      }

      setIsFollowing(data.following)
      setFollowersCount(data.followersCount)

    } catch (error) {

      console.error(
        'Error following/unfollowing user:',
        error
      )

    } finally {

      setLoading(false)

    }

  }


  // =========================================================
  // SEND CONNECTION REQUEST
  // =========================================================

  const handleConnectionRequest = async () => {

    // If already following, open chat
    if (isFollowing) {

      navigate(`/messages/${user._id}`)
      return

    }

    // Don't send another request
    if (isPending || connectionLoading) {
      return
    }

    try {

      setConnectionLoading(true)

      const token = await getToken()

      const response = await fetch(
        `http://localhost:4000/api/connections/request/${user._id}`,
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to send connection request'
        )

      }

      // Request successfully sent
      setIsPending(true)

      console.log(
        'Connection request sent:',
        data
      )

    } catch (error) {

      console.error(
        'Error sending connection request:',
        error
      )

      alert(
        error.message ||
        'Failed to send connection request'
      )

    } finally {

      setConnectionLoading(false)

    }

  }


  return (

    <div
      className='p-4 pt-6 flex-col justify-between w-72 shadow border border-gray-200 rounded-md'
    >

      {/* =====================================================
          USER INFORMATION
      ====================================================== */}

      <div className='text-center'>

        <img
          src={user.profile_picture}
          alt=""
          className='rounded-full w-16 h-16 object-cover shadow-md mx-auto'
        />

        <p className='mt-4 font-semibold'>
          {user.full_name}
        </p>

        {user.username && (
          <p className='text-gray-500 font-light'>
            @{user.username}
          </p>
        )}

        {user.bio && (
          <p className='text-gray-600 mt-2 text-center text-sm px-4'>
            {user.bio}
          </p>
        )}

      </div>


      {/* =====================================================
          LOCATION + FOLLOWERS
      ====================================================== */}

      <div className='flex items-center justify-center gap-2 mt-4 text-xs text-gray-600'>

        <div className='flex items-center gap-1 border border-gray-300 rounded-full px-3 py-1'>

          <MapPin className='w-4 h-4' />

          {user.location || 'No location'}

        </div>


        <div className='flex items-center gap-1 border border-gray-300 rounded-full px-3 py-1'>

          <span>
            {followersCount}
          </span>

          Followers

        </div>

      </div>


      {/* =====================================================
          BUTTONS
      ====================================================== */}

      <div className='flex mt-4 gap-2'>


        {/* =================================================
            FOLLOW / UNFOLLOW
        ================================================== */}

        <button
          onClick={handleFollow}
          disabled={loading}
          className={`w-full py-2 rounded-md flex justify-center items-center gap-2
          bg-gradient-to-r from-indigo-500 to-purple-600
          hover:from-indigo-600 hover:to-purple-700
          active:scale-95 transition text-white
          ${
            loading
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer'
          }
          `}
        >

          <UserPlus className='w-4 h-4' />

          {loading
            ? 'Please wait...'
            : isFollowing
              ? 'Following'
              : 'Follow'
          }

        </button>


        {/* =================================================
            MESSAGE / CONNECTION REQUEST
        ================================================== */}

        <button
          onClick={handleConnectionRequest}
          disabled={connectionLoading || isPending}
          title={
            isFollowing
              ? 'Message'
              : isPending
                ? 'Connection request sent'
                : 'Send connection request'
          }
          className={`
            flex items-center justify-center
            w-16 border rounded-md
            text-slate-500 group
            active:scale-95 transition
            ${
              isPending
                ? 'bg-green-50 border-green-300 text-green-600 cursor-default'
                : 'cursor-pointer hover:bg-slate-50'
            }
          `}
        >

          {isFollowing ? (

            <MessageCircle
              className='w-5 h-5 group-hover:scale-105 transition'
            />

          ) : isPending ? (

            <Check
              className='w-5 h-5'
            />

          ) : (

            <Plus
              className='w-5 h-5 group-hover:scale-105 transition'
            />

          )}

        </button>

      </div>

    </div>

  )

}

export default UserCard