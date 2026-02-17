export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface BookmarkInput {
  url: string;
  title: string;
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
  }
}
