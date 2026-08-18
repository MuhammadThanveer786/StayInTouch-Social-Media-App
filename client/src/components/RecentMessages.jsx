import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import moment from "moment";

const RecentMessages = () => {

  const { getToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // =========================================================
  // FETCH RECENT MESSAGES
  // =========================================================

  const fetchRecentMessages = useCallback(async () => {

    try {

      setError("");

      const token = await getToken();

      if (!token) {
        throw new Error(
          "Authentication session not found."
        );
      }

      const response = await fetch(
        "https://stayintouch-server.onrender.com/api/messages/recent",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {

        data = await response.json();

      } else {

        const responseText = await response.text();

        console.error(
          "Unexpected response from recent messages API:",
          responseText
        );

        throw new Error(
          `Server returned an unexpected response (${response.status}).`
        );

      }

      if (!response.ok || !data?.success) {

        throw new Error(
          data?.message ||
          "Failed to fetch recent messages"
        );

      }

      setMessages(
        Array.isArray(data.recentMessages)
          ? data.recentMessages
          : []
      );

    } catch (error) {

      console.error(
        "Error fetching recent messages:",
        error
      );

      setError(
        error?.message ||
        "Unable to load recent messages."
      );

    } finally {

      setLoading(false);

    }

  }, [getToken]);


  // =========================================================
  // INITIAL FETCH
  // =========================================================

  useEffect(() => {

    fetchRecentMessages();

  }, [fetchRecentMessages]);


  // =========================================================
  // REFRESH WHEN CHAT CHANGES
  // =========================================================

  useEffect(() => {

    const handleMessagesUpdated = () => {

      fetchRecentMessages();

    };

    window.addEventListener(
      "messages-updated",
      handleMessagesUpdated
    );

    return () => {

      window.removeEventListener(
        "messages-updated",
        handleMessagesUpdated
      );

    };

  }, [fetchRecentMessages]);


  // =========================================================
  // REFRESH WHEN USER RETURNS TO FEED
  // =========================================================

  useEffect(() => {

    const handleFocus = () => {

      fetchRecentMessages();

    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {

      window.removeEventListener(
        "focus",
        handleFocus
      );

    };

  }, [fetchRecentMessages]);


  // =========================================================
  // PERIODIC REFRESH
  // =========================================================

  useEffect(() => {

    const interval = setInterval(() => {

      fetchRecentMessages();

    }, 15000);

    return () => clearInterval(interval);

  }, [fetchRecentMessages]);


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (
      <div className="bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md text-xs text-slate-800">

        <h3 className="font-semibold text-slate-800 mb-4">
          Recent Messages
        </h3>

        <div className="flex items-center justify-center py-6">

          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />

        </div>

      </div>
    );

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md text-xs text-slate-800">

      <h3 className="font-semibold text-slate-800 mb-4">
        Recent Messages
      </h3>


      {/* Error */}

      {error && (

        <div className="py-4 text-center">

          <p className="text-red-500 text-xs">
            {error}
          </p>

          <button
            onClick={fetchRecentMessages}
            className="mt-2 text-indigo-500 hover:text-indigo-700 font-medium cursor-pointer"
          >
            Try Again
          </button>

        </div>

      )}


      {/* No messages */}

      {!error && messages.length === 0 && (

        <div className="py-6 text-center">

          <p className="text-slate-400">
            No recent messages
          </p>

        </div>

      )}


      {/* Messages */}

      {!error && messages.length > 0 && (

        <div className="flex flex-col max-h-56 overflow-y-scroll no-scrollbar">

          {messages.map((conversation) => {

            const user = conversation.user;
            const lastMessage = conversation.lastMessage;
            const unreadCount =
              conversation.unreadCount || 0;

            let messagePreview = "No messages yet";

            if (lastMessage) {

              if (lastMessage.message_type === "image") {

                messagePreview = "📷 Image";

              } else {

                messagePreview =
                  lastMessage.text || "Message";

              }

            }

            return (

              <Link
                to={`/messages/${user._id}`}
                key={user._id}
                className="flex items-start gap-2 py-2 px-1 rounded-md hover:bg-slate-100 transition"
              >

                {/* Profile picture */}

                <img
                  src={
                    user.profile_picture ||
                    "/default-avatar.png"
                  }
                  alt={user.full_name || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />


                <div className="w-full min-w-0">

                  {/* Name + time */}

                  <div className="flex justify-between gap-2">

                    <p className="font-medium truncate">
                      {user.full_name}
                    </p>

                    {lastMessage && (

                      <p className="text-[10px] text-slate-400 whitespace-nowrap">

                        {moment(
                          lastMessage.createdAt
                        ).fromNow()}

                      </p>

                    )}

                  </div>


                  {/* Message + unread count */}

                  <div className="flex justify-between items-center gap-2 w-full">

                    <p
                      className={`
                        truncate
                        ${
                          unreadCount > 0
                            ? "text-slate-800 font-medium"
                            : "text-slate-500"
                        }
                      `}
                    >

                      {messagePreview}

                    </p>


                    {unreadCount > 0 && (

                      <span className="bg-indigo-500 text-white min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-medium">

                        {unreadCount > 99
                          ? "99+"
                          : unreadCount}

                      </span>

                    )}

                  </div>

                </div>

              </Link>

            );

          })}

        </div>

      )}

    </div>

  );

};

export default RecentMessages;
