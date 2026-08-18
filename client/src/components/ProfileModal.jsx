import React, { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import { upload } from '@imagekit/javascript'
import toast from 'react-hot-toast'

const ProfileModal = ({
  user,
  setUser,
  setShowEdit
}) => {

  const { getToken } = useAuth()

  const [editForm, setEditForm] = useState({

    username: user.username || "",

    bio: user.bio || "",

    location: user.location || "",

    profile_picture: null,

    cover_photo: null,

    full_name: user.full_name || "",

  })


  const [saving, setSaving] = useState(false)


  // =========================================================
  // UPLOAD IMAGE TO IMAGEKIT
  // =========================================================

  const uploadImage = async (file) => {

    try {

      const token = await getToken()


      if (!token) {
        throw new Error(
          'Authentication session not found'
        )
      }


      // Get secure ImageKit credentials

      const authResponse = await fetch(
        'http://localhost:4000/api/imagekit/auth',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )


      const contentType =
        authResponse.headers.get(
          'content-type'
        ) || ''


      if (
        !contentType.includes(
          'application/json'
        )
      ) {

        throw new Error(
          'ImageKit authentication returned an invalid response'
        )

      }


      const authData =
        await authResponse.json()


      if (
        !authResponse.ok ||
        !authData.success
      ) {

        throw new Error(
          authData.message ||
          'Failed to authenticate ImageKit upload'
        )

      }


      // Upload directly to ImageKit

      const uploadResponse = await upload({

        file,

        fileName: file.name,

        token: authData.token,

        signature: authData.signature,

        expire: authData.expire,

        publicKey: authData.publicKey,

        useUniqueFileName: true,

      })


      if (!uploadResponse?.url) {

        throw new Error(
          'ImageKit upload failed'
        )

      }


      console.log(
        'Profile image uploaded:',
        uploadResponse.url
      )


      return uploadResponse.url


    } catch (error) {

      console.error(
        'Profile image upload error:',
        error
      )

      throw error

    }

  }


  // =========================================================
  // SAVE PROFILE
  // =========================================================

  const handleSaveProfile = async (e) => {

    e.preventDefault()


    if (saving) {
      return
    }


    try {

      setSaving(true)


      const token = await getToken()


      if (!token) {

        throw new Error(
          'Authentication session not found'
        )

      }


      let profilePictureUrl =
        user.profile_picture || ""


      let coverPhotoUrl =
        user.cover_photo || ""


      // =====================================================
      // UPLOAD NEW PROFILE PICTURE
      // =====================================================

      if (editForm.profile_picture) {

        profilePictureUrl =
          await uploadImage(
            editForm.profile_picture
          )

      }


      // =====================================================
      // UPLOAD NEW COVER PHOTO
      // =====================================================

      if (editForm.cover_photo) {

        coverPhotoUrl =
          await uploadImage(
            editForm.cover_photo
          )

      }


      // =====================================================
      // UPDATE PROFILE
      // =====================================================

      const response = await fetch(
        'http://localhost:4000/api/users/profile',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({

            full_name:
              editForm.full_name,

            username:
              editForm.username,

            bio:
              editForm.bio,

            location:
              editForm.location,

            profile_picture:
              profilePictureUrl,

            cover_photo:
              coverPhotoUrl,

          }),

        }
      )


      const contentType =
        response.headers.get(
          'content-type'
        ) || ''


      if (
        !contentType.includes(
          'application/json'
        )
      ) {

        throw new Error(
          `Server returned an unexpected response (${response.status})`
        )

      }


      const data =
        await response.json()


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          'Failed to update profile'
        )

      }


      // =====================================================
      // UPDATE PROFILE IMMEDIATELY
      // =====================================================

      setUser(data.user)


      // =====================================================
      // NOTIFY SIDEBAR
      // =====================================================

      window.dispatchEvent(
        new CustomEvent(
          'profile-updated',
          {
            detail: data.user
          }
        )
      )


      // =====================================================
      // CLOSE MODAL
      // =====================================================

      setShowEdit(false)


      toast.success(
        'Profile updated successfully'
      )


    } catch (error) {

      console.error(
        'Error updating profile:',
        error
      )

      toast.error(
        error.message ||
        'Failed to update profile'
      )

    } finally {

      setSaving(false)

    }

  }


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div
      className='
        fixed
        top-0
        bottom-0
        left-0
        right-0
        z-110
        h-screen
        overflow-y-scroll
        bg-black/50
      '
    >

      <div className='max-w-2xl sm:py-6 mx-auto'>

        <div
          className='
            bg-white
            rounded-lg
            shadow
            p-6
          '
        >

          <h1
            className='
              text-2xl
              font-bold
              text-gray-900
              mb-6
            '
          >
            Edit Profile
          </h1>


          <form
            className='space-y-4'
            onSubmit={handleSaveProfile}
          >


            {/* =================================================
                PROFILE PICTURE
            ================================================= */}

            <div
              className='
                flex
                flex-col
                items-start
                gap-3
              '
            >

              <label
                htmlFor='profile_picture'
                className='
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                  cursor-pointer
                '
              >

                Profile Picture


                <input
                  hidden
                  type='file'
                  accept='image/*'
                  id='profile_picture'

                  onChange={(e) => {

                    const file =
                      e.target.files?.[0]

                    if (!file) {
                      return
                    }

                    setEditForm({
                      ...editForm,
                      profile_picture: file
                    })

                  }}
                />


                <div className='group/profile relative'>

                  <img
                    src={
                      editForm.profile_picture
                        ? URL.createObjectURL(
                            editForm.profile_picture
                          )
                        : user.profile_picture
                    }

                    alt=''

                    className='
                      w-24
                      h-24
                      rounded-full
                      object-cover
                      mt-2
                    '
                  />


                  <div
                    className='
                      absolute
                      hidden
                      group-hover/profile:flex
                      top-0
                      left-0
                      right-0
                      bottom-0
                      bg-black/20
                      rounded-full
                      items-center
                      justify-center
                    '
                  >

                    <Pencil
                      className='
                        w-5
                        h-5
                        text-white
                      '
                    />

                  </div>

                </div>

              </label>

            </div>


            {/* =================================================
                COVER PHOTO
            ================================================= */}

            <div
              className='
                flex
                flex-col
                items-start
                gap-3
              '
            >

              <label
                htmlFor='cover_photo'
                className='
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                  cursor-pointer
                '
              >

                Cover Photo


                <input
                  hidden
                  type='file'
                  accept='image/*'
                  id='cover_photo'

                  onChange={(e) => {

                    const file =
                      e.target.files?.[0]

                    if (!file) {
                      return
                    }

                    setEditForm({
                      ...editForm,
                      cover_photo: file
                    })

                  }}
                />


                <div className='group/cover relative'>

                  <img
                    src={
                      editForm.cover_photo
                        ? URL.createObjectURL(
                            editForm.cover_photo
                          )
                        : user.cover_photo
                    }

                    alt=''

                    className='
                      w-80
                      h-40
                      rounded-lg
                      bg-gradient-to-r
                      from-indigo-200
                      via-purple-200
                      to-pink-200
                      object-cover
                      mt-2
                    '
                  />


                  <div
                    className='
                      absolute
                      hidden
                      group-hover/cover:flex
                      top-0
                      left-0
                      right-0
                      bottom-0
                      bg-black/20
                      rounded-lg
                      items-center
                      justify-center
                    '
                  >

                    <Pencil
                      className='
                        w-5
                        h-5
                        text-white
                      '
                    />

                  </div>

                </div>

              </label>

            </div>


            {/* =================================================
                NAME
            ================================================= */}

            <div>

              <label
                className='
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                '
              >
                Name
              </label>


              <input
                type='text'

                className='
                  w-full
                  p-3
                  border
                  border-gray-200
                  rounded-lg
                '

                placeholder='Please enter your full name'

                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    full_name:
                      e.target.value
                  })
                }

                value={
                  editForm.full_name
                }
              />

            </div>


            {/* =================================================
                USERNAME
            ================================================= */}

            <div>

              <label
                className='
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                '
              >
                Username
              </label>


              <input
                type='text'

                className='
                  w-full
                  p-3
                  border
                  border-gray-200
                  rounded-lg
                '

                placeholder='Please enter a username'

                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    username:
                      e.target.value
                  })
                }

                value={
                  editForm.username
                }
              />

            </div>


            {/* =================================================
                BIO
            ================================================= */}

            <div>

              <label
                className='
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                '
              >
                Bio
              </label>


              <textarea
                rows={3}

                className='
                  w-full
                  p-3
                  border
                  border-gray-200
                  rounded-lg
                '

                placeholder='Please enter a short bio'

                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    bio:
                      e.target.value
                  })
                }

                value={
                  editForm.bio
                }
              />

            </div>


            {/* =================================================
                LOCATION
            ================================================= */}

            <div>

              <label
                className='
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                '
              >
                Location
              </label>


              <input
                type='text'

                className='
                  w-full
                  p-3
                  border
                  border-gray-200
                  rounded-lg
                '

                placeholder='Please enter your location'

                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    location:
                      e.target.value
                  })
                }

                value={
                  editForm.location
                }
              />

            </div>


            {/* =================================================
                BUTTONS
            ================================================= */}

            <div
              className='
                flex
                justify-end
                space-x-3
                pt-6
              '
            >

              <button
                type='button'

                onClick={() =>
                  setShowEdit(false)
                }

                className='
                  px-4
                  py-2
                  border
                  border-gray-300
                  rounded-lg
                  text-gray-700
                  hover:bg-gray-50
                  transition-colors
                  cursor-pointer
                '
              >
                Cancel
              </button>


              <button
                type='submit'

                disabled={saving}

                className='
                  px-4
                  py-2
                  bg-gradient-to-r
                  from-indigo-500
                  to-purple-600
                  text-white
                  rounded-lg
                  hover:from-indigo-600
                  hover:to-purple-700
                  transition
                  cursor-pointer
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                '
              >

                {saving
                  ? 'Saving...'
                  : 'Save Changes'}

              </button>

            </div>

          </form>

        </div>

      </div>

    </div>

  )

}

export default ProfileModal