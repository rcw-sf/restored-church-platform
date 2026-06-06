import Pagination from "@/components/Pagination";
import {
  MemberDetailsModal,
  MembersDesktopTable,
  MembersMobileTable,
  MemberFormModal,
  PendingMembersList,
  MembersFilterBar,
} from "@/components/members";
import { useAuth } from "@/hooks";
import {
  useMembers,
  useMembersFilters,
  usePendingMembers,
  type PendingMemberDoc,
} from "@/hooks/members";
import type { MemberDoc } from "@repo/types";
import { DollarSign, MapPin, Users, UserPlus } from "lucide-react";
import { useState } from "react";

export default function Members() {
  const { role, user } = useAuth();
  const { members, loading, error, refetch: refetchActive } = useMembers();
  const {
    pendingMembers,
    approveMember,
    rejectMember,
    loading: pendingLoading,
  } = usePendingMembers();

  const activeFilters = useMembersFilters(members);
  const pendingFilters = useMembersFilters(pendingMembers);

  const {
    filteredMembers,
    totalCount,
    totalPledged,
    uniqueRegions,
    resetFilters,
    setSearchTerm,
    setRegionFilter,
    setSuperRegionFilter,
    setMinistryFilter,
    regionOptions,
    superRegionOptions,
    ministryOptions,
    searchTerm,
    regionFilter,
    superRegionFilter,
    ministryFilter,
  } = activeFilters;

  // Search & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"active" | "pending">("active");
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handleRegionChange = (value: string) => {
    setRegionFilter(value);
    setCurrentPage(1);
  };
  const handleSuperRegionChange = (value: string) => {
    setSuperRegionFilter(value);
    setCurrentPage(1);
  };
  const handleMinistryChange = (value: string) => {
    setMinistryFilter(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    resetFilters();
    setCurrentPage(1);
  };

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

  // Paginated list
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

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
            {pendingMembers.length > 0 && (
              <span className="badge badge-sm badge-primary animate-pulse">
                {pendingMembers.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Active Tab View */}
      {activeTab === "active" ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="card bg-base-100/60 backdrop-blur border border-base-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="card-body p-6 flex flex-row items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    Total Members
                  </p>
                  <h3 className="text-3xl font-bold mt-1">{totalCount}</h3>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card bg-base-100/60 backdrop-blur border border-base-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="card-body p-6 flex flex-row items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    Total Pledged
                  </p>
                  <h3 className="text-3xl font-bold mt-1 text-primary">
                    $
                    {totalPledged.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h3>
                </div>
                <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card bg-base-100/60 backdrop-blur border border-base-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="card-body p-6 flex flex-row items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    Regions Represented
                  </p>
                  <h3 className="text-3xl font-bold mt-1">{uniqueRegions}</h3>
                </div>
                <div className="p-3 bg-info/10 text-info rounded-xl">
                  <MapPin className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          <MembersFilterBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            regionFilter={regionFilter}
            onRegionChange={handleRegionChange}
            superRegionFilter={superRegionFilter}
            onSuperRegionChange={handleSuperRegionChange}
            ministryFilter={ministryFilter}
            onMinistryChange={handleMinistryChange}
            regionOptions={regionOptions}
            superRegionOptions={superRegionOptions}
            ministryOptions={ministryOptions}
            onResetFilters={handleResetFilters}
          />

          {/* Members Table */}
          <div className="card bg-base-100 border border-base-200 shadow-lg overflow-hidden">
            {/* Mobile View List (hidden on md and up) */}
            <MembersMobileTable
              members={paginatedMembers}
              setSelectedMember={setSelectedMember}
            />

            {/* Desktop View Table (hidden on mobile) */}
            <MembersDesktopTable
              members={paginatedMembers}
              setSelectedMember={setSelectedMember}
            />

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredMembers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              itemName="members"
            />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <MembersFilterBar
            searchTerm={pendingFilters.searchTerm}
            onSearchChange={pendingFilters.setSearchTerm}
            regionFilter={pendingFilters.regionFilter}
            onRegionChange={pendingFilters.setRegionFilter}
            superRegionFilter={pendingFilters.superRegionFilter}
            onSuperRegionChange={pendingFilters.setSuperRegionFilter}
            ministryFilter={pendingFilters.ministryFilter}
            onMinistryChange={pendingFilters.setMinistryFilter}
            regionOptions={pendingFilters.regionOptions}
            superRegionOptions={pendingFilters.superRegionOptions}
            ministryOptions={pendingFilters.ministryOptions}
            onResetFilters={pendingFilters.resetFilters}
          />
          <PendingMembersList
            pendingMembers={pendingFilters.filteredMembers}
            loading={pendingLoading}
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
        </div>
      )}

      {/* Member Details Modal */}
      <MemberDetailsModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onEdit={(member) => {
          // Check if there is an active pending update request for this member
          const pendingEditRequest = pendingMembers.find(
            (pending) =>
              pending.targetMemberId === member.individualId &&
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
            setEditMemberId(member.individualId || null);
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
        initialData={formInitialData}
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
