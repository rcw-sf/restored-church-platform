import { db } from "@/lib";
import { getLocalIsoDate } from "@/utils/formatters";
import type {
  MemberDoc,
  AdditionType,
  Region,
  SuperRegion,
  Ministry,
} from "@repo/types";
import {
  collection,
  doc,
  writeBatch,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export interface PendingMemberDoc {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  baptizedDate?: string;
  type?: AdditionType;
  pledge?: number;
  region?: Region;
  superRegion?: SuperRegion;
  ministry?: Ministry;
  membershipStartDate?: string;
  requestType: "create" | "update" | "remove";
  status: "pending" | "approved" | "rejected";
  targetMemberId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export function usePendingMembers() {
  const [pendingMembers, setPendingMembers] = useState<PendingMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<
    "pending" | "approved" | "rejected"
  >("pending");

  const { tenantId } = useParams();

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const collRef = collection(db, "tenants", tenantId, "pending_members");
    const q = query(collRef, where("status", "==", pendingStatus));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: PendingMemberDoc[] = [];
        snapshot.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as PendingMemberDoc);
        });

        // Sort by lastName then firstName
        list.sort((a, b) => {
          const lastCompare = (a.lastName || "").localeCompare(
            b.lastName || "",
          );
          if (lastCompare !== 0) return lastCompare;
          return (a.firstName || "").localeCompare(b.firstName || "");
        });

        setPendingMembers(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching pending members:", err);
        setError("Failed to load pending members.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [tenantId, pendingStatus]);

  const approveMember = async (pendingMember: PendingMemberDoc) => {
    if (!tenantId) throw new Error("Tenant ID is not available");

    const batch = writeBatch(db);

    if (
      pendingMember.requestType === "update" &&
      pendingMember.targetMemberId
    ) {
      // Update existing member document
      const memberDocRef = doc(
        db,
        "tenants",
        tenantId,
        "members",
        pendingMember.targetMemberId,
      );
      const updatedMemberData = {
        firstName: pendingMember.firstName,
        lastName: pendingMember.lastName,
        gender: pendingMember.gender || "",
        email: pendingMember.email || "",
        phone: pendingMember.phone || "",
        birthdate: pendingMember.birthdate || "",
        baptizedDate: pendingMember.baptizedDate || "",
        type: pendingMember.type || "",
        pledge: Number(pendingMember.pledge || 0),
        region: pendingMember.region || "",
        superRegion: pendingMember.superRegion || "",
        ministry: pendingMember.ministry || "",
        membershipStartDate:
          pendingMember.membershipStartDate || getLocalIsoDate(),
        updatedAt: new Date().toISOString(),
      };
      batch.update(memberDocRef, updatedMemberData);
    } else {
      // Create a new member document in 'members' collection
      const membersCollRef = collection(db, "tenants", tenantId, "members");
      const newMemberDocRef = doc(membersCollRef);
      const newMemberId = newMemberDocRef.id;

      const newMemberData: MemberDoc = {
        firstName: pendingMember.firstName,
        lastName: pendingMember.lastName,
        gender: pendingMember.gender || "",
        email: pendingMember.email || "",
        phone: pendingMember.phone || "",
        birthdate: pendingMember.birthdate || "",
        baptizedDate: pendingMember.baptizedDate || "",
        type: pendingMember.type || "",
        pledge: Number(pendingMember.pledge || 0),
        region: pendingMember.region || "",
        superRegion: pendingMember.superRegion || "",
        ministry: pendingMember.ministry || "",
        membershipStartDate:
          pendingMember.membershipStartDate || getLocalIsoDate(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId,
      };

      batch.set(newMemberDocRef, newMemberData);

      // Create a historical record in 'additions' collection
      const additionsCollRef = collection(db, "tenants", tenantId, "additions");
      const newAdditionDocRef = doc(additionsCollRef);
      const newAdditionData = {
        id: newMemberId,
        firstName: pendingMember.firstName,
        lastName: pendingMember.lastName,
        type: pendingMember.type || "",
        baptizedDate: pendingMember.baptizedDate || "",
        membershipStartDate:
          pendingMember.membershipStartDate || getLocalIsoDate(),
        region: pendingMember.region || "",
        superRegion: pendingMember.superRegion || "",
        ministry: pendingMember.ministry || "",
        createdAt: new Date().toISOString(),
      };

      batch.set(newAdditionDocRef, newAdditionData);
    }

    // Update status in 'pending_members' instead of deleting it
    const pendingDocRef = doc(
      db,
      "tenants",
      tenantId,
      "pending_members",
      pendingMember.id,
    );
    batch.update(pendingDocRef, {
      status: "approved",
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
  };

  const rejectMember = async (pendingMember: PendingMemberDoc) => {
    if (!tenantId) throw new Error("Tenant ID is not available");

    const pendingDocRef = doc(
      db,
      "tenants",
      tenantId,
      "pending_members",
      pendingMember.id,
    );
    await updateDoc(pendingDocRef, {
      status: "rejected",
      updatedAt: new Date().toISOString(),
    });
  };

  return {
    pendingMembers,
    loading,
    error,
    approveMember,
    rejectMember,
    setPendingStatus,
  };
}
