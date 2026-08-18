import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { useAuth } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'
import Loading from '../components/Loading'
import StoriesBar from '../components/StoriesBar'
import PostCards from '../components/PostCards'
import RecentMessages from '../components/RecentMessages'

const Feed = () => {

  const { getToken } = useAuth();

  const [searchParams] = useSearchParams();

  const [feeds, setfeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Post ID received from shared URL
  const sharedPostId = searchParams.get('post');

  // Used to temporarily highlight the shared post
  const [highlightedPost, setHighlightedPost] = useState(null);


  // =====================================================
  // FETCH FEEDS
  // =====================================================

  const fetchFeeds = async () => {

    try {

      const token = await getToken();

      const response = await fetch(
        'http://localhost:4000/api/posts',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to fetch posts'
        );
      }

      setfeeds(data.posts);

    } catch (error) {

      console.error(
        'Error fetching posts:',
        error
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // LOAD POSTS
  // =====================================================

  useEffect(() => {

    fetchFeeds();

  }, []);


  // =====================================================
  // HANDLE SHARED POST
  // =====================================================

  useEffect(() => {

    // Nothing to do if URL doesn't contain ?post=
    if (!sharedPostId) {
      return;
    }

    // Wait until posts are loaded
    if (loading) {
      return;
    }

    // Find the shared post
    const sharedPost = feeds.find(
      (post) => post._id === sharedPostId
    );

    if (!sharedPost) {

      console.warn(
        'Shared post not found:',
        sharedPostId
      );

      return;
    }


    // Give React a moment to render the PostCards
    setTimeout(() => {

      const postElement =
        document.getElementById(
          `post-${sharedPostId}`
        );

      if (!postElement) {
        console.warn(
          'Post element not found:',
          sharedPostId
        );

        return;
      }


      // Scroll to the post
      postElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });


      // Highlight the post
      setHighlightedPost(sharedPostId);


      // Remove highlight after 3 seconds
      setTimeout(() => {

        setHighlightedPost(null);

      }, 3000);

    }, 300);

  }, [loading, feeds, sharedPostId]);


  // =====================================================
  // RENDER
  // =====================================================

  return !loading ? (

    <div
      className='h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex
      items-start justify-center xl:gap-8'
    >

      {/* =================================================
          STORIES + POSTS
      ================================================= */}

      <div>

        <StoriesBar />

        <div className='p-4 space-y-6'>

          {
            feeds.map((post) => (

              <div
                key={post._id}
                id={`post-${post._id}`}
                className={`
                  rounded-xl transition-all duration-500
                  ${
                    highlightedPost === post._id
                      ? 'ring-4 ring-indigo-400 ring-offset-4'
                      : ''
                  }
                `}
              >

                <PostCards
                  post={post}

                  onDelete={(deletedPostId) => {

                    setfeeds((previousFeeds) =>
                      previousFeeds.filter(
                        (item) =>
                          item._id !== deletedPostId
                      )
                    );

                  }}
                />

              </div>

            ))
          }

        </div>

      </div>


      {/* =================================================
          RIGHT SIDEBAR
      ================================================= */}

      <div className='max-xl:hidden sticky top-0'>

        <div className='max-w-xs bg-white text-xs p-4 rounded-md inline-flex flex-col gap-2 shadow'>

          <h3 className='text-slate-800 font-semibold'>
            Sponsored
          </h3>

          <img
            src={assets.sponsored_img}
            className="w-75 h-50 rounded-md"
            alt=""
          />

          <p className='text-slate-600'>
            Email marketting
          </p>

          <p className='text-slate-400'>
            Supercharge your marketing with a powerful,
            easy-to-use platform bult for results.
          </p>

        </div>

        <RecentMessages />

      </div>

    </div>

  ) : (

    <Loading />

  );
}

export default Feed