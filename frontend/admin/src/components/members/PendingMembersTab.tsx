import type { PendingMemberDoc } from "@/hooks/members";
import { useMembersFilters } from "@/hooks/members";
import MembersFilterBar from "./MembersFilterBar";
import PendingMembersList from "./PendingMembersList";

type PendingFiltersType = Omit<
  ReturnType<typeof useMembersFilters>,
  "filteredMembers"
> & {
  filteredMembers: PendingMemberDoc[];
};

interface PendingMembersTabProps {
  pendingStatus: "pending" | "approved" | "rejected";
  setPendingStatus: (status: "pending" | "approved" | "rejected") => void;
  pendingFilters: PendingFiltersType;
  pendingLoading: boolean;
  role: string | null;
  onApprove: (pending: PendingMemberDoc) => Promise<void>;
  onReject: (pending: PendingMemberDoc) => Promise<void>;
  onEdit: (pending: PendingMemberDoc) => void;
  currentUserEmail?: string | null;
}

export default function PendingMembersTab({
  pendingStatus,
  setPendingStatus,
  pendingFilters,
  pendingLoading,
  role,
  onApprove,
  onReject,
  onEdit,
  currentUserEmail,
}: PendingMembersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm">
        <span className="text-sm font-bold uppercase tracking-wider opacity-60">
          Status Filter:
        </span>
        <div className="join bg-base-200/50 p-1 rounded-lg">
          {(["pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              className={`join-item btn btn-sm font-semibold capitalize border-none hover:bg-base-100 transition-all ${
                pendingStatus === status
                  ? "bg-base-100 shadow-sm text-primary"
                  : "bg-transparent text-base-content/75"
              }`}
              onClick={() => setPendingStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
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
      {pendingStatus !== "pending" && (
        <div className="text-sm opacity-60 italic -mt-2">
          Showing items updated in the last 30 days.
        </div>
      )}
      <PendingMembersList
        pendingMembers={pendingFilters.filteredMembers}
        loading={pendingLoading}
        role={role}
        onApprove={onApprove}
        onReject={onReject}
        onEdit={onEdit}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
}
