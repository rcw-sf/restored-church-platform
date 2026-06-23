import type { MemberDoc } from "@repo/types";
import { X } from "lucide-react";
import { DateTime } from "luxon";

interface MemberDetailsModalProps {
  member: MemberDoc | null;
  onClose: () => void;
  onEdit?: (member: MemberDoc) => void;
}

export default function MemberDetailsModal({
  member,
  onClose,
  onEdit,
}: MemberDetailsModalProps) {
  if (!member) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box flex flex-col w-full h-full max-h-none rounded-none border-0 md:border md:border-base-200 md:max-w-2xl md:h-auto md:max-h-[90vh] md:rounded-xl bg-base-100/95 backdrop-blur shadow-2xl relative p-0 overflow-hidden">
        {/* Modal Header banner */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-base-200">
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-2xl font-bold">
            {member.firstName} {member.lastName}
          </h3>
          <p className="text-sm opacity-70 mt-1">
            Member ID: {member.id || "N/A"}
          </p>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto md:max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact and Demographics */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 border-b pb-1">
                Contact & Personal
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-60">Email</span>
                  <span className="font-semibold text-right text-balance">
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="text-primary hover:underline"
                      >
                        {member.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Phone</span>
                  <span className="font-semibold">
                    {member.phone ? (
                      <a
                        href={`tel:${member.phone}`}
                        className="hover:underline"
                      >
                        {member.phone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Gender</span>
                  <span className="font-semibold capitalize">
                    {member.gender || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Birthdate</span>
                  <span className="font-semibold">
                    {member.birthdate
                      ? DateTime.fromISO(member.birthdate).toLocaleString(
                          DateTime.DATE_MED,
                        )
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Baptized Date</span>
                  <span className="font-semibold">
                    {member.baptizedDate
                      ? DateTime.fromISO(member.baptizedDate).toLocaleString(
                          DateTime.DATE_MED,
                        )
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Status & Affiliation */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 border-b pb-1">
                Affiliation & Giving
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-60">Super Region</span>
                  <span className="font-semibold">
                    {member.superRegion || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Region</span>
                  <span className="font-semibold">{member.region || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Ministry</span>
                  <span className="font-semibold">
                    {member.ministry || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Member Type</span>
                  <span className="font-semibold">{member.type || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Pledge</span>
                  <span className="font-semibold text-success">
                    {member.pledge
                      ? `$${member.pledge.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Dates */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 border-b pb-1">
              Membership Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="opacity-60">Start Date</span>
                <span className="font-semibold">
                  {member.membershipStartDate
                    ? DateTime.fromISO(
                        member.membershipStartDate,
                      ).toLocaleString(DateTime.DATE_MED)
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                {member.membershipStopDate && (
                  <div className="flex justify-between">
                    <span className="opacity-60">Stop Date</span>
                    <span className="font-semibold text-error">
                      {DateTime.fromISO(
                        member.membershipStopDate,
                      ).toLocaleString(DateTime.DATE_MED)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {member.takeawayType && (
                <div className="flex justify-between">
                  <span className="opacity-60">Takeaway Type</span>
                  <span className="font-semibold">{member.takeawayType}</span>
                </div>
              )}
              {member.takeawayType === "Fallaway" &&
                member.reasonForFallaway && (
                  <div className="flex justify-between">
                    <span className="opacity-60">Reason for Fallaway</span>
                    <span className="text-error font-semibold">
                      {member.reasonForFallaway}
                    </span>
                  </div>
                )}
              {member.takeawayType === "Transfer" && member.movedTo && (
                <div className="flex justify-between">
                  <span className="opacity-60">Moved To</span>
                  <span className="font-semibold">{member.movedTo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Family Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 border-b pb-1">
              Family / Household
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="opacity-60">Family ID</span>
                <span className="font-mono">{member.familyId || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Family Position</span>
                <span className="font-semibold">
                  {member.familyPosition || "-"}
                </span>
              </div>
            </div>

            {member.familyMembers && member.familyMembers.length > 0 ? (
              <div className="mt-2 border border-base-200 rounded-lg overflow-hidden">
                <table className="table table-compact w-full text-xs">
                  <thead>
                    <tr className="bg-base-200/40">
                      <th>Full Name</th>
                      <th>Position</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.familyMembers.map((fam, idx) => (
                      <tr key={fam.pushpayIndividualId || idx}>
                        <td className="font-semibold">{fam.fullName || "-"}</td>
                        <td>{fam.familyPosition || "-"}</td>
                        <td className="font-mono opacity-60">
                          {fam.pushpayIndividualId || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs opacity-50 italic">
                No family members registered.
              </p>
            )}
          </div>

          {/* Pushpay Integration Keys */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 border-b pb-1">
              Pushpay Integration Info
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex flex-col md:flex-row md:justify-between gap-1 p-2 bg-base-200/50 rounded-lg">
                <span className="opacity-65">Community Member Key:</span>
                <span className="font-semibold break-all">
                  {member.pushpayCommunityMemberKey || "None"}
                </span>
              </div>
              <div className="flex flex-col md:flex-row md:justify-between gap-1 p-2 bg-base-200/50 rounded-lg">
                <span className="opacity-65 flex items-center">
                  Spouse Community Member Key:
                </span>
                <span className="font-semibold break-all">
                  {member.pushpaySpouseCommunityMemberKey || "None"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-base-200/40 p-4 border-t border-base-200 flex justify-end gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(member)}
              className="btn btn-primary btn-sm"
              data-testid="details-edit-button"
              type="button"
            >
              Edit Member
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-neutral btn-sm"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
      <div
        onClick={onClose}
        className="modal-backdrop bg-black/40 backdrop-blur-xs cursor-pointer"
      ></div>
    </div>
  );
}
