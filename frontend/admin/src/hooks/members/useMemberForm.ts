import { db } from "@/lib";
import { getLocalIsoDate } from "@/utils/formatters";
import type { AdditionType, Region, SuperRegion, Ministry } from "@repo/types";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { DateTime } from "luxon";
import { useState } from "react";
import { useParams } from "react-router";

export interface MemberInputData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthdate?: string;
  baptizedDate?: string;
  membershipStartDate?: string;
  type?: AdditionType | "";
  pledge?: number;
  region?: Region | "";
  superRegion?: SuperRegion | "";
  ministry?: Ministry | "";
  pushpayIndividualId?: string;
  pushpayCommunityMemberKey?: string;
  pushpaySpouseCommunityMemberKey?: string;
}

export interface SaveMemberOptions {
  mode: "create" | "edit-pending" | "edit-member";
  role: string | null;
  userEmail: string;
  pendingId?: string; // required for edit-pending
  memberId?: string; // required for edit-member
}

export function useMemberForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tenantId } = useParams();

  const saveMember = async (
    data: MemberInputData,
    options: SaveMemberOptions,
  ) => {
    if (!tenantId) {
      throw new Error("Tenant ID is not available in the URL.");
    }

    setSubmitting(true);
    setError(null);

    const { mode, role, userEmail, pendingId, memberId } = options;
    const isAdmin = role === "superAdmin" || role === "admin";

    try {
      if (mode === "create") {
        if (isAdmin) {
          // Admin Create: Add directly to members collection and additions log in batch
          const batch = writeBatch(db);
          const membersColl = collection(db, "tenants", tenantId, "members");
          const newMemberRef = doc(membersColl);
          const newMemberId = newMemberRef.id;

          const completeMemberData = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || undefined,
            phone: data.phone || undefined,
            gender: data.gender || undefined,
            birthdate: data.birthdate || undefined,
            baptizedDate: data.baptizedDate || undefined,
            type: data.type || undefined,
            pledge: data.pledge ? Number(data.pledge) : undefined,
            region: data.region || undefined,
            superRegion: data.superRegion || undefined,
            ministry: data.ministry || undefined,
            membershipStartDate: data.membershipStartDate || undefined,
            pushpayIndividualId: data.pushpayIndividualId || undefined,
            pushpayCommunityMemberKey:
              data.pushpayCommunityMemberKey || undefined,
            pushpaySpouseCommunityMemberKey:
              data.pushpaySpouseCommunityMemberKey || undefined,
            createdAt: DateTime.now().toISO(),
            updatedAt: DateTime.now().toISO(),
            tenantId,
          };

          batch.set(newMemberRef, completeMemberData);

          const additionsColl = collection(
            db,
            "tenants",
            tenantId,
            "additions",
          );
          const newAdditionRef = doc(additionsColl);
          const additionLogData = {
            id: newMemberId,
            firstName: completeMemberData.firstName,
            lastName: completeMemberData.lastName,
            type: completeMemberData.type || "",
            membershipStartDate:
              completeMemberData.membershipStartDate || getLocalIsoDate(),
            region: completeMemberData.region || "",
            superRegion: completeMemberData.superRegion || "",
            ministry: completeMemberData.ministry || "",
            createdAt: DateTime.now().toISO(),
          };

          batch.set(newAdditionRef, additionLogData);
          await batch.commit();
        } else {
          // Editor Create: Write a pending request (create) to pending_members
          const pendingColl = collection(
            db,
            "tenants",
            tenantId,
            "pending_members",
          );
          const newPendingRef = doc(pendingColl);
          const pendingDoc = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || undefined,
            phone: data.phone || undefined,
            gender: data.gender || undefined,
            birthdate: data.birthdate || undefined,
            baptizedDate: data.baptizedDate || undefined,
            type: data.type || undefined,
            pledge: data.pledge ? Number(data.pledge) : undefined,
            region: data.region || undefined,
            superRegion: data.superRegion || undefined,
            ministry: data.ministry || undefined,
            membershipStartDate: data.membershipStartDate || undefined,
            pushpayIndividualId: data.pushpayIndividualId || undefined,
            pushpayCommunityMemberKey:
              data.pushpayCommunityMemberKey || undefined,
            pushpaySpouseCommunityMemberKey:
              data.pushpaySpouseCommunityMemberKey || undefined,
            requestType: "create",
            status: "pending",
            createdAt: DateTime.now().toISO(),
            updatedAt: DateTime.now().toISO(),
            createdBy: userEmail,
            tenantId,
          };

          await setDoc(newPendingRef, pendingDoc);
        }
      } else if (mode === "edit-pending") {
        if (!pendingId) {
          throw new Error("pendingId is required for edit-pending mode.");
        }
        // Update existing pending_member request document
        const pendingRef = doc(
          db,
          "tenants",
          tenantId,
          "pending_members",
          pendingId,
        );
        const updateDocData = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || undefined,
          phone: data.phone || undefined,
          gender: data.gender || undefined,
          birthdate: data.birthdate || undefined,
          baptizedDate: data.baptizedDate || undefined,
          type: data.type || undefined,
          pledge: data.pledge ? Number(data.pledge) : undefined,
          region: data.region || undefined,
          superRegion: data.superRegion || undefined,
          ministry: data.ministry || undefined,
          membershipStartDate: data.membershipStartDate || undefined,
          pushpayIndividualId: data.pushpayIndividualId || undefined,
          pushpayCommunityMemberKey:
            data.pushpayCommunityMemberKey || undefined,
          pushpaySpouseCommunityMemberKey:
            data.pushpaySpouseCommunityMemberKey || undefined,
          updatedAt: DateTime.now().toISO(),
        };

        await updateDoc(pendingRef, updateDocData);
      } else if (mode === "edit-member") {
        if (!memberId) {
          throw new Error("memberId is required for edit-member mode.");
        }

        if (isAdmin) {
          // Admin Edit: Directly update members collection
          const memberRef = doc(db, "tenants", tenantId, "members", memberId);
          const updateDocData = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || undefined,
            phone: data.phone || undefined,
            gender: data.gender || undefined,
            birthdate: data.birthdate || undefined,
            baptizedDate: data.baptizedDate || undefined,
            type: data.type || undefined,
            pledge: data.pledge ? Number(data.pledge) : undefined,
            region: data.region || undefined,
            superRegion: data.superRegion || undefined,
            ministry: data.ministry || undefined,
            membershipStartDate: data.membershipStartDate || undefined,
            pushpayIndividualId: data.pushpayIndividualId || undefined,
            pushpayCommunityMemberKey:
              data.pushpayCommunityMemberKey || undefined,
            pushpaySpouseCommunityMemberKey:
              data.pushpaySpouseCommunityMemberKey || undefined,
            updatedAt: DateTime.now().toISO(),
          };

          await updateDoc(memberRef, updateDocData);
        } else {
          // Editor Edit: Submit a pending request (update) to pending_members
          const pendingColl = collection(
            db,
            "tenants",
            tenantId,
            "pending_members",
          );
          const newPendingRef = doc(pendingColl);
          const pendingDoc = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || undefined,
            phone: data.phone || undefined,
            gender: data.gender || undefined,
            birthdate: data.birthdate || undefined,
            baptizedDate: data.baptizedDate || undefined,
            type: data.type || undefined,
            pledge: data.pledge ? Number(data.pledge) : undefined,
            region: data.region || undefined,
            superRegion: data.superRegion || undefined,
            ministry: data.ministry || undefined,
            membershipStartDate: data.membershipStartDate || undefined,
            pushpayIndividualId: data.pushpayIndividualId || undefined,
            pushpayCommunityMemberKey:
              data.pushpayCommunityMemberKey || undefined,
            pushpaySpouseCommunityMemberKey:
              data.pushpaySpouseCommunityMemberKey || undefined,
            requestType: "update",
            status: "pending",
            targetMemberId: memberId,
            createdAt: DateTime.now().toISO(),
            updatedAt: DateTime.now().toISO(),
            createdBy: userEmail,
            tenantId,
          };

          await setDoc(newPendingRef, pendingDoc);
        }
      }
    } catch (err) {
      console.error("Error in saveMember:", err);
      const errMsg = "Failed to save member details. Please try again.";
      setError(errMsg);
      throw new Error(errMsg, { cause: err });
    } finally {
      setSubmitting(false);
    }
  };

  return { saveMember, submitting, error, setError };
}
