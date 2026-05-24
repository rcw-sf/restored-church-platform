import type { AdminRole } from "@repo/types";
import { type User } from "firebase/auth";
import { createContext } from "react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  role: AdminRole | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
