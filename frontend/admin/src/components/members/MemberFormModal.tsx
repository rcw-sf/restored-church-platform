import { useAuth } from "@/hooks";
import { useMemberForm } from "@/hooks/members";
import { formatPhone, getLocalIsoDate } from "@/utils/formatters";
import type { Region, SuperRegion, Ministry, AdditionType } from "@repo/types";
import { X, UserPlus, Edit3, Info } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { DatePicker } from "../DatePicker";

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "create" | "edit-pending" | "edit-member";
  initialData?: MemberInitialData;
  pendingId?: string;
  memberId?: string;
  isRedirected?: boolean;
}

interface MemberInitialData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthdate?: string;
  baptizedDate?: string;
  type?: AdditionType;
  pledge?: number | string;
  superRegion?: SuperRegion;
  region?: Region;
  ministry?: Ministry;
  membershipStartDate?: string;
  pushpayIndividualId?: string;
  pushpayCommunityMemberKey?: string;
  pushpaySpouseCommunityMemberKey?: string;
}

const REGIONS: Region[] = [
  "San Mateo",
  "San Francisco",
  "San Jose",
  "Berkeley",
  "Contra Costa",
  "Hayward",
  "Silicon Valley",
];

const SUPER_REGIONS: SuperRegion[] = ["Peninsula", "South Bay", "East Bay"];

const MINISTRIES: Ministry[] = ["Teens", "Marrieds", "Campus", "Singles"];

const ADDITION_TYPES: AdditionType[] = [
  "Place Membership",
  "Baptism",
  "Restoration",
  "Other",
];

export default function MemberFormModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  initialData,
  pendingId,
  memberId,
  isRedirected = false,
}: MemberFormModalProps) {
  const { user, role } = useAuth();
  const { tenantId } = useParams();
  const { saveMember, submitting, error, setError } = useMemberForm();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [baptizedDate, setBaptizedDate] = useState("");
  const [type, setType] = useState<AdditionType | "">("");
  const [pledge, setPledge] = useState("");
  const [superRegion, setSuperRegion] = useState<SuperRegion | "">("");
  const [region, setRegion] = useState<Region | "">("");
  const [ministry, setMinistry] = useState<Ministry | "">("");
  const [membershipStartDate, setMembershipStartDate] =
    useState(getLocalIsoDate());
  const [pushpayIndividualId, setPushpayIndividualId] = useState("");
  const [pushpayCommunityMemberKey, setPushpayCommunityMemberKey] =
    useState("");
  const [pushpaySpouseCommunityMemberKey, setPushpaySpouseCommunityMemberKey] =
    useState("");

  // Populate data when opening or when initialData changes
  useEffect(() => {
    if (isOpen) {
      setFirstName(initialData?.firstName || "");
      setLastName(initialData?.lastName || "");
      setEmail(initialData?.email || "");
      setPhone(initialData?.phone || "");
      setGender(initialData?.gender || "");
      setBirthdate(initialData?.birthdate || "");
      setBaptizedDate(initialData?.baptizedDate || "");
      setType(initialData?.type || "");
      setPledge(initialData?.pledge != null ? String(initialData.pledge) : "");
      setSuperRegion(initialData?.superRegion || "");
      setRegion(initialData?.region || "");
      setMinistry(initialData?.ministry || "");
      setMembershipStartDate(
        initialData?.membershipStartDate || getLocalIsoDate(),
      );
      setPushpayIndividualId(initialData?.pushpayIndividualId || "");
      setPushpayCommunityMemberKey(
        initialData?.pushpayCommunityMemberKey || "",
      );
      setPushpaySpouseCommunityMemberKey(
        initialData?.pushpaySpouseCommunityMemberKey || "",
      );
    } else {
      // Clear fields when closed
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setGender("");
      setBirthdate("");
      setBaptizedDate("");
      setType("");
      setPledge("");
      setRegion("");
      setSuperRegion("");
      setMinistry("");
      setMembershipStartDate(getLocalIsoDate());
      setPushpayIndividualId("");
      setPushpayCommunityMemberKey("");
      setPushpaySpouseCommunityMemberKey("");
    }
    setError(null);
  }, [isOpen, initialData, setError]);

  if (!isOpen) return null;

  // Auto-fill Super Region when Region is selected
  const handleRegionChange = (selectedRegion: Region | "") => {
    setRegion(selectedRegion);
    if (!selectedRegion) {
      setSuperRegion("");
      return;
    }
    // Determine Super Region based on Region
    if (selectedRegion === "San Francisco" || selectedRegion === "San Mateo") {
      setSuperRegion("Peninsula");
    } else if (
      selectedRegion === "San Jose" ||
      selectedRegion === "Silicon Valley"
    ) {
      setSuperRegion("South Bay");
    } else if (
      selectedRegion === "Berkeley" ||
      selectedRegion === "Contra Costa" ||
      selectedRegion === "Hayward"
    ) {
      setSuperRegion("East Bay");
    }
  };

  const filteredRegions = superRegion
    ? REGIONS.filter((region) => {
        if (superRegion === "Peninsula") {
          return region === "San Francisco" || region === "San Mateo";
        } else if (superRegion === "South Bay") {
          return region === "San Jose" || region === "Silicon Valley";
        } else if (superRegion === "East Bay") {
          return (
            region === "Berkeley" ||
            region === "Contra Costa" ||
            region === "Hayward"
          );
        }
        return true;
      })
    : REGIONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user) return;

    const memberData = {
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      gender: gender || undefined,
      birthdate: birthdate || undefined,
      baptizedDate: baptizedDate || undefined,
      type: type || undefined,
      pledge: pledge ? Number(pledge) : undefined,
      region: region || undefined,
      superRegion: superRegion || undefined,
      ministry: ministry || undefined,
      membershipStartDate: membershipStartDate || undefined,
      pushpayIndividualId: pushpayIndividualId || undefined,
      pushpayCommunityMemberKey: pushpayCommunityMemberKey || undefined,
      pushpaySpouseCommunityMemberKey:
        pushpaySpouseCommunityMemberKey || undefined,
    };

    try {
      await saveMember(memberData, {
        mode,
        role,
        userEmail: user.email || "unknown",
        pendingId,
        memberId,
      });
      onSuccess?.();
      handleClose();
    } catch {
      // Hook sets the error state
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Determine headers and icons dynamically
  const isEdit = mode === "edit-pending" || mode === "edit-member";

  let headerTitle = "";
  let headerDesc = "";

  if (mode === "create") {
    headerTitle = role === "editor" ? "Request Add Member" : "Add New Member";
    headerDesc =
      role === "editor"
        ? "Submit a request to add a new member for administrator review."
        : "Directly add a new active member to the church directory.";
  } else if (mode === "edit-pending") {
    headerTitle = "Edit Pending Request";
    headerDesc = "Modify the details of this pending request.";
  } else if (mode === "edit-member") {
    headerTitle =
      role === "editor" ? "Request Edit Member" : "Edit Member Details";
    headerDesc =
      role === "editor"
        ? "Submit a request to update this member's details for administrator review."
        : "Directly update this member's details in the church directory.";
  }

  let saveButtonText = "";
  if (mode === "create") {
    saveButtonText = role === "editor" ? "Submit Request" : "Add Member";
  } else if (mode === "edit-pending") {
    saveButtonText = "Save Changes";
  } else if (mode === "edit-member") {
    saveButtonText = role === "editor" ? "Submit Edit Request" : "Save Changes";
  }

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      data-testid="member-form-modal"
    >
      <div className="modal-box w-full max-w-2xl bg-base-100 rounded-xl shadow-2xl border border-base-200 p-0 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-base-200 relative">
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            aria-label="Close"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              {isEdit ? (
                <Edit3 className="w-6 h-6" />
              ) : (
                <UserPlus className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">{headerTitle}</h3>
              <p className="text-sm opacity-70 mt-0.5">{headerDesc}</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[75vh] overflow-y-auto"
        >
          {error && (
            <div className="alert alert-error text-sm py-3 px-4 rounded-xl">
              <span>{error}</span>
            </div>
          )}

          {mode === "edit-pending" && isRedirected && (
            <div className="alert alert-info text-sm py-3 px-4 rounded-xl flex items-start gap-2">
              <Info className="w-5 h-5 mt-0.5 shrink-0 text-info" />
              <span>
                You are editing an existing pending request to update this
                member's details. Saving will update the pending request.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="form-control">
              <label htmlFor="first-name-input" className="label py-1">
                <span className="label-text font-semibold">First Name</span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <input
                id="first-name-input"
                type="text"
                required
                placeholder="John"
                className="input input-bordered w-full user-invalid:border-error user-invalid:bg-error/5 peer"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <span className="hidden peer-user-invalid:block text-error text-xs mt-1">
                First name is required.
              </span>
            </div>

            {/* Last Name */}
            <div className="form-control">
              <label htmlFor="last-name-input" className="label py-1">
                <span className="label-text font-semibold">Last Name</span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <input
                id="last-name-input"
                type="text"
                required
                placeholder="Doe"
                className="input input-bordered w-full user-invalid:border-error user-invalid:bg-error/5 peer"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <span className="hidden peer-user-invalid:block text-error text-xs mt-1">
                Last name is required.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="form-control">
              <label htmlFor="email-input" className="label py-1">
                <span className="label-text font-semibold">Email Address</span>
              </label>
              <input
                id="email-input"
                type="email"
                placeholder="john.doe@example.com"
                className="input input-bordered w-full user-invalid:border-error user-invalid:bg-error/5 peer"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span className="hidden peer-user-invalid:block text-error text-xs mt-1">
                Please enter a valid email address.
              </span>
            </div>

            {/* Phone */}
            <div className="form-control">
              <label htmlFor="phone-input" className="label py-1">
                <span className="label-text font-semibold">Phone Number</span>
              </label>
              <input
                id="phone-input"
                type="tel"
                placeholder="(555) 000-0000"
                className="input input-bordered w-full"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gender */}
            <div className="form-control">
              <label htmlFor="gender-input" className="label py-1">
                <span className="label-text font-semibold">Gender</span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <select
                id="gender-input"
                required
                className="select select-bordered w-full"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Birthdate */}
            <div className="form-control">
              <label htmlFor="birthdate-input" className="label py-1">
                <span className="label-text font-semibold">Birthdate</span>
              </label>
              <DatePicker
                id="birthdate-input"
                placeholder="Select Birthdate"
                value={birthdate}
                onChange={setBirthdate}
              />
            </div>

            {/* Pledge */}
            <div className="form-control">
              <label htmlFor="pledge-input" className="label py-1">
                <span className="label-text font-semibold">
                  Pledge Amount ($)
                </span>
              </label>
              <input
                id="pledge-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="input input-bordered w-full"
                value={pledge}
                onChange={(e) => setPledge(e.target.value)}
              />
            </div>
          </div>

          <div className="divider opacity-40">
            Affiliation & Joining details
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Super Region */}
            <div className="form-control">
              <label htmlFor="super-region-input" className="label py-1">
                <span className="label-text font-semibold">Super Region</span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <select
                id="super-region-input"
                required
                className="select select-bordered w-full"
                value={superRegion}
                onChange={(e) => setSuperRegion(e.target.value as SuperRegion)}
              >
                <option value="">Select Super Region</option>
                {SUPER_REGIONS.map((sr) => (
                  <option key={sr} value={sr}>
                    {sr}
                  </option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div className="form-control">
              <label htmlFor="region-input" className="label py-1">
                <span className="label-text font-semibold">Region</span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <select
                id="region-input"
                required
                className="select select-bordered w-full"
                value={region}
                onChange={(e) => handleRegionChange(e.target.value as Region)}
              >
                <option value="">Select Region</option>
                {filteredRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {/* Ministry */}
            <div className="form-control">
              <label htmlFor="ministry-input" className="label py-1">
                <span className="label-text font-semibold">Ministry</span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <select
                id="ministry-input"
                required
                className="select select-bordered w-full"
                value={ministry}
                onChange={(e) => setMinistry(e.target.value as Ministry)}
              >
                <option value="">Select Ministry</option>
                {MINISTRIES.map((ministry) => (
                  <option key={ministry} value={ministry}>
                    {ministry}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Addition Type */}
            <div className="form-control">
              <label htmlFor="addition-type-input" className="label py-1">
                <span className="label-text font-semibold">Addition Type</span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <select
                id="addition-type-input"
                required
                className="select select-bordered w-full"
                value={type}
                onChange={(e) => setType(e.target.value as AdditionType)}
              >
                <option value="">Select Type</option>
                {ADDITION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Membership Start Date */}
            <div className="form-control">
              <label htmlFor="start-date-input" className="label py-1">
                <span className="label-text font-semibold">
                  Membership Start Date
                </span>
                <span className="label-text font-semibold text-error">*</span>
              </label>
              <DatePicker
                id="start-date-input"
                required
                placeholder="Select Membership Start Date"
                value={membershipStartDate}
                onChange={setMembershipStartDate}
                placement="top"
              />
            </div>

            {/* Baptized Date */}
            <div className="form-control">
              <label htmlFor="baptized-date-input" className="label py-1">
                <span className="label-text font-semibold">Baptized Date</span>
              </label>
              <DatePicker
                id="baptized-date-input"
                placeholder="Select Baptized Date"
                value={baptizedDate}
                onChange={setBaptizedDate}
                placement="top"
                align="right"
              />
            </div>
          </div>

          {/* Admin-only: Pushpay Integration */}
          {(role === "superAdmin" || role === "admin") && (
            <>
              <div className="divider opacity-40">Pushpay Integration</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pushpay ChMS ID */}
                <div className="form-control">
                  <label htmlFor="pushpay-key-input" className="label py-1">
                    <span className="label-text font-medium flex items-center gap-2">
                      Pushpay ChMS Individual ID
                    </span>
                  </label>
                  <input
                    id="pushpay-key-input"
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g. 123456"
                    value={pushpayIndividualId}
                    onChange={(e) => setPushpayIndividualId(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pushpay Community Member Key */}
                <div className="form-control">
                  <label
                    htmlFor="pushpay-community-key-input"
                    className="label py-1"
                  >
                    <span className="label-text font-medium flex items-center gap-2">
                      Pushpay Community Member Key
                    </span>
                  </label>
                  <input
                    id="pushpay-community-key-input"
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g. ABC123XYZ"
                    value={pushpayCommunityMemberKey}
                    onChange={(e) =>
                      setPushpayCommunityMemberKey(e.target.value)
                    }
                  />
                </div>

                {/* Spouse Pushpay Community Member Key */}
                <div className="form-control">
                  <label
                    htmlFor="pushpay-spouse-community-key-input"
                    className="label py-1"
                  >
                    <span className="label-text font-medium flex items-center gap-2">
                      Spouse Pushpay Community Member Key
                    </span>
                  </label>
                  <input
                    id="pushpay-spouse-community-key-input"
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g. DEF456UVW"
                    value={pushpaySpouseCommunityMemberKey}
                    onChange={(e) =>
                      setPushpaySpouseCommunityMemberKey(e.target.value)
                    }
                  />
                </div>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-neutral btn-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submitting}
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                saveButtonText
              )}
            </button>
          </div>
        </form>
      </div>
      <div
        onClick={handleClose}
        className="modal-backdrop bg-black/40 backdrop-blur-xs cursor-pointer animate-fade-in"
      ></div>
    </div>
  );
}
