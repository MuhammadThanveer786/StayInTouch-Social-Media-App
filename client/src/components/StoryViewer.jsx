import { BadgeCheck, X } from "lucide-react";
import React, { useEffect, useState } from "react";


const StoryViewer = ({
  stories,
  setViewStories
}) => {

  // =========================================================
  // CURRENT STORY INDEX
  // =========================================================

  const [currentIndex, setCurrentIndex] =
    useState(0);


  // =========================================================
  // CURRENT STORY
  // =========================================================

  const currentStory =
    stories?.[currentIndex];


  // =========================================================
  // PROGRESS
  // =========================================================

  const [progress, setProgress] =
    useState(0);


  // =========================================================
  // RESET INDEX WHEN NEW STORIES OPEN
  // =========================================================

  useEffect(() => {

    setCurrentIndex(0);

  }, [stories]);


  // =========================================================
  // TEXT / IMAGE STORY TIMER
  // =========================================================

  useEffect(() => {

    if (
      !currentStory ||
      currentStory.media_type === "video"
    ) {
      return;
    }


    setProgress(0);

    const duration = 10000;
    const intervalTime = 100;

    let elapsed = 0;


    const progressInterval =
      setInterval(() => {

        elapsed += intervalTime;

        setProgress(
          Math.min(
            (elapsed / duration) * 100,
            100
          )
        );

      }, intervalTime);


    const timer =
      setTimeout(() => {

        goToNextStory();

      }, duration);


    return () => {

      clearTimeout(timer);

      clearInterval(
        progressInterval
      );

    };

  }, [
    currentIndex,
    currentStory
  ]);


  // =========================================================
  // NEXT STORY
  // =========================================================

  const goToNextStory = () => {

    if (!stories?.length) {
      return;
    }


    if (
      currentIndex <
      stories.length - 1
    ) {

      setCurrentIndex(
        (previousIndex) =>
          previousIndex + 1
      );

      return;

    }


    // No more stories
    setViewStories(null);

  };


  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {

    setViewStories(null);

  };


  // =========================================================
  // VIDEO ENDED
  // =========================================================

  const handleVideoEnded = () => {

    goToNextStory();

  };


  // =========================================================
  // IF NO STORY
  // =========================================================

  if (!currentStory) {
    return null;
  }


  // =========================================================
  // RENDER STORY CONTENT
  // =========================================================

  const renderContent = () => {

    switch (
      currentStory.media_type
    ) {

      // -----------------------------------------------------
      // IMAGE
      // -----------------------------------------------------

      case "image":

        return (

          <img
            src={
              currentStory.media_url
            }
            alt=""
            className="
              max-w-full
              max-h-[90vh]
              object-contain
            "
          />

        );


      // -----------------------------------------------------
      // VIDEO
      // -----------------------------------------------------

      case "video":

        return (

          <video
            src={
              currentStory.media_url
            }
            className="
              max-w-full
              max-h-[90vh]
              object-contain
            "
            controls
            autoPlay
            onEnded={
              handleVideoEnded
            }
          />

        );


      // -----------------------------------------------------
      // TEXT
      // -----------------------------------------------------

      case "text":

        return (

          <div
            className="
              text-white
              text-xl
              sm:text-2xl
              font-medium
              text-center
              max-w-2xl
              px-6
              break-words
            "
          >

            {currentStory.content}

          </div>

        );


      default:

        return null;

    }

  };


  return (

    <div
      className="
        fixed
        inset-0
        h-screen
        bg-black
        bg-opacity-90
        z-110
        flex
        items-center
        justify-center
      "
      style={{
        backgroundColor:
          currentStory.media_type ===
          "text"
            ? currentStory.background_color
            : "#000000"
      }}
    >


      {/* ===================================================
          PROGRESS BAR
      =================================================== */}

      <div
        className="
          absolute
          top-0
          left-0
          w-full
          h-1
          bg-gray-700
          z-20
        "
      >

        <div
          className="
            h-full
            bg-white
            transition-all
            linear
          "
          style={{
            width: `${progress}%`
          }}
        />

      </div>


      {/* ===================================================
          USER INFO
      =================================================== */}

      <div
        className="
          absolute
          top-4
          left-4
          flex
          items-center
          space-x-3
          p-2
          px-4
          sm:p-4
          sm:px-8
          backdrop-blur-2xl
          rounded
          bg-black/50
          z-20
        "
      >

        <img
          src={
            currentStory.user
              ?.profile_picture
          }
          alt=""
          className="
            size-7
            sm:size-8
            rounded-full
            object-cover
            border
            border-white
          "
        />

        <div
          className="
            text-white
            font-medium
            flex
            items-center
            gap-1.5
          "
        >

          <span>

            {
              currentStory.user
                ?.full_name
            }

          </span>

          <BadgeCheck
            size={18}
          />

        </div>

      </div>


      {/* ===================================================
          STORY COUNT
      =================================================== */}

      {stories.length > 1 && (

        <div
          className="
            absolute
            top-5
            right-20
            z-20
            text-white
            text-sm
            bg-black/50
            px-3
            py-1
            rounded-full
          "
        >

          {currentIndex + 1} / {stories.length}

        </div>

      )}


      {/* ===================================================
          CLOSE BUTTON
      =================================================== */}

      <button
        onClick={handleClose}
        className="
          absolute
          top-4
          right-4
          text-white
          text-3xl
          font-bold
          focus:outline-none
          z-20
        "
      >

        <X
          className="
            w-8
            h-8
            hover:scale-110
            transition
            cursor-pointer
          "
        />

      </button>


      {/* ===================================================
          CONTENT
      =================================================== */}

      <div
        className="
          max-w-[90vw]
          max-h-[90vh]
          flex
          items-center
          justify-center
        "
      >

        {renderContent()}

      </div>


      {/* ===================================================
          PREVIOUS BUTTON
      =================================================== */}

      {currentIndex > 0 && (

        <button
          onClick={() =>
            setCurrentIndex(
              (previousIndex) =>
                previousIndex - 1
            )
          }
          className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            z-20
            text-white
            text-4xl
            bg-black/40
            hover:bg-black/60
            rounded-full
            w-12
            h-12
            flex
            items-center
            justify-center
            cursor-pointer
          "
        >

          ‹

        </button>

      )}


      {/* ===================================================
          NEXT BUTTON
      =================================================== */}

      {currentIndex <
        stories.length - 1 && (

        <button
          onClick={
            goToNextStory
          }
          className="
            absolute
            right-4
            top-1/2
            -translate-y-1/2
            z-20
            text-white
            text-4xl
            bg-black/40
            hover:bg-black/60
            rounded-full
            w-12
            h-12
            flex
            items-center
            justify-center
            cursor-pointer
          "
        >

          ›

        </button>

      )}

    </div>

  );

};


export default StoryViewer;
