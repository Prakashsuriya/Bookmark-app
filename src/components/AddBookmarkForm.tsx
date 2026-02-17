"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface AddBookmarkFormProps {
  onBookmarkAdded: () => void;
}

export function AddBookmarkForm({ onBookmarkAdded }: AddBookmarkFormProps) {
  const { data: session } = useSession();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!session?.user?.id) {
      setError("You must be signed in to add bookmarks");
      return;
    }

    // Validate URL
    let validatedUrl = url.trim();
    if (!validatedUrl.startsWith("http://") && !validatedUrl.startsWith("https://")) {
      validatedUrl = "https://" + validatedUrl;
    }

    try {
      new URL(validatedUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: validatedUrl,
          title: title.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add bookmark");
      }

      setUrl("");
      setTitle("");
      onBookmarkAdded();
    } catch (err) {
      setError("Failed to add bookmark. Please try again.");
      console.error("Error adding bookmark:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">Add a new bookmark</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        Bookmarks are private to your account and sync in real-time across tabs.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Optional title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
          disabled={isLoading}
        />
        <input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-[2] px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Adding...</span>
            </>
          ) : (
            "Add bookmark"
          )}
        </button>
      </form>
    </div>
  );
}
