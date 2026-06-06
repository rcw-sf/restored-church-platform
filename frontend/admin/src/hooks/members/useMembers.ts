import { db } from "@/lib";
import type { MemberDoc } from "@repo/types";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export function useMembers() {
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { tenantId } = useParams();

  const refetch = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!tenantId) {
          throw new Error("Tenant ID is not available in the URL.");
        }
        const collRef = collection(db, "tenants", tenantId, "members");
        const querySnapshot = await getDocs(collRef);
        const memberList: MemberDoc[] = [];
        querySnapshot.forEach((docSnap) => {
          memberList.push({ id: docSnap.id, ...docSnap.data() } as MemberDoc);
        });

        // Sort members: by last name then first name
        memberList.sort((a, b) => {
          const lastCompare = (a.lastName || "").localeCompare(
            b.lastName || "",
          );
          if (lastCompare !== 0) return lastCompare;
          return (a.firstName || "").localeCompare(b.firstName || "");
        });

        setMembers(memberList);
      } catch (err) {
        console.error("Error fetching members from Firestore:", err);
        setError(
          "Failed to load members. Please check your network or permissions.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchMembers();
  }, [tenantId, refreshTrigger]);

  return { members, loading, error, refetch };
}
