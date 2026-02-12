import { get } from "./http";

export interface GroupUserSearchItem {
  id: string;
  user_id: string | null;
  name: string;
  nickname: string | null;
}

export function searchGroupUsers(
  query: string,
  limit = 20
): Promise<GroupUserSearchItem[]> {
  const trimmed = query.trim();

  return get<GroupUserSearchItem[]>("/api/users", {
    q: trimmed || undefined,
    limit,
  });
}
