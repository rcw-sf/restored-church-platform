import type { MemberDoc } from "@repo/types";

interface MemberMobileTableProps {
  members: MemberDoc[];
  setSelectedMember: (member: MemberDoc) => void;
}

export default function MembersMobileTable({
  members,
  setSelectedMember,
}: MemberMobileTableProps) {
  return (
    <div className="block md:hidden divide-y divide-base-200">
      {members.length > 0 ? (
        members.map((member) => (
          <div
            key={member.id}
            onClick={() => setSelectedMember(member)}
            className="p-4 hover:bg-base-200/30 active:bg-base-200/50 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="font-semibold text-base text-base-content">
                {member.firstName} {member.lastName}
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {member.superRegion && (
                  <span className="badge badge-secondary badge-outline badge-xs font-semibold">
                    {member.superRegion}
                  </span>
                )}
                {member.region && (
                  <span className="badge badge-primary badge-outline badge-xs font-semibold">
                    {member.region}
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs space-y-1">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline block w-fit"
                >
                  {member.email}
                </a>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-70 hover:underline block w-fit"
                >
                  {member.phone}
                </a>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-base-200/50">
              <div>
                {member.ministry ? (
                  <span className="text-xs font-semibold">
                    {member.ministry}
                  </span>
                ) : (
                  <span className="text-xs opacity-40">-</span>
                )}
              </div>
              <div>
                {member.pledge && member.pledge > 0 ? (
                  <span className="badge badge-success badge-outline font-semibold whitespace-nowrap text-xs">
                    $
                    {member.pledge.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : (
                  <span className="text-xs opacity-40">-</span>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 opacity-50 text-sm">
          No members match the filter criteria.
        </div>
      )}
    </div>
  );
}
