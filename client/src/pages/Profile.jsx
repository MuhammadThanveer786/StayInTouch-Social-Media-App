import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import UserProfileInfo from "../components/UserProfileInfo";
import PostCards from "../components/PostCards";
import moment from "moment";
import ProfileModal from "../components/ProfileModal";

const Profile = () => {
  const { profileId } = useParams();
  const { getToken } = useAuth();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [showEdit, setShowEdit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // FETCH PROFILE
  // =========================================================

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      let userData;
      let userId;

      // =====================================================
      // OTHER USER PROFILE
      // =====================================================

      if (profileId) {
        const userResponse = await fetch(
          `https://stayintouch-server.onrender.com/api/users/${profileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const responseData = await userResponse.json();

        if (!userResponse.ok || !responseData.success) {
          throw new Error(
            responseData.message || "Failed to fetch user profile"
          );
        }

        userData = responseData.user;
        userId = profileId;
      }

      // =====================================================
      // LOGGED-IN USER PROFILE
      // =====================================================

      else {
        const userResponse = await fetch(
          "https://stayintouch-server.onrender.com/api/users/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const responseData = await userResponse.json();

        if (!userResponse.ok || !responseData.success) {
          throw new Error(
            responseData.message || "Failed to fetch user profile"
          );
        }

        userData = responseData.user;
        userId = responseData.user._id;
      }

      // =====================================================
      // SET USER
      // =====================================================

      setUser(userData);

      // =====================================================
      // FETCH USER'S POSTS
      // =====================================================

      const postsResponse = await fetch(
        `https://stayintouch-server.onrender.com/api/posts/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const postsData = await postsResponse.json();

      if (!postsResponse.ok || !postsData.success) {
        throw new Error(
          postsData.message || "Failed to fetch posts"
        );
      }

      setPosts(
        Array.isArray(postsData.posts)
          ? postsData.posts
          : []
      );

    } catch (error) {
      console.error("Error fetching profile:", error);

      setError(
        error?.message || "Failed to load profile"
      );

      setUser(null);
      setPosts([]);

    } finally {
      setLoading(false);
    }
  }, [profileId, getToken]);

  // =========================================================
  // FETCH WHEN PROFILE ID CHANGES
  // =========================================================

  useEffect(() => {
    fetchUser();

    // Always close edit modal when switching profiles
    setShowEdit(false);

  }, [fetchUser]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return <Loading />;
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error || !user) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-500 font-medium">
            {error || "User not found"}
          </p>

          <button
            onClick={fetchUser}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="relative h-full overflow-y-scroll bg-gray-50 p-6">

      <div className="max-w-3xl mx-auto">

        {/* ===================================================
            PROFILE CARD
        =================================================== */}

        <div className="bg-white rounded-2xl shadow overflow-hidden">

          {/* COVER PHOTO */}

          <div className="h-40 md:h-56 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">

            {user.cover_photo && (
              <img
                src={user.cover_photo}
                alt={`${user.full_name}'s cover`}
                className="w-full h-full object-cover"
              />
            )}

          </div>

          {/* USER INFORMATION */}

          <UserProfileInfo
            user={user}
            posts={posts}
            profileId={profileId}
            setShowEdit={setShowEdit}
          />

        </div>


        {/* ===================================================
            TABS
        =================================================== */}

        <div className="mt-6">

          <div className="bg-white rounded-xl shadow p-1 flex max-w-md mx-auto">

            {["posts", "media", "likes"].map((tab) => (

              <button
                onClick={() => setActiveTab(tab)}
                key={tab}
                className={`
                  flex-1
                  px-4
                  py-2
                  text-sm
                  font-medium
                  rounded-lg
                  transition-colors
                  cursor-pointer

                  ${
                    activeTab === tab
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>

            ))}

          </div>


          {/* =================================================
              POSTS
          ================================================= */}

          {activeTab === "posts" && (

            <div className="mt-6 flex flex-col items-center gap-6">

              {posts.length > 0 ? (

                posts.map((post) => (
                  <PostCards
                    key={post._id}
                    post={post}
                  />
                ))

              ) : (

                <div className="text-center text-gray-500 py-10">
                  No posts yet.
                </div>

              )}

            </div>

          )}


          {/* =================================================
              MEDIA
          ================================================= */}

          {activeTab === "media" && (

            <div className="flex flex-wrap mt-6 max-w-6xl">

              {posts
                .filter(
                  (post) =>
                    Array.isArray(post.image_urls) &&
                    post.image_urls.length > 0
                )
                .map((post) => (

                  <React.Fragment key={post._id}>

                    {post.image_urls.map(
                      (image, index) => (

                        <Link
                          target="_blank"
                          to={image}
                          key={index}
                          className="relative group"
                        >

                          <img
                            src={image}
                            className="w-64 aspect-video object-cover"
                            alt=""
                          />

                          <p
                            className="
                              absolute
                              bottom-0
                              right-0
                              text-xs
                              p-1
                              px-3
                              backdrop-blur
                              text-white
                              opacity-0
                              group-hover:opacity-100
                              transition
                              duration-300
                            "
                          >
                            Posted{" "}
                            {moment(
                              post.createdAt
                            ).fromNow()}
                          </p>

                        </Link>

                      )
                    )}

                  </React.Fragment>

                ))}

            </div>

          )}

        </div>

      </div>


      {/* =====================================================
          EDIT PROFILE MODAL
      ===================================================== */}

      {showEdit && !profileId && (

        <ProfileModal
          user={user}
          setUser={setUser}
          setShowEdit={setShowEdit}
        />

      )}

    </div>
  );
};

export default Profile;
