import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Image, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { upload } from '@imagekit/javascript';

const CreatePost = () => {

  const { getToken } = useAuth();

  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // =========================
  // FETCH LOGGED-IN USER
  // =========================

  useEffect(() => {

    const fetchUser = async () => {

      try {

        const token = await getToken();

        const response = await fetch(
          'https://stayintouch-server.onrender.com/api/users/me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setUser(data.user);
        } else {
          console.error(data.message);
        }

      } catch (error) {

        console.error(
          'Error fetching user:',
          error
        );

      }
    };

    fetchUser();

  }, [getToken]);


  // =========================
  // UPLOAD ONE IMAGE TO IMAGEKIT
  // =========================

  const uploadImage = async (file) => {

    try {

      // Get Clerk token
      const token = await getToken();

      // Get secure ImageKit upload credentials
      const authResponse = await fetch(
        'https://stayintouch-server.onrender.com/api/imagekit/auth',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const authData = await authResponse.json();

      if (!authResponse.ok || !authData.success) {

        throw new Error(
          authData.message ||
          'Failed to authenticate ImageKit upload'
        );

      }

      // Upload directly from browser to ImageKit
      const uploadResponse = await upload({
        file: file,
        fileName: file.name,

        token: authData.token,
        signature: authData.signature,
        expire: authData.expire,
        publicKey: authData.publicKey,

        folder: '/stay-in-touch/posts',

        useUniqueFileName: true,
      });

      console.log(
        'ImageKit upload successful:',
        uploadResponse
      );

      return uploadResponse.url;

    } catch (error) {

      console.error(
        'ImageKit upload error:',
        error
      );

      throw error;
    }
  };


  // =========================
  // CREATE POST
  // =========================

  const handleSubmit = async () => {

    if (!content.trim() && images.length === 0) {

      throw new Error(
        'Please write something or select an image'
      );

    }

    setLoading(true);

    try {

      const token = await getToken();

      // =========================
      // UPLOAD IMAGES
      // =========================

      let imageUrls = [];

      if (images.length > 0) {

        imageUrls = await Promise.all(
          images.map((image) =>
            uploadImage(image)
          )
        );

      }

      console.log(
        'Uploaded image URLs:',
        imageUrls
      );


      // =========================
      // CREATE POST IN DATABASE
      // =========================

      const response = await fetch(
        'https://stayintouch-server.onrender.com/api/posts',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            content: content.trim(),
            image_urls: imageUrls,
          }),
        }
      );


      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to create post'
        );

      }


      // =========================
      // RESET FORM
      // =========================

      setContent('');
      setImages([]);

      return data.post;

    } catch (error) {

      console.error(
        'Error creating post:',
        error
      );

      throw error;

    } finally {

      setLoading(false);

    }
  };


  // =========================
  // HANDLE IMAGE SELECTION
  // =========================

  const handleImageChange = (e) => {

    const selectedFiles = Array.from(
      e.target.files || []
    );

    setImages((previousImages) => [
      ...previousImages,
      ...selectedFiles
    ]);

    // Allow selecting the same file again
    e.target.value = '';

  };


  // =========================
  // REMOVE SELECTED IMAGE
  // =========================

  const removeImage = (indexToRemove) => {

    setImages((previousImages) =>
      previousImages.filter(
        (_, index) => index !== indexToRemove
      )
    );

  };


  return (

    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>

      <div className='max-w-6xl mx-auto p-6'>

        {/* =========================
            TITLE
        ========================= */}

        <div className='mb-8'>

          <h1 className='text-3xl font-bold text-slate-900 mb-2'>
            Create Post
          </h1>

          <p className='text-slate-600'>
            Share your thoughts with the world
          </p>

        </div>


        {/* =========================
            FORM
        ========================= */}

        <div className='max-w-xl bg-white p-4 sm:p-8 sm:pb-3 rounded-xl shadow-md space-y-4'>


          {/* =========================
              USER HEADER
          ========================= */}

          {user && (

            <div className='flex items-center gap-3'>

              <img
                src={user.profile_picture}
                alt=''
                className='w-12 h-12 rounded-full shadow'
              />

              <div>

                <h2 className='font-semibold'>
                  {user.full_name}
                </h2>

                <p className='text-sm text-gray-500'>
                  @{user.username}
                </p>

              </div>

            </div>

          )}


          {/* =========================
              TEXT AREA
          ========================= */}

          <textarea
            className='w-full resize-none max-h-20 mt-4 text-sm outline-none placeholder-gray-400'
            placeholder="What's happening?"
            onChange={(e) =>
              setContent(e.target.value)
            }
            value={content}
          />


          {/* =========================
              IMAGE PREVIEWS
          ========================= */}

          {images.length > 0 && (

            <div className='flex flex-wrap gap-2 mt-4'>

              {images.map((image, index) => (

                <div
                  key={`${image.name}-${index}`}
                  className='relative group'
                >

                  <img
                    src={URL.createObjectURL(image)}
                    className='h-20 w-20 rounded-md object-cover'
                    alt=''
                  />


                  <div
                    onClick={() =>
                      removeImage(index)
                    }
                    className='absolute hidden group-hover:flex justify-center items-center top-0 right-0 bottom-0 left-0 bg-black/40 rounded-md cursor-pointer'
                  >

                    <X className='w-6 h-6 text-white' />

                  </div>

                </div>

              ))}

            </div>

          )}


          {/* =========================
              BOTTOM BAR
          ========================= */}

          <div className='flex items-center justify-between pt-3 border-t border-gray-300'>


            {/* IMAGE SELECTOR */}

            <label
              htmlFor='images'
              className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer'
            >

              <Image className='size-6' />

            </label>


            <input
              type='file'
              id='images'
              accept='image/*'
              hidden
              multiple
              onChange={handleImageChange}
            />


            {/* PUBLISH */}

            <button
              disabled={
                loading ||
                (!content.trim() &&
                  images.length === 0) ||
                !user
              }

              onClick={() =>
                toast.promise(
                  handleSubmit(),
                  {
                    loading: 'Uploading & publishing...',
                    success: 'Post Added',
                    error: (error) =>
                      error.message ||
                      'Post Not Added',
                  }
                )
              }

              className='text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition text-white font-medium px-8 py-2 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >

              {loading
                ? 'Publishing...'
                : 'Publish Post'}

            </button>

          </div>

        </div>

      </div>

    </div>

  );
};

export default CreatePost;
