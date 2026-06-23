import {
  MemberDetailsModal,
  MemberFormModal,
  ActiveMembersTab,
  PendingMembersTab,
} from "@/components/members";
import { useAuth } from "@/hooks";
import {
  useMembers,
  useMembersFilters,
  usePendingMembers,
  type PendingMemberDoc,
} from "@/hooks/members";
import type { MemberDoc } from "@repo/types";
import { UserPlus } from "lucide-react";
import { useState } from "react";

export default function Members() {
  const { role, user } = useAuth();
  const { members, loading, error, refetch: refetchActive } = useMembers();
  const {
    pendingMembers,
    pendingCount,
    approveMember,
    rejectMember,
    loading: pendingLoading,
    pendingStatus,
    setPendingStatus,
  } = usePendingMembers();

  const activeFilters = useMembersFilters(members);
  const pendingFilters = useMembersFilters(pendingMembers);

  // Search & Filter State
  const [activeTab, setActiveTab] = useState<string>("active");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<
    "create" | "edit-pending" | "edit-member"
  >("create");
  const [formInitialData, setFormInitialData] = useState<
    PendingMemberDoc | MemberDoc | null
  >(null);
  const [editPendingId, setEditPendingId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [isFormRedirected, setIsFormRedirected] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Selected Member for Modal
  const [selectedMember, setSelectedMember] = useState<MemberDoc | null>(null);

  const handleApprove = async (pending: PendingMemberDoc) => {
    try {
      await approveMember(pending);
      showToast(
        `${pending.firstName} ${pending.lastName} approved successfully!`,
        "success",
      );
      refetchActive();
    } catch (err) {
      console.error(err);
      showToast("Failed to approve member request.", "error");
    }
  };

  const handleReject = async (pending: PendingMemberDoc) => {
    try {
      await rejectMember(pending);
      showToast(
        `Request for ${pending.firstName} ${pending.lastName} rejected.`,
        "success",
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to reject member request.", "error");
    }
  };

  const handleFormSuccess = () => {
    if (formMode === "create") {
      if (role === "editor") {
        showToast(
          "Request to add member submitted for admin review.",
          "success",
        );
      } else {
        showToast("Member added successfully.", "success");
        refetchActive();
      }
    } else if (formMode === "edit-pending") {
      showToast("Pending request updated successfully.", "success");
    } else if (formMode === "edit-member") {
      if (role === "editor") {
        showToast(
          "Request to edit member submitted for admin review.",
          "success",
        );
      } else {
        showToast("Member updated successfully.", "success");
        refetchActive();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div
          data-testid="loading-spinner"
          className="loading loading-spinner loading-lg text-primary"
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error shadow-lg">
          <div className="flex gap-2">
            <span className="font-medium">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "active":
        return (
          <ActiveMembersTab
            activeFilters={activeFilters}
            setSelectedMember={setSelectedMember}
          />
        );
      case "pending":
        return (
          <PendingMembersTab
            pendingStatus={pendingStatus}
            setPendingStatus={setPendingStatus}
            pendingFilters={pendingFilters}
            pendingLoading={pendingLoading}
            role={role}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={(pending) => {
              setFormMode("edit-pending");
              setFormInitialData(pending);
              setEditPendingId(pending.id);
              setIsFormRedirected(false);
              setIsAddModalOpen(true);
            }}
            currentUserEmail={user?.email}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Members
          </h1>
          <p className="text-base opacity-75">
            Browse, search, and manage church members, households, and pledges.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setFormMode("create");
              setFormInitialData(null);
              setIsAddModalOpen(true);
            }}
            className="btn btn-primary shadow-md gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {role === "editor" ? "Request Add Member" : "Add Member"}
          </button>
        </div>
      </div>

      {/* Tabs Layout (Admins and Editors) */}
      {(role === "admin" || role === "superAdmin" || role === "editor") && (
        <div className="tabs tabs-boxed bg-base-200/50 p-1 rounded-xl flex gap-1 self-start overflow-x-auto max-w-full flex-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab("active")}
            className={`tab tab-lg font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "active"
                ? "tab-active bg-base-100 shadow-sm text-primary"
                : "text-base-content/75"
            }`}
          >
            Active Members
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`tab tab-lg font-semibold rounded-lg transition-all gap-2 whitespace-nowrap ${
              activeTab === "pending"
                ? "tab-active bg-base-100 shadow-sm text-primary"
                : "text-base-content/75"
            }`}
          >
            Pending Approvals
            {pendingCount > 0 && (
              <span className="badge badge-sm badge-primary animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
          {/* TODO: Add these tabs back when we have the functionality */}
          {/* <button
            onClick={() => setActiveTab("additions")}
            className={`tab tab-lg font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === "additions"
                ? "tab-active bg-base-100 shadow-sm text-primary"
                : "text-base-content/75"
              }`}
          >
            Additions
          </button>
          <button
            onClick={() => setActiveTab("takeaways")}
            className={`tab tab-lg font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === "takeaways"
                ? "tab-active bg-base-100 shadow-sm text-primary"
                : "text-base-content/75"
              }`}
          >
            Takeaways
          </button> */}
        </div>
      )}

      {/* Dynamic Tab Content */}
      {renderTabContent()}

      {/* Member Details Modal */}
      <MemberDetailsModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onEdit={(member) => {
          // Check if there is an active pending update request for this member
          const pendingEditRequest = pendingMembers.find(
            (pending) =>
              pending.targetMemberId ===
                (member.id || member.pushpayIndividualId) &&
              pending.status === "pending" &&
              pending.requestType === "update",
          );

          if (role === "editor" && pendingEditRequest) {
            setFormMode("edit-pending");
            setFormInitialData(pendingEditRequest);
            setEditPendingId(pendingEditRequest.id);
            setEditMemberId(null);
            setIsFormRedirected(true);
          } else {
            setFormMode("edit-member");
            setFormInitialData(member);
            setEditMemberId(member.id || member.pushpayIndividualId || null);
            setEditPendingId(null);
            setIsFormRedirected(false);
          }
          setSelectedMember(null); // Close the details modal
          setIsAddModalOpen(true); // Open the edit form modal
        }}
      />

      {/* Member Form Modal (Unified Create/Edit) */}
      <MemberFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setFormInitialData(null);
          setEditPendingId(null);
          setEditMemberId(null);
          setIsFormRedirected(false);
        }}
        onSuccess={handleFormSuccess}
        mode={formMode}
        initialData={formInitialData || undefined}
        pendingId={editPendingId || undefined}
        memberId={editMemberId || undefined}
        isRedirected={isFormRedirected}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className="toast toast-end toast-bottom z-[100]"
          data-testid="toast-container"
        >
          <div
            className={`alert shadow-lg py-3 px-5 rounded-xl ${
              toast.type === "success"
                ? "alert-success text-white"
                : "alert-error text-white"
            }`}
          >
            <div className="flex gap-2 items-center">
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
