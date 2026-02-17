"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase/client";
import { Bookmark } from "@/types/bookmark";
import { BookmarkItem } from "./BookmarkItem";
import { AddBookmarkForm } from "./AddBookmarkForm";
import { AuthButton } from "./AuthButton";
import { Toast } from "./Toast";
import { ThemeToggle } from "./ThemeToggle";

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
            // Handle both payload.old?.id and payload.new?.id for DELETE events
            // Supabase may send the deleted record ID in different locations
            const deletedId = (payload.old as Bookmark | undefined)?.id ?? (payload.new as Bookmark | undefined)?.id;
            if (deletedId) {
              setBookmarks((prev) =>
                prev.filter((bookmark) => bookmark.id !== deletedId)
              );
              setToast({ message: "Bookmark deleted", type: "success" });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedBookmark = payload.new as Bookmark;
            setBookmarks((prev) =>
              prev.map((bookmark) =>
                bookmark.id === updatedBookmark.id
                  ? updatedBookmark
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="text-center max-w-md">
          <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <span className="text-[var(--accent)] font-bold text-xl">SB</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            Smart Bookmark
          </h1>
          <p className="text-sm text-[var(--muted)] mb-8">
            Clean, private, real-time bookmarks.
          </p>
          <p className="text-[var(--foreground)] mb-6 text-sm">
            Sign in with Google to save and sync your bookmarks across devices.
          </p>
          <AuthButton />
          <p className="text-xs text-[var(--muted-foreground)] mt-6">
            We only use Google for secure authentication. No passwords to remember.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Header */}
      <header className="bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
              <span className="text-[var(--accent)] font-bold text-sm">SB</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--foreground)]">Smart Bookmark</h1>
              <p className="text-xs text-[var(--muted)]">
                Signed in as {session.user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Add Bookmark Form */}
        <div className="mb-8">
          <AddBookmarkForm onBookmarkAdded={handleBookmarkAdded} />
        </div>

        {/* Bookmarks List */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Your bookmarks</h2>
            <span className="text-sm text-[var(--muted)]">
              {bookmarks.length} {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--border)] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-[var(--muted)]"
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
              <h3 className="text-[var(--foreground)] mb-2">No bookmarks yet</h3>
              <p className="text-[var(--muted)] text-sm">
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
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--muted)]">
                    Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, bookmarks.length)} of {bookmarks.length} bookmarks
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
