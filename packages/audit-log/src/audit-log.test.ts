import { describe, expect, it } from "vitest";
import { AuditLog } from "./audit-log";
import { verifyChain } from "./hash-chain";
import type { AuditEntry, AuditStore } from "./types";

class MemoryAuditStore implements AuditStore {
  readonly rows: AuditEntry[] = [];

  lastRow(): Promise<AuditEntry | null> {
    return Promise.resolve(this.rows.at(-1) ?? null);
  }

  appendRow(entry: AuditEntry): Promise<void> {
    this.rows.push(entry);
    return Promise.resolve();
  }

  listRows(): Promise<AuditEntry[]> {
    return Promise.resolve([...this.rows]);
  }
}

async function seedChain(): Promise<MemoryAuditStore> {
  const store = new MemoryAuditStore();
  const log = new AuditLog(store, { userId: "u-1", role: "cae" });
  await log.append({
    action: "create",
    entity: "tenant_kv",
    entityId: "k1",
    oldValue: null,
    newValue: "v1",
  });
  await log.append({
    action: "update",
    entity: "tenant_kv",
    entityId: "k1",
    oldValue: "v1",
    newValue: "v2",
  });
  await log.append({
    action: "status_change",
    entity: "assessment",
    entityId: "a1",
    oldValue: "draft",
    newValue: "submitted",
  });
  return store;
}

describe("AuditLog hash chain", () => {
  it("records who/what/when/old/new and links the chain", async () => {
    const store = await seedChain();
    const entries = store.rows;

    expect(entries).toHaveLength(3);
    expect(entries[0]?.seq).toBe(1);
    expect(entries[0]?.actorUserId).toBe("u-1");
    expect(entries[0]?.actorRole).toBe("cae");
    expect(entries[0]?.action).toBe("create");
    expect(entries[1]?.prevHash).toBe(entries[0]?.entryHash);
    expect(entries[2]?.prevHash).toBe(entries[1]?.entryHash);
    expect(typeof entries[0]?.occurredAt).toBe("string");
  });

  it("verifies an intact chain", async () => {
    const store = await seedChain();
    expect(verifyChain(store.rows)).toEqual({ valid: true });
  });

  it("detects a modified entry", async () => {
    const store = await seedChain();
    const tampered = store.rows.map((e, i) =>
      i === 1 ? { ...e, newValue: JSON.stringify("v2-HACKED") } : e,
    );
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.atSeq).toBe(2);
      expect(result.reason).toContain("modified");
    }
  });

  it("detects a removed entry", async () => {
    const store = await seedChain();
    const withHole = store.rows.filter((e) => e.seq !== 2);
    const result = verifyChain(withHole);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      // The 2nd position now holds seq 3 → sequence break.
      expect(result.atSeq).toBe(2);
      expect(result.reason).toContain("removed");
    }
  });

  it("detects reordering", async () => {
    const store = await seedChain();
    const [a, b, c] = store.rows;
    if (!a || !b || !c) throw new Error("expected 3 entries");
    // Swap the payloads of seq 1 and 2 while keeping seq numbers 1..3 contiguous
    // (an attacker trying to reorder history).
    const reordered: AuditEntry[] = [{ ...b, seq: 1 }, { ...a, seq: 2 }, c];
    const result = verifyChain(reordered);
    expect(result.valid).toBe(false);
  });

  it("verify() round-trips through the store", async () => {
    const store = await seedChain();
    const log = new AuditLog(store, { userId: "u-1", role: "cae" });
    expect(await log.verify()).toEqual({ valid: true });
  });
});
