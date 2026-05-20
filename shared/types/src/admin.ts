// ---------------------------------------------------------------
// Admin roles — controls what sections of the admin portal a user
// can access. Stored as a string field in the Firestore admin doc.
// ---------------------------------------------------------------

export type AdminRole =
  | "superAdmin" // Full access + can manage other admins
  | "admin" // Full access to members; cannot manage admins, but can approve edits
  | "editor"; // Read-only access to members, can request edits

// All roles that exist — useful for validation and dropdowns
export const ADMIN_ROLES: AdminRole[] = ["superAdmin", "admin", "editor"];

// Shape of a document in tenants/{tenantId}/admins/{email}
export interface AdminDoc {
  email: string;
  displayName?: string;
  role: AdminRole;
  addedAt: Date; // Firestore Timestamp, serialized to Date by SDK
  addedBy?: string; // Email of the admin who granted access
}
