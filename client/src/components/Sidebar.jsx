import React, { useEffect, useState, useCallback } from "react";
import MenuItems from "./MenuItems";
import { CirclePlus, LogOut, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserButton,
  useClerk,
  useAuth,
} from "@clerk/clerk-react";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  const { signOut } = useClerk();
  const { getToken } = useAuth();

  const [user, setUser] = useState(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // =========================================================
  // FETCH CURRENT USER
  // =========================================================

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        "http://localhost:4000/api/users/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to fetch user"
        );
      }

      setUser(data.user);

    } catch (error) {
      console.error(
        "Error fetching current user:",
        error
      );
    }
  }, [getToken]);

  // =========================================================
  // FETCH UNREAD NOTIFICATION COUNT
  // =========================================================

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        "http://localhost:4000/api/notifications/unread-count",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to fetch unread count"
        );
      }

      setUnreadCount(data.unreadCount || 0);

    } catch (error) {
      console.error(
        "Error fetching unread notification count:",
        error
      );
    }
  }, [getToken]);

  // =========================================================
  // FETCH UNREAD MESSAGE COUNT
  // =========================================================

  const fetchUnreadMessageCount = useCallback(async () => {
    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch(
        "http://localhost:4000/api/messages/unread-count",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to fetch unread message count"
        );
      }

      setUnreadMessageCount(
        data.unreadCount || 0
      );

    } catch (error) {
      console.error(
        "Error fetching unread message count:",
        error
      );
    }
  }, [getToken]);

  // =========================================================
  // INITIAL FETCH
  // =========================================================

  useEffect(() => {
    fetchCurrentUser();
    fetchUnreadCount();
    fetchUnreadMessageCount();

    // Backup refresh every 15 seconds
    const interval = setInterval(() => {
      fetchCurrentUser();
      fetchUnreadCount();
      fetchUnreadMessageCount();
    }, 15000);

    // Messages marked as read
    const handleMessagesRead = () => {
      fetchUnreadMessageCount();
    };

    // Profile updated from ProfileModal
    const handleProfileUpdated = (event) => {
      if (event.detail) {
        setUser(event.detail);
      } else {
        fetchCurrentUser();
      }
    };

    window.addEventListener(
      "messages-read",
      handleMessagesRead
    );

    window.addEventListener(
      "profile-updated",
      handleProfileUpdated
    );

    return () => {
      clearInterval(interval);

      window.removeEventListener(
        "messages-read",
        handleMessagesRead
      );

      window.removeEventListener(
        "profile-updated",
        handleProfileUpdated
      );
    };
  }, [
    fetchCurrentUser,
    fetchUnreadCount,
    fetchUnreadMessageCount,
  ]);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className={`
        w-60 xl:w-72
        bg-white
        border-r border-gray-200
        flex flex-col
        justify-between
        items-center
        max-sm:absolute
        top-0
        bottom-0
        z-20

        ${
          sidebarOpen
            ? "translate-x-0"
            : "max-sm:-translate-x-full"
        }

        transition-all
        duration-300
        ease-in-out
      `}
    >

      {/* =====================================================
          TOP SECTION
      ===================================================== */}

      <div className="w-full">

        {/* Logo */}

        <img
          onClick={() => navigate("/")}
          src="/logo2.png"
          alt="Logo"
          className="w-44 ml-7 my-2 cursor-pointer"
        />

        <hr className="border-gray-300 mb-8" />


        {/* MAIN MENU */}

        <MenuItems
          setSidebarOpen={setSidebarOpen}
          unreadMessageCount={unreadMessageCount}
        />


        {/* NOTIFICATIONS */}

        <Link
          to="/notifications"
          onClick={() => setSidebarOpen(false)}
          className="
            relative
            mx-4
            mt-4
            flex
            items-center
            gap-3
            px-4
            py-2.5
            rounded-lg
            text-slate-700
            hover:bg-slate-50
            transition
          "
        >

          <div className="relative">

            <Bell className="w-5 h-5" />

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -top-2
                  -right-2
                  min-w-4
                  h-4
                  px-1
                  rounded-full
                  bg-red-500
                  text-white
                  text-[10px]
                  font-bold
                  flex
                  items-center
                  justify-center
                "
              >
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}

          </div>

          <span className="text-sm font-medium">
            Notifications
          </span>

        </Link>


        {/* CREATE POST */}

        <Link
          to="/create-post"
          onClick={() => setSidebarOpen(false)}
          className="
            flex
            items-center
            justify-center
            gap-2
            py-2.5
            mt-6
            mx-6
            rounded-lg
            bg-gradient-to-r
            from-indigo-500
            to-purple-600
            hover:from-indigo-700
            hover:to-purple-800
            active:scale-95
            transition
            text-white
            cursor-pointer
            shadow-md
          "
        >

          <CirclePlus className="w-5 h-5" />

          Create Post

        </Link>

      </div>


      {/* =====================================================
          BOTTOM USER SECTION
      ===================================================== */}

      <div
        className="
          w-full
          border-t
          border-gray-200
          p-4
          px-7
          flex
          items-center
          justify-between
        "
      >

        {user ? (

          <div
            className="flex gap-2 items-center cursor-pointer"
            onClick={() => navigate("/profile")}
          >

            {/* REAL PROFILE PICTURE */}

            <img
              src={
                user.profile_picture ||
                "/default-avatar.png"
              }
              alt={user.full_name || "User"}
              className="
                w-9
                h-9
                rounded-full
                object-cover
                border
                border-gray-200
              "
            />

            <div className="min-w-0">

              <h1 className="text-sm font-medium truncate max-w-[130px]">
                {user.full_name}
              </h1>

              <p className="text-xs text-gray-500 truncate max-w-[130px]">
                @{user.username}
              </p>

            </div>

          </div>

        ) : (

          <div className="flex gap-2 items-center">

            <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />

            <div>
              <div className="w-24 h-3 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-16 h-2 bg-gray-200 rounded animate-pulse" />
            </div>

          </div>

        )}


        {/* LOGOUT */}

        <LogOut
          onClick={() => signOut()}
          className="
            w-4.5
            text-gray-400
            hover:text-gray-700
            transition
            cursor-pointer
          "
        />

      </div>

    </div>
  );
};

export default Sidebar;