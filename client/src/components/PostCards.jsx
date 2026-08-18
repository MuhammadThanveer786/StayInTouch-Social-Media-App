import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Loader2,
  MoreVertical,
  Trash2,
  Pencil,
  X
} from 'lucide-react';

import moment from 'moment';
import React, { useEffect, useState } from 'react';

import {
  useAuth,
  useUser
} from '@clerk/clerk-react';

import { useNavigate } from 'react-router-dom';

import { upload } from '@imagekit/javascript';
import toast from 'react-hot-toast';


const PostCards = ({ post, onDelete, onEdit }) => {

  const { getToken } = useAuth();
  const { user } = useUser();

  const navigate = useNavigate();


  // =====================================================
  // POST DISPLAY STATE
  // =====================================================

  const [currentContent, setCurrentContent] = useState(
    post.content || ''
  );

  const [currentImages, setCurrentImages] = useState(
    post.image_urls || []
  );


  // =====================================================
  // LIKES
  // =====================================================

  const [likes, setLikes] = useState(
    post.likes_count?.length || 0
  );

  const [liked, setLiked] = useState(false);

  const [likeLoading, setLikeLoading] = useState(false);


  // =====================================================
  // COMMENTS
  // =====================================================

  const [comments, setComments] = useState([]);

  const [commentsCount, setCommentsCount] = useState(
    post.comments_count || 0
  );

  const [showComments, setShowComments] = useState(false);

  const [commentsLoading, setCommentsLoading] = useState(false);

  const [commentText, setCommentText] = useState('');

  const [commentSubmitting, setCommentSubmitting] = useState(false);


  // =====================================================
  // DELETE
  // =====================================================

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showMenu, setShowMenu] = useState(false);


  // =====================================================
  // EDIT
  // =====================================================

  const [showEdit, setShowEdit] = useState(false);

  const [editContent, setEditContent] = useState(
    post.content || ''
  );

  const [editImages, setEditImages] = useState([]);

  const [editLoading, setEditLoading] = useState(false);


  // =====================================================
  // CHECK CURRENT USER LIKE
  // =====================================================

  useEffect(() => {

    if (user && post.likes_count) {

      setLiked(
        post.likes_count.includes(user.id)
      );

    }

  }, [user, post.likes_count]);


  // =====================================================
  // POST CONTENT WITH HASHTAGS
  // =====================================================

  const postWithHashtags = (
    currentContent || ''
  ).replace(
    /(#\w+)/g,
    '<span class="text-indigo-600">$1</span>'
  );


  // =====================================================
  // LIKE / UNLIKE
  // =====================================================

  const handleLike = async () => {

    if (likeLoading) return;

    try {

      setLikeLoading(true);

      const token = await getToken();

      const response = await fetch(
        `http://localhost:4000/api/posts/${post._id}/like`,
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );


      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to update like'
        );

      }


      setLiked(data.liked);

      setLikes(data.likesCount);

    } catch (error) {

      console.error(
        'Error liking post:',
        error
      );

    } finally {

      setLikeLoading(false);

    }
  };


  // =====================================================
  // FETCH COMMENTS
  // =====================================================

  const fetchComments = async () => {

    try {

      setCommentsLoading(true);

      const response = await fetch(
        `http://localhost:4000/api/comments/post/${post._id}`
      );


      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to fetch comments'
        );

      }


      setComments(
        data.comments || []
      );


      if (data.commentsCount !== undefined) {

        setCommentsCount(
          data.commentsCount
        );

      } else {

        setCommentsCount(
          (data.comments || []).length
        );

      }

    } catch (error) {

      console.error(
        'Error fetching comments:',
        error
      );

    } finally {

      setCommentsLoading(false);

    }
  };


  // =====================================================
  // TOGGLE COMMENTS
  // =====================================================

  const handleCommentsToggle = async () => {

    const newState = !showComments;

    setShowComments(newState);

    if (newState) {

      await fetchComments();

    }

  };


  // =====================================================
  // SUBMIT COMMENT
  // =====================================================

  const handleSubmitComment = async (e) => {

    e.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    if (commentSubmitting) {
      return;
    }

    try {

      setCommentSubmitting(true);

      const token = await getToken();

      const response = await fetch(
        'http://localhost:4000/api/comments',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            postId: post._id,
            content: commentText.trim(),
          }),
        }
      );


      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to add comment'
        );

      }


      if (data.comment) {

        setComments((previousComments) => [
          data.comment,
          ...previousComments
        ]);

      }


      if (data.commentsCount !== undefined) {

        setCommentsCount(
          data.commentsCount
        );

      } else {

        setCommentsCount(
          (previousCount) =>
            previousCount + 1
        );

      }


      setCommentText('');

      setShowComments(true);

    } catch (error) {

      console.error(
        'Error submitting comment:',
        error
      );

    } finally {

      setCommentSubmitting(false);

    }

  };


  // =====================================================
  // DELETE POST
  // =====================================================

  const handleDelete = async () => {

    if (deleteLoading) {
      return;
    }


    const confirmed = window.confirm(
      'Are you sure you want to delete this post? This action cannot be undone.'
    );


    if (!confirmed) {

      setShowMenu(false);

      return;
    }


    try {

      setDeleteLoading(true);

      setShowMenu(false);

      const token = await getToken();


      const response = await fetch(
        `http://localhost:4000/api/posts/${post._id}`,
        {
          method: 'DELETE',

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );


      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to delete post'
        );

      }


      if (onDelete) {

        onDelete(post._id);

      }

    } catch (error) {

      console.error(
        'Error deleting post:',
        error
      );

      window.alert(
        error.message ||
        'Failed to delete post'
      );

    } finally {

      setDeleteLoading(false);

    }

  };


  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  const handleOpenEdit = () => {

    setEditContent(currentContent);

    setEditImages([]);

    setShowMenu(false);

    setShowEdit(true);

  };


  // =====================================================
  // UPLOAD IMAGE TO IMAGEKIT
  // =====================================================

  const uploadImage = async (file) => {

    const token = await getToken();


    const authResponse = await fetch(
      'http://localhost:4000/api/imagekit/auth',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );


    const authData = await authResponse.json();


    if (
      !authResponse.ok ||
      !authData.success
    ) {

      throw new Error(
        authData.message ||
        'Failed to authenticate ImageKit upload'
      );

    }


    const uploadResponse = await upload({

      file,

      fileName: file.name,

      token: authData.token,

      signature: authData.signature,

      expire: authData.expire,

      publicKey: authData.publicKey,

      folder: '/stay-in-touch/posts',

      useUniqueFileName: true,

    });


    return uploadResponse.url;

  };


  // =====================================================
  // REMOVE EXISTING IMAGE
  // =====================================================

  const removeExistingImage = (imageUrl) => {

    setCurrentImages((previousImages) =>
      previousImages.filter(
        (image) => image !== imageUrl
      )
    );

  };


  // =====================================================
  // ADD NEW EDIT IMAGE
  // =====================================================

  const handleEditImageChange = (e) => {

    const selectedFiles = Array.from(
      e.target.files || []
    );

    setEditImages((previousImages) => [
      ...previousImages,
      ...selectedFiles
    ]);

    e.target.value = '';

  };


  // =====================================================
  // REMOVE NEW EDIT IMAGE
  // =====================================================

  const removeEditImage = (indexToRemove) => {

    setEditImages((previousImages) =>
      previousImages.filter(
        (_, index) =>
          index !== indexToRemove
      )
    );

  };


  // =====================================================
  // SAVE EDITED POST
  // =====================================================

  const handleSaveEdit = async (e) => {

    e.preventDefault();

    if (editLoading) {
      return;
    }


    if (
      !editContent.trim() &&
      currentImages.length === 0 &&
      editImages.length === 0
    ) {

      window.alert(
        'Post content or image is required'
      );

      return;

    }


    try {

      setEditLoading(true);


      // ==============================================
      // UPLOAD NEW IMAGES
      // ==============================================

      let newImageUrls = [];

      if (editImages.length > 0) {

        newImageUrls = await Promise.all(
          editImages.map(
            (image) =>
              uploadImage(image)
          )
        );

      }


      // ==============================================
      // COMBINE EXISTING + NEW IMAGES
      // ==============================================

      const finalImageUrls = [
        ...currentImages,
        ...newImageUrls
      ];


      // ==============================================
      // UPDATE BACKEND
      // ==============================================

      const token = await getToken();


      const response = await fetch(
        `http://localhost:4000/api/posts/${post._id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            content:
              editContent.trim(),

            image_urls:
              finalImageUrls,
          }),
        }
      );


      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to update post'
        );

      }


      // ==============================================
      // UPDATE THIS CARD IMMEDIATELY
      // ==============================================

      setCurrentContent(
        data.post.content || ''
      );

      setCurrentImages(
        data.post.image_urls || []
      );


      // Notify parent if provided
      if (onEdit) {

        onEdit(data.post);

      }


      setShowEdit(false);

      setEditImages([]);

    } catch (error) {

      console.error(
        'Error editing post:',
        error
      );

      window.alert(
        error.message ||
        'Failed to update post'
      );

    } finally {

      setEditLoading(false);

    }

  };



  // =====================================================
  // SHARE POST
  // =====================================================

  const handleShare = async () => {
    try {

      // Create a unique link for this post
      const shareUrl =
  `${window.location.origin}/?post=${post._id}`;

      // Use native share if the browser supports it
      if (navigator.share) {

        await navigator.share({
          title: `${post.user.full_name}'s post`,
          text: post.content || 'Check out this post on StayInTouch',
          url: shareUrl,
        });

        return;
      }

      // Otherwise copy the link
      await navigator.clipboard.writeText(shareUrl);

      toast.success('Post link copied!');

    } catch (error) {

      // User cancelling the native share dialog
      // should not show an error
      if (error?.name === 'AbortError') {
        return;
      }

      console.error(
        'Error sharing post:',
        error
      );

      toast.error(
        'Unable to share post'
      );
    }
  };





  return (

    <div className='bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl'>


      {/* =====================================================
          USER INFO
      ===================================================== */}

      <div className='flex items-start justify-between'>

        <div
          onClick={() =>
            navigate(
              '/profile/' +
              post.user._id
            )
          }

          className='inline-flex items-center gap-3 cursor-pointer'
        >

          <img
            src={post.user.profile_picture}
            alt=''
            className='w-10 h-10 rounded-full shadow'
          />


          <div>

            <div className='flex items-center space-x-1'>

              <span>
                {post.user.full_name}
              </span>

              <BadgeCheck
                className='w-4 h-4 text-blue-500'
              />

            </div>


            <div className='text-gray-500 text-sm'>

              @{post.user.username}
              {' · '}
              {moment(post.createdAt).fromNow()}

            </div>

          </div>

        </div>


        {/* =====================================================
            POST MENU
        ===================================================== */}

        {user &&
          post.user &&
          post.user._id === user.id && (

            <div className='relative'>

              <button
                type='button'
                onClick={() =>
                  setShowMenu(
                    (previous) =>
                      !previous
                  )
                }
                disabled={
                  deleteLoading ||
                  editLoading
                }
                className='p-2 rounded-full hover:bg-gray-100 transition cursor-pointer disabled:opacity-50'
              >

                <MoreVertical
                  className='w-5 h-5 text-gray-500'
                />

              </button>


              {showMenu && (

                <div className='absolute right-0 top-10 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-36'>

                  {/* EDIT */}

                  <button
                    type='button'
                    onClick={handleOpenEdit}
                    disabled={editLoading}
                    className='w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition cursor-pointer'
                  >

                    <Pencil
                      className='w-4 h-4'
                    />

                    Edit Post

                  </button>


                  {/* DELETE */}

                  <button
                    type='button'
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className='w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer'
                  >

                    <Trash2
                      className='w-4 h-4'
                    />

                    Delete Post

                  </button>

                </div>

              )}

            </div>

          )}

      </div>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      {currentContent && (

        <div
          className='text-gray-800 text-sm whitespace-pre-line'
          dangerouslySetInnerHTML={{
            __html:
              postWithHashtags
          }}
        />

      )}


      {/* =====================================================
    IMAGES
===================================================== */}

      {currentImages?.length > 0 && (

        <div className='grid grid-cols-2 gap-2'>

          {currentImages.map((img, index) => (

            <img
              src={img}
              key={index}
              className={`w-full aspect-video max-h-[500px] object-cover rounded-lg ${currentImages.length === 1
                ? 'col-span-2'
                : ''
                }`}
              alt=''
            />

          ))}

        </div>

      )}

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className='flex items-center gap-4 text-gray-600 text-sm pt-2 border-t border-gray-300'>


        {/* LIKE */}

        <div className='flex items-center gap-1'>

          <Heart
            onClick={handleLike}

            className={`w-4 h-4 cursor-pointer transition ${liked
              ? 'text-red-500 fill-red-500'
              : 'text-gray-600'
              } ${likeLoading
                ? 'opacity-50 pointer-events-none'
                : ''
              }`}
          />

          <span>
            {likes}
          </span>

        </div>


        {/* COMMENTS */}

        <div
          onClick={handleCommentsToggle}
          className='flex items-center gap-1 cursor-pointer hover:text-gray-900'
        >

          <MessageCircle
            className={`w-4 h-4 ${showComments
              ? 'text-indigo-600'
              : ''
              }`}
          />

          <span>
            {commentsCount}
          </span>

        </div>


        {/* SHARE */}

        <div
          onClick={handleShare}
          className='flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition'
          title='Share post'
        >

          <Share2
            className='w-4 h-4'
          />

          <span>
            Share
          </span>

        </div>

      </div>


      {/* =====================================================
          COMMENTS SECTION
      ===================================================== */}

      {showComments && (

        <div className='border-t border-gray-200 pt-4 space-y-4'>

          {/* COMMENT INPUT */}

          <form
            onSubmit={handleSubmitComment}
            className='flex items-center gap-2'
          >

            <img
              src={
                user?.imageUrl ||
                'https://via.placeholder.com/40'
              }
              alt=''
              className='w-8 h-8 rounded-full object-cover'
            />


            <input
              type='text'
              value={commentText}
              onChange={(e) =>
                setCommentText(
                  e.target.value
                )
              }
              placeholder='Write a comment...'
              disabled={commentSubmitting}
              className='flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-400'
            />


            <button
              type='submit'
              disabled={
                commentSubmitting ||
                !commentText.trim()
              }
              className='w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed'
            >

              {commentSubmitting ? (

                <Loader2
                  className='w-4 h-4 animate-spin'
                />

              ) : (

                <Send
                  className='w-4 h-4'
                />

              )}

            </button>

          </form>


          {/* COMMENTS LIST */}

          {commentsLoading ? (

            <div className='flex justify-center py-4'>

              <Loader2
                className='w-5 h-5 text-indigo-600 animate-spin'
              />

            </div>

          ) : comments.length === 0 ? (

            <p className='text-center text-sm text-gray-500 py-3'>
              No comments yet. Be the first to comment!
            </p>

          ) : (

            <div className='space-y-4 max-h-80 overflow-y-auto pr-1'>

              {comments.map(
                (comment) => (

                  <div
                    key={comment._id}
                    className='flex items-start gap-3'
                  >

                    <img
                      src={
                        comment.user
                          ?.profile_picture
                      }
                      alt=''
                      className='w-8 h-8 rounded-full object-cover'
                    />


                    <div className='flex-1'>

                      <div className='bg-gray-50 rounded-lg px-3 py-2'>

                        <div className='flex items-center gap-2'>

                          <span className='font-semibold text-sm text-gray-800'>

                            {
                              comment.user
                                ?.full_name ||
                              'User'
                            }

                          </span>

                          <span className='text-xs text-gray-400'>

                            {moment(
                              comment.createdAt
                            ).fromNow()}

                          </span>

                        </div>


                        <p className='text-sm text-gray-700 mt-1 whitespace-pre-line'>

                          {comment.content}

                        </p>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {showEdit && (

        <div className='fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4 overflow-y-auto'>

          <div className='bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6'>


            {/* MODAL HEADER */}

            <div className='flex items-center justify-between mb-5'>

              <h2 className='text-xl font-bold text-gray-900'>
                Edit Post
              </h2>


              <button
                type='button'
                onClick={() =>
                  setShowEdit(false)
                }
                disabled={editLoading}
                className='p-2 rounded-full hover:bg-gray-100 cursor-pointer'
              >

                <X className='w-5 h-5' />

              </button>

            </div>


            {/* EDIT FORM */}

            <form
              onSubmit={handleSaveEdit}
              className='space-y-5'
            >


              {/* TEXT */}

              <div>

                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Post content
                </label>

                <textarea
                  value={editContent}
                  onChange={(e) =>
                    setEditContent(
                      e.target.value
                    )
                  }
                  rows={5}
                  disabled={editLoading}
                  className='w-full border border-gray-200 rounded-lg p-3 text-sm outline-none resize-none focus:border-indigo-400'
                  placeholder='What are you thinking?'
                />

              </div>


              {/* EXISTING IMAGES */}

              {currentImages.length > 0 && (

                <div>

                  <p className='text-sm font-medium text-gray-700 mb-2'>
                    Current images
                  </p>


                  <div className='grid grid-cols-2 gap-3'>

                    {currentImages.map(
                      (image, index) => (

                        <div
                          key={`${image}-${index}`}
                          className='relative group'
                        >

                          <img
                            src={image}
                            alt=''
                            className='w-full h-32 object-cover rounded-lg'
                          />


                          <button
                            type='button'
                            onClick={() =>
                              removeExistingImage(
                                image
                              )
                            }
                            disabled={editLoading}
                            className='absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 transition cursor-pointer'
                          >

                            <X className='w-4 h-4' />

                          </button>

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}


              {/* NEW IMAGES */}

              {editImages.length > 0 && (

                <div>

                  <p className='text-sm font-medium text-gray-700 mb-2'>
                    New images
                  </p>


                  <div className='flex flex-wrap gap-3'>

                    {editImages.map(
                      (image, index) => (

                        <div
                          key={`${image.name}-${index}`}
                          className='relative'
                        >

                          <img
                            src={
                              URL.createObjectURL(
                                image
                              )
                            }
                            alt=''
                            className='w-24 h-24 object-cover rounded-lg'
                          />


                          <button
                            type='button'
                            onClick={() =>
                              removeEditImage(
                                index
                              )
                            }
                            disabled={editLoading}
                            className='absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition cursor-pointer'
                          >

                            <X className='w-4 h-4' />

                          </button>

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}


              {/* ADD IMAGE */}

              <label
                htmlFor={`edit-images-${post._id}`}
                className='inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer'
              >

                <Pencil className='w-4 h-4' />

                Add Images

              </label>


              <input
                type='file'
                id={`edit-images-${post._id}`}
                accept='image/*'
                multiple
                hidden
                onChange={
                  handleEditImageChange
                }
              />


              {/* BUTTONS */}

              <div className='flex justify-end gap-3 pt-3 border-t border-gray-200'>

                <button
                  type='button'
                  onClick={() =>
                    setShowEdit(false)
                  }
                  disabled={editLoading}
                  className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50'
                >
                  Cancel
                </button>


                <button
                  type='submit'
                  disabled={editLoading}
                  className='px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-2'
                >

                  {editLoading && (

                    <Loader2
                      className='w-4 h-4 animate-spin'
                    />

                  )}

                  {editLoading
                    ? 'Saving...'
                    : 'Save Changes'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

};


export default PostCards;