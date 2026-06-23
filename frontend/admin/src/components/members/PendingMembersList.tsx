import type { PendingMemberDoc } from "@/hooks/members";
import { Users } from "lucide-react";
import { DateTime } from "luxon";

export interface PendingMembersListProps {
  pendingMembers: PendingMemberDoc[];
  loading: boolean;
  role: string | null;
  onApprove: (pending: PendingMemberDoc) => void | Promise<void>;
  onReject: (pending: PendingMemberDoc) => void | Promise<void>;
  onEdit?: (pending: PendingMemberDoc) => void;
  currentUserEmail?: string | null;
}

export default function PendingMembersList({
  pendingMembers,
  loading,
  role,
  onApprove,
  onReject,
  onEdit,
  currentUserEmail,
}: PendingMembersListProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div
          data-testid="pending-loading-spinner"
          className="loading loading-spinner loading-md text-primary"
        ></div>
      </div>
    );
  }

  if (pendingMembers.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-200 shadow-md p-12 text-center">
        <Users className="w-12 h-12 opacity-30 mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-bold">No Requests Found</h3>
        <p className="text-sm opacity-60 mt-1">
          There are no member requests for the selected status.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      data-testid="pending-approvals-list"
    >
      {pendingMembers.map((pending) => (
        <div
          key={pending.id}
          className="card bg-base-100 border border-base-200 shadow-lg hover:shadow-xl transition-all duration-300"
          data-testid="pending-member-card"
        >
          <div className="card-body p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-base-200 pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-base-content">
                    {pending.firstName} {pending.lastName}
                  </h3>
                  <div
                    className={`badge badge-sm font-semibold ${
                      pending.status === "approved"
                        ? "badge-success text-white"
                        : pending.status === "rejected"
                          ? "badge-error text-white"
                          : "badge-warning"
                    }`}
                  >
                    {pending.status.toUpperCase()}
                  </div>
                </div>
                <span className="badge badge-sm badge-secondary badge-outline mt-1 font-semibold">
                  {pending.type || "New Addition"}
                </span>
              </div>
              <div className="text-left sm:text-right text-xs opacity-60 space-y-0.5">
                <div>
                  Requested:{" "}
                  {DateTime.fromISO(pending.createdAt).toLocaleString(
                    DateTime.DATETIME_MED,
                  )}
                </div>
                <div className="truncate max-w-[280px] sm:max-w-none">
                  By: {pending.createdBy}
                </div>
              </div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-1 sm:col-span-2">
                <span className="opacity-60 block text-xs font-medium">
                  Email
                </span>
                <span className="font-semibold break-all">
                  {pending.email || "-"}
                </span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Phone
                </span>
                <span className="font-semibold">{pending.phone || "-"}</span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Gender
                </span>
                <span className="font-semibold">{pending.gender || "-"}</span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Birthdate
                </span>
                <span className="font-semibold">
                  {pending.birthdate
                    ? DateTime.fromISO(pending.birthdate).toLocaleString(
                        DateTime.DATE_MED,
                      )
                    : "-"}
                </span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Pledge
                </span>
                <span className="font-semibold text-success">
                  {pending.pledge
                    ? `$${Number(pending.pledge).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "-"}
                </span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Super Region
                </span>
                <span className="font-semibold">
                  {pending.superRegion || "-"}
                </span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Region
                </span>
                <span className="font-semibold">{pending.region || "-"}</span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Ministry
                </span>
                <span className="font-semibold">{pending.ministry || "-"}</span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Membership Start Date
                </span>
                <span className="font-semibold">
                  {pending.membershipStartDate
                    ? DateTime.fromISO(
                        pending.membershipStartDate,
                      ).toLocaleString(DateTime.DATE_MED)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="opacity-60 block text-xs font-medium">
                  Baptized Date
                </span>
                <span className="font-semibold">
                  {pending.baptizedDate
                    ? DateTime.fromISO(pending.baptizedDate).toLocaleString(
                        DateTime.DATE_MED,
                      )
                    : "-"}
                </span>
              </div>
            </div>

            {/* Actions */}
            {pending.status === "pending" &&
              (role === "admin" ||
                role === "superAdmin" ||
                (role === "editor" &&
                  currentUserEmail &&
                  pending.createdBy &&
                  pending.createdBy.toLowerCase() ===
                    currentUserEmail.toLowerCase())) && (
                <div className="flex flex-row justify-end gap-3 pt-3 border-t border-base-200 mt-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(pending)}
                      className="btn btn-outline btn-sm flex-1 sm:flex-initial"
                      data-testid="edit-button"
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                  {(role === "admin" || role === "superAdmin") && (
                    <>
                      <button
                        onClick={() => onReject(pending)}
                        className="btn btn-outline btn-error btn-sm flex-1 sm:flex-initial"
                        data-testid="reject-button"
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => onApprove(pending)}
                        className="btn btn-success btn-sm text-white flex-1 sm:flex-initial"
                        data-testid="approve-button"
                        type="button"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
