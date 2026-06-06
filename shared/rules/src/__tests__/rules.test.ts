import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { setDoc, getDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, beforeAll, afterAll, beforeEach, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testEnv: RulesTestEnvironment;

const PROJECT_ID = "restored-church-sf";
const TENANT_ID = "test-tenant";

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, "../../../../firestore.rules");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(rulesPath, "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Helper to get Firestore instance
function getDb(auth?: {
  uid: string;
  email: string;
  email_verified?: boolean;
}) {
  if (!auth) {
    return testEnv.unauthenticatedContext().firestore();
  }
  return testEnv
    .authenticatedContext(auth.uid, {
      email: auth.email,
      email_verified: auth.email_verified ?? true,
    })
    .firestore();
}

// Helper to seed admin role document in database without triggering rules check
async function seedAdmin(email: string, role: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const adminRef = doc(
      db,
      "tenants",
      TENANT_ID,
      "admins",
      email.toLowerCase(),
    );
    await setDoc(adminRef, {
      email: email.toLowerCase(),
      displayName: "Test User",
      role: role,
      addedAt: new Date(),
      addedBy: "system@test.com",
    });
  });
}

describe("Firestore Security Rules", () => {
  describe("Authentication and Admins collection", () => {
    it("denies unauthenticated read/write on admins collection", async () => {
      const db = getDb();
      const adminRef = doc(db, "tenants", TENANT_ID, "admins", "some@test.com");
      await assertFails(getDoc(adminRef));
      await assertFails(setDoc(adminRef, { email: "some@test.com" }));
    });

    it("allows any user to read their own admin doc", async () => {
      const email = "user@test.com";
      await seedAdmin(email, "editor");
      const db = getDb({ uid: "user-123", email });
      const adminRef = doc(db, "tenants", TENANT_ID, "admins", email);
      await assertSucceeds(getDoc(adminRef));
    });

    it("allows superAdmin to manage admins", async () => {
      const superAdminEmail = "super@test.com";
      await seedAdmin(superAdminEmail, "superAdmin");

      const db = getDb({ uid: "super-123", email: superAdminEmail });
      const newAdminRef = doc(
        db,
        "tenants",
        TENANT_ID,
        "admins",
        "new@test.com",
      );

      // Create admin doc
      await assertSucceeds(
        setDoc(newAdminRef, {
          email: "new@test.com",
          displayName: "New Admin",
          role: "admin",
          addedAt: new Date(),
          addedBy: superAdminEmail,
        }),
      );
    });

    it("prevents standard admin or editor from creating admins", async () => {
      const adminEmail = "admin@test.com";
      await seedAdmin(adminEmail, "admin");

      const db = getDb({ uid: "admin-123", email: adminEmail });
      const targetRef = doc(
        db,
        "tenants",
        TENANT_ID,
        "admins",
        "target@test.com",
      );

      await assertFails(
        setDoc(targetRef, {
          email: "target@test.com",
          displayName: "Target Admin",
          role: "editor",
          addedAt: new Date(),
          addedBy: adminEmail,
        }),
      );
    });

    it("prevents superAdmin from deleting their own admin doc", async () => {
      const email = "super@test.com";
      await seedAdmin(email, "superAdmin");

      const db = getDb({ uid: "super-123", email });
      const adminRef = doc(db, "tenants", TENANT_ID, "admins", email);
      await assertFails(deleteDoc(adminRef));
    });
  });

  describe("Members collection", () => {
    it("allows editor to read but not write member PII data", async () => {
      const editorEmail = "editor@test.com";
      await seedAdmin(editorEmail, "editor");

      // Seed a member document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "tenants", TENANT_ID, "members", "member-123"), {
          firstName: "John",
          lastName: "Doe",
        });
      });

      const db = getDb({ uid: "editor-123", email: editorEmail });
      const memberRef = doc(db, "tenants", TENANT_ID, "members", "member-123");

      await assertSucceeds(getDoc(memberRef));
      await assertFails(setDoc(memberRef, { firstName: "Johnny" }));
    });

    it("allows admin to read and write member PII data", async () => {
      const adminEmail = "admin@test.com";
      await seedAdmin(adminEmail, "admin");

      const db = getDb({ uid: "admin-123", email: adminEmail });
      const memberRef = doc(db, "tenants", TENANT_ID, "members", "member-456");

      await assertSucceeds(
        setDoc(memberRef, {
          individualId: "member-456",
          firstName: "Alice",
          lastName: "Smith",
          tenantId: TENANT_ID,
        }),
      );
    });
  });

  describe("Pending Members collection", () => {
    const validPendingData = {
      firstName: "Bob",
      lastName: "Jones",
      status: "pending",
      requestType: "create",
      createdAt: "2026-05-30T09:00:00Z",
      createdBy: "editor@test.com",
    };

    it("allows editor to create a valid pending member request", async () => {
      const editorEmail = "editor@test.com";
      await seedAdmin(editorEmail, "editor");

      const db = getDb({ uid: "editor-123", email: editorEmail });
      const pendingRef = doc(
        db,
        "tenants",
        TENANT_ID,
        "pending_members",
        "request-123",
      );

      await assertSucceeds(
        setDoc(pendingRef, {
          ...validPendingData,
          createdBy: editorEmail,
        }),
      );
    });

    it("allows editor to edit their own pending requests if status remains pending", async () => {
      const editorEmail = "editor@test.com";
      await seedAdmin(editorEmail, "editor");

      // Seed pending request
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, "tenants", TENANT_ID, "pending_members", "request-123"),
          {
            ...validPendingData,
            createdBy: editorEmail,
          },
        );
      });

      const db = getDb({ uid: "editor-123", email: editorEmail });
      const pendingRef = doc(
        db,
        "tenants",
        TENANT_ID,
        "pending_members",
        "request-123",
      );

      await assertSucceeds(
        updateDoc(pendingRef, {
          firstName: "Bobby",
          lastName: "Jones",
        }),
      );
    });

    it("prevents editor from updating others' pending requests", async () => {
      const editorEmail = "editor@test.com";
      await seedAdmin(editorEmail, "editor");

      // Seed pending request created by someone else
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, "tenants", TENANT_ID, "pending_members", "request-123"),
          {
            ...validPendingData,
            createdBy: "other@test.com",
          },
        );
      });

      const db = getDb({ uid: "editor-123", email: editorEmail });
      const pendingRef = doc(
        db,
        "tenants",
        TENANT_ID,
        "pending_members",
        "request-123",
      );

      await assertFails(
        updateDoc(pendingRef, {
          firstName: "Bobby",
        }),
      );
    });

    it("prevents editor from updating pending request status, createdBy, or requestType", async () => {
      const editorEmail = "editor@test.com";
      await seedAdmin(editorEmail, "editor");

      // Seed pending request
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, "tenants", TENANT_ID, "pending_members", "request-123"),
          {
            ...validPendingData,
            createdBy: editorEmail,
          },
        );
      });

      const db = getDb({ uid: "editor-123", email: editorEmail });
      const pendingRef = doc(
        db,
        "tenants",
        TENANT_ID,
        "pending_members",
        "request-123",
      );

      // Attempt to change status to approved
      await assertFails(
        updateDoc(pendingRef, {
          status: "approved",
        }),
      );

      // Attempt to change requestType
      await assertFails(
        updateDoc(pendingRef, {
          requestType: "update",
        }),
      );
    });

    it("allows admin to approve, reject, or delete pending requests", async () => {
      const adminEmail = "admin@test.com";
      await seedAdmin(adminEmail, "admin");

      // Seed pending request
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, "tenants", TENANT_ID, "pending_members", "request-123"),
          {
            ...validPendingData,
          },
        );
      });

      const db = getDb({ uid: "admin-123", email: adminEmail });
      const pendingRef = doc(
        db,
        "tenants",
        TENANT_ID,
        "pending_members",
        "request-123",
      );

      // Admin can approve
      await assertSucceeds(
        updateDoc(pendingRef, {
          status: "approved",
        }),
      );

      // Admin can delete
      await assertSucceeds(deleteDoc(pendingRef));
    });
  });

  describe("Finance Dashboard & Fallback deny", () => {
    it("allows public reads but restricts all writes on finance dashboard", async () => {
      const financeRef = doc(getDb(), "public_finance_dashboard", "current");
      await assertSucceeds(getDoc(financeRef));
      await assertFails(setDoc(financeRef, { balance: 1000 }));

      // Seed admin for roles check (the rules use 'san-francisco' tenant ID check for finance dashboard write)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, "tenants", "san-francisco", "admins", "admin@test.com"),
          {
            email: "admin@test.com",
            displayName: "SF Admin",
            role: "admin",
            addedAt: new Date(),
            addedBy: "system@test.com",
          },
        );
      });

      const adminDb = getDb({ uid: "admin-123", email: "admin@test.com" });
      const adminFinanceRef = doc(
        adminDb,
        "public_finance_dashboard",
        "current",
      );
      // Admin writes should now be denied
      await assertFails(
        setDoc(adminFinanceRef, {
          balance: 5000,
        }),
      );
    });

    it("denies access to unspecified collections", async () => {
      const db = getDb({ uid: "admin-123", email: "admin@test.com" });
      const privateRef = doc(db, "secret_collection", "doc-1");
      await assertFails(getDoc(privateRef));
      await assertFails(setDoc(privateRef, { secret: "data" }));
    });
  });
});
