import React, { useEffect, useRef, useState } from 'react'
import { ImageIcon, SendHorizonal, X } from 'lucide-react'
import { upload } from '@imagekit/javascript'
import { useAuth } from '@clerk/clerk-react'
import { useParams } from 'react-router-dom'

const ChatBox = () => {

  const { userId } = useParams()
  const { getToken, userId: currentUserId } = useAuth()

  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [error, setError] = useState('')

  const messagesEndRef = useRef(null)


  // =========================================================
  // FETCH SELECTED USER
  // =========================================================

  const fetchUser = async () => {

    try {

      const token = await getToken()

      const response = await fetch(
        `https://stayintouch-server.onrender.com/api/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to fetch user'
        )
      }

      setUser(data.user)

    } catch (error) {

      console.error(
        'Error fetching chat user:',
        error
      )

      setError(
        error.message || 'Failed to load user'
      )

    }

  }


  // =========================================================
  // FETCH MESSAGES
  // =========================================================

  const fetchMessages = async () => {

    try {

      const token = await getToken()

      const response = await fetch(
        `https://stayintouch-server.onrender.com/api/messages/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to fetch messages'
        )
      }

      setMessages(data.messages || [])

    } catch (error) {

      console.error(
        'Error fetching messages:',
        error
      )

      setError(
        error.message || 'Failed to load messages'
      )

    }

  }




  const markMessagesAsRead = async () => {

    try {

      const token = await getToken()

      const response = await fetch(
        `https://stayintouch-server.onrender.com/api/messages/${userId}/read`,
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
          data.message || 'Failed to mark messages as read'
        )
      }


      // Tell Sidebar to refresh unread message count immediately
      window.dispatchEvent(
        new Event('messages-read')
      )

    } catch (error) {

      console.error(
        'Error marking messages as read:',
        error
      )

    }

  }








  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    if (!userId) {
      return
    }

    const loadChat = async () => {

      setLoading(true)
      setError('')

      await Promise.all([
        fetchUser(),
        fetchMessages(),
        markMessagesAsRead()
      ])

      setLoading(false)

    }

    loadChat()

  }, [userId])


  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    })

  }, [messages])




  // =========================================================
  // UPLOAD ONE IMAGE TO IMAGEKIT
  // =========================================================

  const uploadImage = async (file) => {

    try {

      const token = await getToken()

      // Get secure ImageKit upload credentials
      const authResponse = await fetch(
        'https://stayintouch-server.onrender.com/api/imagekit/auth',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const authData = await authResponse.json()

      if (!authResponse.ok || !authData.success) {
        throw new Error(
          authData.message ||
          'Failed to authenticate ImageKit upload'
        )
      }

      // Upload image directly to ImageKit
      const uploadResponse = await upload({
        file: file,
        fileName: file.name,

        token: authData.token,
        signature: authData.signature,
        expire: authData.expire,
        publicKey: authData.publicKey,

        folder: '/stay-in-touch/messages',

        useUniqueFileName: true,
      })

      console.log(
        'Chat image uploaded successfully:',
        uploadResponse
      )

      return uploadResponse.url

    } catch (error) {

      console.error(
        'Chat image upload error:',
        error
      )

      throw error

    }
  }










  // =========================================================
  // SEND TEXT OR IMAGE MESSAGE
  // =========================================================

  const sendMessage = async () => {

    // Don't send while another message is being sent
    if (sending) {
      return
    }

    // Don't send if there is neither text nor image
    if (!text.trim() && !image) {
      return
    }

    try {

      setSending(true)
      setError('')

      const token = await getToken()

      // =====================================================
      // IMAGE MESSAGE
      // =====================================================

      if (image) {

        // Upload image first
        const imageUrl = await uploadImage(image)

        const response = await fetch(
          'https://stayintouch-server.onrender.com/api/messages',
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              to_user_id: userId,
              text: '',
              message_type: 'image',
              media_url: imageUrl,
            }),
          }
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
            'Failed to send image message'
          )
        }

        // Add image message immediately
        setMessages((previousMessages) => [
          ...previousMessages,
          data.message
        ])

        window.dispatchEvent(
  new Event("messages-updated")
)

        // Clear image
        setImage(null)

        // Clear text as well
        setText('')

        return
      }


      // =====================================================
      // TEXT MESSAGE
      // =====================================================

      const trimmedText = text.trim()

      const response = await fetch(
        'https://stayintouch-server.onrender.com/api/messages',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            to_user_id: userId,
            text: trimmedText,
            message_type: 'text',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          'Failed to send message'
        )
      }

      // Add text message immediately
      setMessages((previousMessages) => [
        ...previousMessages,
        data.message
      ])

      // Clear text
      setText('')

    } catch (error) {

      console.error(
        'Error sending message:',
        error
      )

      setError(
        error.message ||
        'Failed to send message'
      )

    } finally {

      setSending(false)

    }

  }


  // =========================================================
  // ENTER KEY
  // =========================================================

  const handleKeyDown = (e) => {

    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {

      e.preventDefault()

      sendMessage()

    }

  }


  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {

    return (
      <div className='flex items-center justify-center h-screen'>

        <div className='w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin' />

      </div>
    )

  }


  // =========================================================
  // ERROR STATE
  // =========================================================

  if (error && !user) {

    return (
      <div className='flex items-center justify-center h-screen px-4'>

        <div className='text-center'>

          <p className='text-red-500 font-medium'>
            {error}
          </p>

          <p className='text-gray-500 text-sm mt-2'>
            Unable to load this conversation.
          </p>

        </div>

      </div>
    )

  }


  // =========================================================
  // CHAT UI
  // =========================================================

  return user && (

    <div className='flex flex-col h-screen'>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className='flex items-center gap-2 p-2 md:px-10 xl:pl-42 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-300'>

        <img
          src={user.profile_picture}
          alt=''
          className='size-8 rounded-full object-cover'
        />

        <div>

          <p className='font-medium'>
            {user.full_name}
          </p>

          <p className='text-sm text-gray-500 -mt-1.5'>
            @{user.username}
          </p>

        </div>

      </div>


      {/* =====================================================
          MESSAGES
      ===================================================== */}

      <div className='p-5 md:px-10 h-full overflow-y-scroll'>

        <div className='space-y-4 max-w-4xl mx-auto'>

          {messages.length === 0 ? (

            <div className='h-full min-h-100 flex items-center justify-center'>

              <div className='text-center'>

                <p className='text-slate-600 font-medium'>
                  No messages yet
                </p>

                <p className='text-sm text-gray-400 mt-1'>
                  Send a message to start the conversation.
                </p>

              </div>

            </div>

          ) : (

            messages.map((message) => (



              <div
                key={message._id}
                className={`
                    flex flex-col
                    ${message.from_user_id?._id === currentUserId
                    ? 'items-end'
                    : 'items-start'
                  }
                `}
              >





                <div
                  className={`
                    p-2
                    text-sm
                    max-w-sm
                    bg-white
                    text-slate-700
                    rounded-lg
                    shadow

                   ${message.from_user_id?._id === currentUserId
                      ? 'rounded-br-none'
                      : 'rounded-bl-none'
                    }
                  `}
                >

                  {message.message_type === 'image' && (
                    <img
                      src={message.media_url}
                      alt=''
                      className='w-full max-w-sm rounded-lg mb-1'
                    />
                  )}

                  {message.text && (
                    <p>
                      {message.text}
                    </p>
                  )}

                </div>

              </div>

            ))

          )}

          <div ref={messagesEndRef} />

        </div>

      </div>


      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {error && (

        <div className='text-center text-xs text-red-500 px-4 mb-2'>
          {error}
        </div>

      )}


      {/* =====================================================
          MESSAGE INPUT
      ===================================================== */}

      <div className='px-4'>

        <div className='flex items-center gap-3 pl-5 p-1.5 bg-white w-full max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5'>

          <input
            type='text'
            className='flex-1 outline-none text-slate-700'
            placeholder='Type a message...'
            onKeyDown={handleKeyDown}
            onChange={(e) =>
              setText(e.target.value)
            }
            value={text}
            disabled={sending}
          />


          {/* Image */}

          <label
            htmlFor="chat-image"
            className="cursor-pointer flex items-center"
          >
            {
              image ? (

                <div className="relative">

                  <img
                    src={URL.createObjectURL(image)}
                    alt="Selected"
                    className="h-8 w-8 object-cover rounded"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setImage(null)
                    }}
                    className="
            absolute
            -top-2
            -right-2
            bg-red-500
            text-white
            rounded-full
            w-4
            h-4
            flex
            items-center
            justify-center
          "
                  >
                    <X className="w-3 h-3" />
                  </button>

                </div>

              ) : (

                <ImageIcon
                  className="size-7 text-gray-400 hover:text-gray-600"
                />

              )
            }

            <input
              type="file"
              id="chat-image"
              accept="image/*"
              hidden
              onChange={(e) => {

                const selectedFile = e.target.files?.[0]

                if (selectedFile) {
                  setImage(selectedFile)
                }

                // Allow selecting the same image again
                e.target.value = ''

              }}
            />

          </label>


          {/* Send */}

          <button
            onClick={sendMessage}
            disabled={(!text.trim() && !image) || sending}
            className={`
    size-10
    flex
    items-center
    justify-center
    rounded-full
    transition
    ${(!text.trim() && !image) || sending
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-400 to-purple-500 hover:from-indigo-500 hover:to-purple-600 cursor-pointer active:scale-95'
              }
  `}
          >
            <SendHorizonal className="w-5 h-5 text-white" />
          </button>

        </div>

      </div>

    </div>

  )

}

export default ChatBox
