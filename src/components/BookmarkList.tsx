"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase/client";
import { Bookmark } from "@/types/bookmark";
import { BookmarkItem } from "./BookmarkItem";
import { AddBookmarkForm } from "./AddBookmarkForm";
import { AuthButton } from "./AuthButton";
import { Toast } from "./Toast";

export function BookmarkList() {
  const { data: session, status } = useSession();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchBookmarks = useCallback(async () => {
    if (!session?.user?.id) {
      setBookmarks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bookmarks");
      
      if (!response.ok) {
        throw new Error("Failed to fetch bookmarks");
      }

      const data = await response.json();
      setBookmarks(data || []);
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
      setError("Failed to load bookmarks");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Set up Supabase Realtime subscription for live updates
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log("Setting up realtime subscription for user:", session.user.id);

    const subscription = supabase
      .channel(`bookmarks:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log("Realtime update received:", payload);

          if (payload.eventType === "INSERT") {
            setBookmarks((prev) => [payload.new as Bookmark, ...prev]);
            setToast({ message: "Bookmark added", type: "success" });
          } else if (payload.eventType === "DELETE") {
            setBookmarks((prev) =>
              prev.filter((bookmark) => bookmark.id !== payload.old.id)
            );
            setToast({ message: "Bookmark deleted", type: "success" });
          } else if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((bookmark) =>
                bookmark.id === payload.new.id
                  ? (payload.new as Bookmark)
                  : bookmark
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      console.log("Cleaning up realtime subscription");
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  const handleBookmarkAdded = () => {
    fetchBookmarks();
    setToast({ message: "Bookmark added successfully", type: "success" });
  };

  const handleBookmarkDeleted = () => {
    fetchBookmarks();
    setToast({ message: "Bookmark deleted", type: "success" });
  };

  // Pagination logic
  const totalPages = Math.ceil(bookmarks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookmarks = bookmarks.slice(startIndex, startIndex + itemsPerPage);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-4">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="text-center max-w-md">
          <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-cyan-400 font-bold text-xl">SB</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Smart Bookmark
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Clean, private, real-time bookmarks.
          </p>
          <p className="text-gray-300 mb-6 text-sm">
            Sign in with Google to save and sync your bookmarks across devices.
          </p>
          <AuthButton />
          <p className="text-xs text-gray-500 mt-6">
            We only use Google for secure authentication. No passwords to remember.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Header */}
      <header className="bg-[#111]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <span className="text-cyan-400 font-bold text-sm">SB</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Smart Bookmark</h1>
              <p className="text-xs text-gray-500">
                Signed in as {session.user?.email}
              </p>
            </div>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Add Bookmark Form */}
        <div className="mb-8">
          <AddBookmarkForm onBookmarkAdded={handleBookmarkAdded} />
        </div>

        {/* Bookmarks List */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Your bookmarks</h2>
            <span className="text-sm text-gray-500">
              {bookmarks.length} {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <h3 className="text-gray-300 mb-2">No bookmarks yet</h3>
              <p className="text-gray-500 text-sm">
                Add your first bookmark above to get started
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedBookmarks.map((bookmark) => (
                  <BookmarkItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    onDelete={handleBookmarkDeleted}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                  <p className="text-sm text-gray-500">
                    Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, bookmarks.length)} of {bookmarks.length} bookmarks
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
