import type { AdminDoc, AdminRole } from "@repo/types";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { AuthContext } from "../context/AuthContext";
import { auth, db, googleProvider } from "../lib";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);

  const { tenantId } = useParams();

  useEffect(() => {
    // If there is no tenantId (e.g. invalid route), we shouldn't attempt to authenticate
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        // Check the tenant-scoped admins allowlist by email
        const adminDocRef = doc(
          db,
          "tenants",
          tenantId,
          "admins",
          currentUser.email!.toLowerCase(),
        );
        const adminSnap = await getDoc(adminDocRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data() as AdminDoc;
          setUser(currentUser);
          setIsAuthorized(true);
          setRole(adminData.role);
        } else {
          // Not on the allowlist — keep user but mark as unauthorized
          setUser(currentUser);
          setIsAuthorized(false);
          setRole(null);
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenantId]);

  const login = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = { user, loading, isAuthorized, role, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
