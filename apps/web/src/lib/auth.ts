import { useQuery } from "@tanstack/react-query";
import { api } from "./api.js";

export interface Me {
  userId: string;
  email: string;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/auth/me"),
    retry: false,
  });
}
