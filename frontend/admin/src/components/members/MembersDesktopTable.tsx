import type { MemberDoc } from "@repo/types";

export interface MembersDesktopTableProps {
  members: MemberDoc[];
  setSelectedMember: (member: MemberDoc) => void;
}

export default function MembersDesktopTable({
  members,
  setSelectedMember,
}: MembersDesktopTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="table table-hover w-full">
        <thead>
          <tr className="bg-base-200/50 text-sm">
            <th className="font-semibold">Name</th>
            <th className="font-semibold">Contact Info</th>
            <th className="font-semibold">Super Region / Region</th>
            <th className="font-semibold">Ministry</th>
            <th className="font-semibold text-right">Pledge</th>
          </tr>
        </thead>
        <tbody>
          {members.length > 0 ? (
            members.map((member) => (
              <tr
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="cursor-pointer hover:bg-base-200/50 transition-colors"
              >
                <td className="font-medium text-base">
                  {member.firstName} {member.lastName}
                </td>
                <td>
                  <div className="flex flex-col gap-1 text-sm">
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        {member.email}
                      </a>
                    ) : (
                      <span className="opacity-40">-</span>
                    )}
                    {member.phone ? (
                      <a
                        href={`tel:${member.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-70 hover:underline"
                      >
                        {member.phone}
                      </a>
                    ) : null}
                  </div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {member.superRegion && (
                      <span className="badge badge-secondary badge-outline badge-sm font-semibold">
                        {member.superRegion}
                      </span>
                    )}
                    {member.region && (
                      <span className="badge badge-primary badge-outline badge-sm font-semibold">
                        {member.region}
                      </span>
                    )}
                    {!member.region && !member.superRegion && (
                      <span className="opacity-40">-</span>
                    )}
                  </div>
                </td>
                <td>
                  {member.ministry ? (
                    <span className="font-semibold text-sm">
                      {member.ministry}
                    </span>
                  ) : (
                    <span className="opacity-40">-</span>
                  )}
                </td>
                <td className="text-right tabular-nums">
                  {member.pledge && member.pledge > 0 ? (
                    <span className="badge badge-success badge-outline font-semibold">
                      $
                      {member.pledge.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="opacity-40">-</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-12 opacity-50">
                No members match the filter criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
