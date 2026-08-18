import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import UserCard from "../components/UserCard";
import Loading from "../components/Loading";

const Discover = () => {
  const { getToken } = useAuth();

  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (searchText = "") => {
    try {
      setLoading(true);

      const token = await getToken();

      const response = await fetch(
        `https://stayintouch-server.onrender.com/api/users?search=${encodeURIComponent(
          searchText
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch users");
      }

      setUsers(data.users);

    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when Discover page opens
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      fetchUsers(input);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-6">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Discover People
          </h1>

          <p className="text-slate-600">
            Connect with amazing people and grow your network.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8 shadow-md rounded-md border border-slate-200/60 bg-white/80">
          <div className="p-6">
            <div className="relative">

              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"
              />

              <input
                type="text"
                placeholder="Search people by name, username, bio or location..."
                className="pl-10 sm:pl-12 py-2 w-full border text-slate-500 border-gray-300 rounded-md max-sm:text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleSearch}
              />

            </div>
          </div>
        </div>

        {/* Users */}
        {!loading && (
          <div className="flex flex-wrap gap-6">

            {users.length > 0 ? (
              users.map((user) => (
                <UserCard
                  user={user}
                  key={user._id}
                />
              ))
            ) : (
              <div className="w-full text-center py-10 text-slate-500">
                No users found.
              </div>
            )}

          </div>
        )}

        {/* Loading */}
        {loading && (
          <Loading height="60vh" />
        )}

      </div>
    </div>
  );
};

export default Discover;
