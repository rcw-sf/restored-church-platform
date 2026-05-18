import { describe, it, expect } from "vitest";
import { MemberLookup } from "../../types/giving.js";
import { PushpayTransaction } from "../../types/pushpay.js";
import { resolvePayerId } from "../payer-resolution.js";

function createMockTransaction(
  overrides: Partial<PushpayTransaction> = {},
): PushpayTransaction {
  return {
    transactionId: "txn-123",
    status: "Success",
    createdOn: "2023-06-15T10:00:00Z",
    givenOn: "2023-06-15T10:00:00Z",
    amount: { amount: 100, currency: "USD" },
    paymentMethodType: "CreditCard",
    fund: { key: "general", name: "General Fund" },
    payer: { fullName: "John Doe" },
    ...overrides,
  } as PushpayTransaction;
}

function createMockMemberLookup(): MemberLookup {
  return {
    "person-123": {
      individualId: "person-123",
      firstName: "John",
      lastName: "Doe",
      pushpayCommunityMemberKey: "community-123",
      tenantId: "test-tenant",
    },
    "community-123": {
      individualId: "person-123",
      firstName: "John",
      lastName: "Doe",
      pushpayCommunityMemberKey: "community-123",
      tenantId: "test-tenant",
    },
    "export-key-456": {
      individualId: "person-456",
      firstName: "Jane",
      lastName: "Smith",
      pushpayExportKey: "export-key-456",
      tenantId: "test-tenant",
    },
    "spouse-community-456": {
      individualId: "person-456",
      firstName: "Jane",
      lastName: "Doe",
      pushpaySpouseCommunityMemberKey: "spouse-community-456",
      tenantId: "test-tenant",
    },
  } as MemberLookup;
}

describe("resolvePayerId", () => {
  const members = createMockMemberLookup();

  describe("Priority 1: External Link (person_id)", () => {
    it("should resolve by person_id from external links", () => {
      const transaction = createMockTransaction({
        externalLinks: [{ relationship: "person_id", value: "person-123" }],
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-123");
    });

    it("should fallback to community member key if person_id not found in members", () => {
      const transaction = createMockTransaction({
        externalLinks: [
          { relationship: "person_id", value: "nonexistent-person" },
        ],
        communityMember: { key: "unknown-community-key" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("unknown-community-key");
    });
  });

  describe("Priority 2: Payer Export Key", () => {
    it("should resolve by payer export key", () => {
      const transaction = createMockTransaction({
        payer: {
          fullName: "Jane Smith",
          email: "jane@example.com",
          exportKey: "export-key-456",
        },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-456");
    });

    it("should fallback to community member key if export key not found", () => {
      const transaction = createMockTransaction({
        payer: {
          fullName: "Unknown Person",
          email: "unknown@example.com",
          exportKey: "nonexistent-export-key",
        },
        communityMember: { key: "community-123" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-123");
    });

    it("should fallback to community member key if export key not present", () => {
      const transaction = createMockTransaction({
        payer: { fullName: "Jane Smith", email: "jane@example.com" }, // No exportKey
        communityMember: { key: "community-123" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-123");
    });
  });

  describe("Priority 3: Community Member Key", () => {
    it("should resolve by community member key", () => {
      const transaction = createMockTransaction({
        communityMember: { key: "community-123" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-123");
    });

    it("should return community member key even if not found in members", () => {
      const transaction = createMockTransaction({
        communityMember: { key: "nonexistent-community" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("nonexistent-community");
    });
  });

  describe("Priority 3: Spouse Community Member Key", () => {
    it("should resolve by spouse community member key", () => {
      const transaction = createMockTransaction({
        communityMember: { key: "spouse-community-456" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-456");
    });
  });

  describe("Priority order", () => {
    it("should prefer person_id over export key", () => {
      const transaction = createMockTransaction({
        externalLinks: [{ relationship: "person_id", value: "person-123" }],
        payer: {
          fullName: "Jane Smith",
          email: "jane@example.com",
          exportKey: "export-key-456",
        },
        communityMember: { key: "community-123" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-123");
    });

    it("should prefer export key over community member key", () => {
      const transaction = createMockTransaction({
        payer: {
          fullName: "Jane Smith",
          email: "jane@example.com",
          exportKey: "export-key-456",
        },
        communityMember: { key: "community-123" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-456");
    });

    it("should prefer community member key over spouse lookup", () => {
      const transaction = createMockTransaction({
        communityMember: { key: "community-123" },
      });

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("person-123");
    });
  });

  describe("Edge cases", () => {
    it("should return 'unknown' when no identifiers present", () => {
      const transaction = createMockTransaction();

      const result = resolvePayerId(transaction, members);

      expect(result).toBe("unknown");
    });

    it("should fallback to community member key for empty member lookup", () => {
      const transaction = createMockTransaction({
        externalLinks: [{ relationship: "person_id", value: "person-123" }],
        communityMember: { key: "community-key" },
      });

      const result = resolvePayerId(transaction, {});
      expect(result).toBe("community-key");
    });
  });
});
