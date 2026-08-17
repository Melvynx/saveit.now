import { describe, expect, it } from "vitest";
import {
  matchesAdminRoleStatus,
  matchesAdminSearch,
  prefixEnd,
  searchCaseVariants,
  searchIndexQuery,
  uniqueById,
} from "./adminSearch";

const varenska = {
  _id: "user_varenska",
  name: "Jane Varenska",
  email: "jane.varenska@example.com",
  role: "user",
  banned: false,
};

describe("matchesAdminSearch", () => {
  it("matches a last name that is not a prefix of the stored name", () => {
    expect(matchesAdminSearch(varenska, "Varenska")).toBe(true);
    expect(matchesAdminSearch(varenska, "varenska")).toBe(true);
  });

  it("matches email local-part and full address", () => {
    expect(matchesAdminSearch(varenska, "jane.varenska")).toBe(true);
    expect(matchesAdminSearch(varenska, "jane.varenska@example.com")).toBe(
      true,
    );
  });

  it("matches an exact user id even when name/email do not contain it", () => {
    expect(
      matchesAdminSearch(
        { _id: "k57abc", name: "Jane", email: "jane@x.com" },
        "k57abc",
      ),
    ).toBe(true);
  });

  it("does not match unrelated queries", () => {
    expect(matchesAdminSearch(varenska, "Melvyn")).toBe(false);
  });
});

describe("matchesAdminRoleStatus", () => {
  it("keeps banned users out of the active filter", () => {
    expect(
      matchesAdminRoleStatus(
        { ...varenska, banned: true },
        { status: "active" },
      ),
    ).toBe(false);
  });

  it("requires role to match exactly when set", () => {
    expect(matchesAdminRoleStatus(varenska, { role: "admin" })).toBe(false);
    expect(matchesAdminRoleStatus(varenska, { role: "user" })).toBe(true);
  });
});

describe("search helpers", () => {
  it("builds prefix bounds and case variants", () => {
    expect(prefixEnd("Varenska")).toBe("Varenska\uffff");
    expect(searchCaseVariants("Varenska")).toEqual(
      expect.arrayContaining(["Varenska", "varenska", "VARENSKA"]),
    );
  });

  it("drops punctuation-only searchIndex queries", () => {
    expect(searchIndexQuery("@@")).toBeNull();
    expect(searchIndexQuery("Varenska")).toBe("Varenska");
    expect(searchIndexQuery("jane.varenska@example.com")).toBe(
      "jane.varenska@example.com",
    );
  });

  it("dedupes by _id keeping the first row", () => {
    const rows = uniqueById([varenska, { ...varenska, name: "Other" }, null]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Jane Varenska");
  });
});
