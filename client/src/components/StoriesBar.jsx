import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import { Plus } from "lucide-react";
import moment from "moment";
import { io } from "socket.io-client";

import { useAuth } from "@clerk/clerk-react";

import StoryModel from "./StoryModel";
import StoryViewer from "./StoryViewer";


const StoriesBar = () => {

  const {
    getToken,
    userId: currentUserId
  } = useAuth();


  const [stories, setStories] = useState([]);

  const [showModal, setShowModal] =
    useState(false);

  const [viewStories, setViewStories] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =========================================================
  // MERGE STORIES
  // =========================================================
  //
  // Used to prevent duplicate stories when:
  //
  // 1. REST API fetch happens
  // 2. Socket.IO story:created arrives
  //
  // =========================================================

  const mergeStories = useCallback(
    (existingStories, incomingStories) => {

      const storyMap = new Map();


      // Add existing stories first

      existingStories.forEach((story) => {

        storyMap.set(
          story._id,
          story
        );

      });


      // Add/update incoming stories

      incomingStories.forEach((story) => {

        const existingStory =
          storyMap.get(story._id);


        // Preserve local viewed state if it
        // already exists

        if (
          existingStory?.isViewed === true &&
          story?.isViewed !== true
        ) {

          storyMap.set(
            story._id,
            {
              ...story,
              isViewed: true
            }
          );

        } else {

          storyMap.set(
            story._id,
            story
          );

        }

      });


      // Sort newest stories first

      return Array.from(
        storyMap.values()
      ).sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );

    },
    []
  );


  // =========================================================
  // FETCH STORIES
  // =========================================================

  const fetchStories = useCallback(
    async () => {

      try {

        setError("");

        const token =
          await getToken();


        if (!token) {

          throw new Error(
            "Authentication session not found."
          );

        }


        const response =
          await fetch(
            "http://localhost:4000/api/stories",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },
            }
          );


        const contentType =
          response.headers.get(
            "content-type"
          ) || "";


        let data;


        if (
          contentType.includes(
            "application/json"
          )
        ) {

          data =
            await response.json();

        } else {

          throw new Error(
            `Server returned an unexpected response (${response.status}).`
          );

        }


        if (
          !response.ok ||
          !data?.success
        ) {

          throw new Error(
            data?.message ||
            "Failed to fetch stories"
          );

        }


        const fetchedStories =
          Array.isArray(data.stories)
            ? data.stories
            : [];


        // -----------------------------------------------------
        // MERGE WITH CURRENT STATE
        // -----------------------------------------------------
        //
        // This prevents a race condition where:
        //
        // Socket.IO receives a new story
        // at the same time as GET /api/stories.
        //
        // -----------------------------------------------------

        setStories(
          (previousStories) =>
            mergeStories(
              previousStories,
              fetchedStories
            )
        );


      } catch (error) {

        console.error(
          "Error fetching stories:",
          error
        );


        setError(
          error?.message ||
          "Failed to load stories"
        );


      } finally {

        setLoading(false);

      }

    },
    [
      getToken,
      mergeStories
    ]
  );


  // =========================================================
  // INITIAL FETCH
  // =========================================================

  useEffect(() => {

    fetchStories();

  }, [fetchStories]);


  // =========================================================
  // REAL-TIME STORY UPDATES
  // =========================================================
  //
  // Socket.IO listens for:
  //
  // story:created
  // story:viewed
  //
  // =========================================================

  useEffect(() => {

    if (!currentUserId) {
      return;
    }


    const socket =
      io("http://localhost:4000", {
        transports: [
          "websocket",
          "polling"
        ]
      });


    // =======================================================
    // SOCKET CONNECTED
    // =======================================================

    socket.on(
      "connect",
      () => {

        console.log(
          "Stories Socket.IO connected:",
          socket.id
        );

      }
    );


    // =======================================================
    // NEW STORY CREATED
    // =======================================================

    socket.on(
      "story:created",
      (newStory) => {

        if (
          !newStory ||
          !newStory._id
        ) {
          return;
        }


        setStories(
          (previousStories) =>
            mergeStories(
              previousStories,
              [newStory]
            )
        );

      }
    );


    // =======================================================
    // STORY VIEWED
    // =======================================================

    socket.on(
      "story:viewed",
      ({
        storyId,
        userId
      }) => {

        // Only update the viewed state for
        // the user who actually viewed it.

        if (
          userId !== currentUserId
        ) {

          return;

        }


        setStories(
          (previousStories) =>
            previousStories.map(
              (story) => {

                if (
                  story._id === storyId
                ) {

                  return {
                    ...story,
                    isViewed: true
                  };

                }


                return story;

              }
            )
        );

      }
    );


    // =======================================================
    // SOCKET ERROR
    // =======================================================

    socket.on(
      "connect_error",
      (error) => {

        console.error(
          "Stories Socket.IO connection error:",
          error
        );

      }
    );


    // =======================================================
    // CLEANUP
    // =======================================================

    return () => {

      socket.off(
        "connect"
      );

      socket.off(
        "story:created"
      );

      socket.off(
        "story:viewed"
      );

      socket.off(
        "connect_error"
      );

      socket.disconnect();

    };

  }, [
    currentUserId,
    mergeStories
  ]);


  // =========================================================
  // MARK STORIES AS VIEWED
  // =========================================================

  const markStoriesAsViewed = async (
    storiesToMark
  ) => {

    try {

      const token =
        await getToken();


      if (!token) {
        return;
      }


      // -------------------------------------------------------
      // IMMEDIATELY UPDATE LOCAL STATE
      // -------------------------------------------------------

      const storyIds =
        storiesToMark.map(
          (story) =>
            story._id
        );


      setStories(
        (previousStories) =>
          previousStories.map(
            (story) => {

              if (
                storyIds.includes(
                  story._id
                )
              ) {

                return {
                  ...story,
                  isViewed: true
                };

              }


              return story;

            }
          )
      );


      // -------------------------------------------------------
      // PERSIST VIEWED STATE
      // -------------------------------------------------------

      await Promise.all(

        storiesToMark.map(
          async (story) => {

            try {

              const response =
                await fetch(
                  `http://localhost:4000/api/stories/${story._id}/view`,
                  {
                    method:
                      "PATCH",

                    headers: {
                      Authorization:
                        `Bearer ${token}`,

                      Accept:
                        "application/json",
                    },
                  }
                );


              const contentType =
                response.headers.get(
                  "content-type"
                ) || "";


              if (
                !contentType.includes(
                  "application/json"
                )
              ) {

                console.error(
                  `Unexpected response while marking story ${story._id} as viewed`
                );

                return;

              }


              const data =
                await response.json();


              if (
                !response.ok ||
                !data?.success
              ) {

                console.error(
                  data?.message ||
                  `Failed to mark story ${story._id} as viewed`
                );

              }

            } catch (error) {

              console.error(
                `Error marking story ${story._id} as viewed:`,
                error
              );

            }

          }
        )

      );

    } catch (error) {

      console.error(
        "Error marking stories as viewed:",
        error
      );

    }

  };


  // =========================================================
  // GROUP STORIES BY USER
  // =========================================================
  //
  // Example:
  //
  // Muhammad -> Story 1
  // Muhammad -> Story 2
  // John     -> Story 1
  //
  // becomes:
  //
  // Muhammad -> [Story 1, Story 2]
  // John     -> [Story 1]
  //
  // =========================================================

  const groupedStories =
    Object.values(

      stories.reduce(
        (groups, story) => {

          const storyUserId =
            story.user?._id ||
            story.user_id ||
            story.user?.id;


          if (!storyUserId) {
            return groups;
          }


          if (!groups[storyUserId]) {

            groups[storyUserId] = {

              user:
                story.user,

              stories: []

            };

          }


          groups[
            storyUserId
          ].stories.push(
            story
          );


          return groups;

        },
        {}
      )

    );


  // =========================================================
  // SORT STORIES INSIDE EACH USER GROUP
  // =========================================================

  groupedStories.forEach(
    (group) => {

      group.stories.sort(
        (a, b) =>
          new Date(a.createdAt) -
          new Date(b.createdAt)
      );

    }
  );


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="w-screen sm:w-[calc(100vw-240px)] lg:max-w-2xl no-scrollbar overflow-x-auto px-4">

      <div className="flex gap-4 pb-5">


        {/* ===================================================
            CREATE STORY
        =================================================== */}

        <div
          onClick={() =>
            setShowModal(true)
          }
          className="
            rounded-lg
            shadow-sm
            min-w-30
            max-w-30
            max-h-40
            aspect-[3/4]
            cursor-pointer
            hover:shadow-lg
            transition-all
            duration-200
            border-2
            border-dashed
            border-indigo-300
            bg-gradient-to-b
            from-indigo-50
            to-white
          "
        >

          <div
            className="
              h-full
              flex
              flex-col
              items-center
              justify-center
              p-4
            "
          >

            <div
              className="
                size-10
                bg-indigo-500
                rounded-full
                flex
                items-center
                justify-center
                mb-3
              "
            >

              <Plus
                className="w-5 h-5 text-white"
              />

            </div>


            <p
              className="
                text-sm
                font-medium
                text-slate-700
                text-center
              "
            >

              Create Story

            </p>

          </div>

        </div>


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading && (

          <div
            className="
              min-w-30
              max-w-30
              max-h-40
              aspect-[3/4]
              rounded-lg
              bg-white
              shadow
              flex
              items-center
              justify-center
            "
          >

            <div
              className="
                w-6
                h-6
                border-2
                border-indigo-500
                border-t-transparent
                rounded-full
                animate-spin
              "
            />

          </div>

        )}


        {/* ===================================================
            GROUPED STORIES
        =================================================== */}

        {!loading &&
          groupedStories.map(
            (group) => {

              // ------------------------------------------------
              // LATEST STORY
              // ------------------------------------------------

              const latestStory =
                group.stories[
                  group.stories.length - 1
                ];


              // ------------------------------------------------
              // CHECK WHETHER ALL STORIES ARE VIEWED
              // ------------------------------------------------

              const allStoriesViewed =
                group.stories.every(
                  (story) =>
                    story.isViewed === true
                );


              return (

                <div
                  key={
                    group.user?._id ||
                    group.user?.id ||
                    group.stories[0]?._id
                  }

                  onClick={() => {

                    // Open immediately
                    setViewStories(
                      group.stories
                    );


                    // Mark every story in
                    // this group as viewed
                    markStoriesAsViewed(
                      group.stories
                    );

                  }}

                  className="
                    relative
                    rounded-lg
                    shadow
                    min-w-30
                    max-w-30
                    max-h-40
                    aspect-[3/4]
                    cursor-pointer
                    overflow-hidden
                    hover:shadow-lg
                    transition-all
                    duration-200
                    bg-gradient-to-b
                    from-indigo-500
                    to-purple-600
                    hover:from-indigo-700
                    hover:to-purple-800
                    active:scale-95
                  "
                >


                  {/* ==========================================
                      MEDIA PREVIEW
                  ========================================== */}

                  {latestStory.media_type !==
                    "text" && (

                    <div
                      className="
                        absolute
                        inset-0
                        z-0
                        bg-black
                        overflow-hidden
                      "
                    >

                      {latestStory.media_type ===
                        "image" ? (

                        <img
                          src={
                            latestStory.media_url
                          }
                          alt=""
                          className="
                            h-full
                            w-full
                            object-cover
                            hover:scale-110
                            transition
                            duration-500
                            opacity-70
                            hover:opacity-80
                          "
                        />

                      ) : (

                        <video
                          src={
                            latestStory.media_url
                          }
                          className="
                            h-full
                            w-full
                            object-cover
                            hover:scale-110
                            transition
                            duration-500
                            opacity-70
                            hover:opacity-80
                          "
                          muted
                        />

                      )}

                    </div>

                  )}


                  {/* ==========================================
                      USER PROFILE
                  ========================================== */}

                  <img
                    src={
                      group.user?.profile_picture ||
                      "/default-avatar.png"
                    }
                    alt=""
                    className={`
                      absolute
                      size-8
                      top-3
                      left-3
                      z-10
                      rounded-full
                      shadow
                      object-cover
                      ring-2

                      ${
                        allStoriesViewed
                          ? "ring-gray-400"
                          : "ring-indigo-500"
                      }
                    `}
                  />


                  {/* ==========================================
                      UNVIEWED INDICATOR
                  ========================================== */}

                  {!allStoriesViewed && (

                    <span
                      className="
                        absolute
                        top-3
                        left-12
                        z-20
                        w-2
                        h-2
                        rounded-full
                        bg-indigo-400
                        shadow
                      "
                    />

                  )}


                  {/* ==========================================
                      TEXT STORY PREVIEW
                  ========================================== */}

                  {latestStory.media_type ===
                    "text" && (

                    <p
                      className="
                        absolute
                        top-18
                        left-3
                        text-white
                        text-sm
                        truncate
                        max-w-24
                        z-10
                      "
                    >

                      {
                        latestStory.content
                      }

                    </p>

                  )}


                  {/* ==========================================
                      MULTIPLE STORY COUNT
                  ========================================== */}

                  {group.stories.length > 1 && (

                    <span
                      className="
                        absolute
                        top-2
                        right-2
                        z-20
                        min-w-5
                        h-5
                        px-1
                        rounded-full
                        bg-white
                        text-indigo-600
                        text-[10px]
                        font-bold
                        flex
                        items-center
                        justify-center
                        shadow
                      "
                    >

                      {
                        group.stories.length
                      }

                    </span>

                  )}


                  {/* ==========================================
                      TIME
                  ========================================== */}

                  <p
                    className="
                      text-white
                      absolute
                      bottom-1
                      right-2
                      z-10
                      text-xs
                    "
                  >

                    {moment(
                      latestStory.createdAt
                    ).fromNow()}

                  </p>


                </div>

              );

            }
          )}


        {/* ===================================================
            ERROR
        =================================================== */}

        {!loading &&
          error && (

            <div
              className="
                min-w-30
                max-w-30
                max-h-40
                aspect-[3/4]
                rounded-lg
                bg-white
                shadow
                flex
                flex-col
                items-center
                justify-center
                p-3
                text-center
              "
            >

              <p
                className="
                  text-xs
                  text-red-500
                "
              >

                Failed to load stories

              </p>


              <button
                onClick={fetchStories}
                className="
                  text-xs
                  text-indigo-500
                  font-medium
                  mt-2
                  cursor-pointer
                "
              >

                Retry

              </button>

            </div>

          )}


      </div>


      {/* =====================================================
          CREATE STORY MODAL
      ===================================================== */}

      {showModal && (

        <StoryModel
          setShowModal={
            setShowModal
          }
          fetchStories={
            fetchStories
          }
        />

      )}


      {/* =====================================================
          STORY VIEWER
      ===================================================== */}

      {viewStories && (

        <StoryViewer
          stories={
            viewStories
          }
          setViewStories={
            setViewStories
          }
        />

      )}

    </div>

  );

};


export default StoriesBar;