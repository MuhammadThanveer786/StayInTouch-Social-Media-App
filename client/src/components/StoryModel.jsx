import React, { useState } from "react";
import {
  ArrowLeft,
  Sparkle,
  TextIcon,
  Upload
} from "lucide-react";
import toast from "react-hot-toast";
import { upload } from "@imagekit/javascript";
import { useAuth } from "@clerk/clerk-react";

const StoryModel = ({ setShowModal, fetchStories }) => {

  const { getToken } = useAuth();

  const bgColors = [
    "#4f46e5",
    "#7c3aed",
    "#db2777",
    "#e11d48",
    "#ca8a04",
    "#0d9488",
    "#808080",
  ];

  const [mode, setMode] = useState("text");
  const [background, setBackground] = useState(bgColors[0]);
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [creating, setCreating] = useState(false);


  // =========================================================
  // SELECT MEDIA
  // =========================================================

  const handleMediaUpload = (e) => {

    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setMedia(file);
    setPreviewUrl(URL.createObjectURL(file));

  };


  // =========================================================
  // UPLOAD MEDIA TO IMAGEKIT
  // =========================================================

  const uploadMedia = async (file) => {

    const token = await getToken();

    if (!token) {
      throw new Error(
        "Authentication session not found."
      );
    }


    // Get ImageKit authentication

    const authResponse = await fetch(
      "http://localhost:4000/api/imagekit/auth",
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
        "Failed to authenticate ImageKit upload"
      );
    }


    // Upload to ImageKit

    const uploadResponse = await upload({

      file,

      fileName: file.name,

      token: authData.token,

      signature: authData.signature,

      expire: authData.expire,

      publicKey: authData.publicKey,

      useUniqueFileName: true,

    });


    if (!uploadResponse?.url) {
      throw new Error(
        "ImageKit upload failed"
      );
    }


    return uploadResponse.url;

  };


  // =========================================================
  // CREATE STORY
  // =========================================================

  const handleCreateStory = async () => {

    if (creating) {
      return;
    }


    try {

      setCreating(true);


      const token = await getToken();


      if (!token) {
        throw new Error(
          "Authentication session not found."
        );
      }


      let mediaUrl = "";
      let mediaType = "text";


      // =====================================================
      // TEXT STORY
      // =====================================================

      if (mode === "text") {

        if (!text.trim()) {

          throw new Error(
            "Please enter some text for your story."
          );

        }

        mediaType = "text";

      }


      // =====================================================
      // IMAGE / VIDEO STORY
      // =====================================================

      if (mode === "media") {

        if (!media) {

          throw new Error(
            "Please select an image or video."
          );

        }


        mediaUrl = await uploadMedia(media);


        if (media.type.startsWith("image/")) {

          mediaType = "image";

        } else if (media.type.startsWith("video/")) {

          mediaType = "video";

        } else {

          throw new Error(
            "Only images and videos are supported."
          );

        }

      }


      // =====================================================
      // SAVE STORY TO BACKEND
      // =====================================================

      const response = await fetch(
        "http://localhost:4000/api/stories",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({

            content:
              mediaType === "text"
                ? text.trim()
                : "",

            media_type: mediaType,

            media_url: mediaUrl,

            background_color: background,

          }),
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

        data = await response.json();

      } else {

        const responseText =
          await response.text();

        console.error(
          "Unexpected story response:",
          responseText
        );

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
          "Failed to create story"
        );

      }


      // Refresh stories

      await fetchStories();


      // Close modal

      setShowModal(false);


      // Reset form

      setText("");
      setMedia(null);
      setPreviewUrl(null);
      setMode("text");


      return data;

    } catch (error) {

      console.error(
        "Error creating story:",
        error
      );

      throw error;

    } finally {

      setCreating(false);

    }

  };


  return (

    <div className="fixed inset-0 z-110 min-h-screen bg-black/80 backdrop-blur text-white flex items-center justify-center p-4">

      <div className="w-full max-w-md">


        {/* HEADER */}

        <div className="text-center mb-4 flex items-center justify-between">

          <button
            onClick={() => setShowModal(false)}
            className="text-white p-2 cursor-pointer"
          >
            <ArrowLeft />
          </button>

          <h2 className="text-lg font-semibold">
            Create Story
          </h2>

          <span className="w-10"></span>

        </div>


        {/* STORY PREVIEW */}

        <div
          className="rounded-lg h-72 flex items-center justify-center relative overflow-hidden"
          style={{
            backgroundColor: background
          }}
        >

          {mode === "text" && (

            <textarea
              className="bg-transparent text-white w-full h-full p-6 text-lg resize-none focus:outline-none"
              placeholder="What's in your mind?"
              onChange={(e) =>
                setText(e.target.value)
              }
              value={text}
            />

          )}


          {mode === "media" &&
            previewUrl && (

              media?.type.startsWith(
                "image"
              ) ? (

                <img
                  src={previewUrl}
                  alt=""
                  className="object-contain max-h-full max-w-full"
                />

              ) : (

                <video
                  src={previewUrl}
                  className="object-contain max-h-full max-w-full"
                  controls
                />

              )

            )}

        </div>


        {/* BACKGROUND COLORS */}

        <div className="flex mt-4 gap-2">

          {bgColors.map((color) => (

            <button
              key={color}
              className="w-6 h-6 rounded-full ring cursor-pointer"
              style={{
                backgroundColor: color
              }}
              onClick={() =>
                setBackground(color)
              }
            />

          ))}

        </div>


        {/* MODE BUTTONS */}

        <div className="flex gap-2 mt-4">

          <button
            onClick={() => {

              setMode("text");

              setMedia(null);

              setPreviewUrl(null);

            }}
            className={`
              flex-1
              flex
              items-center
              justify-center
              gap-2
              p-2
              rounded
              cursor-pointer
              ${
                mode === "text"
                  ? "bg-white text-black"
                  : "bg-zinc-800"
              }
            `}
          >

            <TextIcon size={18} />

            Text

          </button>


          <label
            className={`
              flex-1
              flex
              items-center
              justify-center
              gap-2
              p-2
              rounded
              cursor-pointer
              ${
                mode === "media"
                  ? "bg-white text-black"
                  : "bg-zinc-800"
              }
            `}
          >

            <input
              onChange={(e) => {

                handleMediaUpload(e);

                setMode("media");

              }}
              type="file"
              accept="image/*,video/*"
              className="hidden"
            />

            <Upload size={18} />

            Photo/Video

          </label>

        </div>


        {/* CREATE BUTTON */}

        <button
          disabled={creating}
          onClick={() =>
            toast.promise(
              handleCreateStory(),
              {
                loading: "Saving....",

                success: (
                  <p>
                    Story Added
                  </p>
                ),

                error: (e) => (
                  <p>
                    {e.message}
                  </p>
                ),
              }
            )
          }
          className={`
            flex
            items-center
            justify-center
            gap-2
            text-white
            py-3
            mt-4
            w-full
            rounded
            bg-gradient-to-r
            from-indigo-500
            to-purple-600
            hover:from-indigo-600
            hover:to-purple-700
            active:scale-95
            transition
            cursor-pointer
            ${
              creating
                ? "opacity-50 cursor-not-allowed"
                : ""
            }
          `}
        >

          <Sparkle size={18} />

          {creating
            ? "Creating..."
            : "Create Story"}

        </button>


      </div>

    </div>

  );

};

export default StoryModel;