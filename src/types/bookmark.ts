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
