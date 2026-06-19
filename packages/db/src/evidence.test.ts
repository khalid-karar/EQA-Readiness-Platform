import { randomBytes } from "node:crypto";
import { ForbiddenError, type Role } from "@eqa/auth";
import { LocalKms, TenantCipher } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import {
  createMalwareScanHandler,
  EvidenceNotReadyError,
  EvidenceService,
  FileTooLargeError,
  HmacSignedUrlSigner,
  InMemoryObjectStore,
  MALWARE_SCAN_JOB,
  type MalwareScanner,
  UnsupportedFileTypeError,
} from "@eqa/storage";
import type { TenantDescriptor } from "@eqa/tenant";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import {
  createEvidenceScanStatusWriter,
  createTenantJobAuditPort,
} from "./evidence-system";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const SIGNER_SECRET = "url-signing-secret";
const PDF_BYTES = Buffer.from("%PDF-1.7 synthetic evidence");

const SERVICE_CONFIG = {
  maxBytes: 1024,
  allowedContentTypes: ["application/pdf", "image/png"],
  downloadTtlSeconds: 300,
};

describe("evidence storage (Step 7)", () => {
  let db: Database;
  let kms: LocalKms;
  let registry: TenantRegistry;
  let objectStore: InMemoryObjectStore;
  let queue: InMemoryJobQueue;
  let scanClean = true;

  const scanner: MalwareScanner = {
    scan: () =>
      Promise.resolve(
        scanClean
          ? { clean: true, scanner: "av-stub" }
          : { clean: false, scanner: "av-stub", signature: "EICAR-TEST" },
      ),
  };

  beforeEach(async () => {
    db = createInMemoryDatabase();
    kms = new LocalKms(randomBytes(32), "test-master");
    registry = new TenantRegistry(db, kms);
    await migrateShared(db);
    objectStore = new InMemoryObjectStore("evidence-ksa");
    scanClean = true;

    const handler = createMalwareScanHandler({
      objectStore,
      scanner,
      cipherFor: async (t) =>
        new TenantCipher(kms, await registry.getEncryptedDataKey(t.slug)),
      statusWriter: createEvidenceScanStatusWriter(db),
    });
    queue = new InMemoryJobQueue(
      { [MALWARE_SCAN_JOB]: handler },
      { auditPort: createTenantJobAuditPort(db) },
    );
  });

  afterEach(async () => {
    await db.close();
  });

  function makeTenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  async function serviceFor(t: TenantDescriptor, role: Role = "cae") {
    const tenant = contextOf(t);
    const repos = createTenantRepositories(db, sessionFor(tenant, role));
    const cipher = new TenantCipher(
      kms,
      await registry.getEncryptedDataKey(t.slug),
    );
    const service = new EvidenceService({
      store: repos.evidence,
      objectStore,
      cipher,
      signer: new HmacSignedUrlSigner(SIGNER_SECRET),
      queue,
      tenant,
      config: SERVICE_CONFIG,
    });
    return { service, repos, tenant };
  }

  function pdf(evidenceId?: string) {
    return {
      ...(evidenceId ? { evidenceId } : {}),
      fileName: "evidence.pdf",
      contentType: "application/pdf",
      bytes: PDF_BYTES,
      links: ["S1.1", "Q-1-1-1"],
    };
  }

  it("rejects a disallowed file type", async () => {
    const { service } = await serviceFor(await makeTenant("acme-co"));
    await expect(
      service.upload({
        fileName: "malware.exe",
        contentType: "application/x-msdownload",
        bytes: Buffer.from("MZ"),
        links: ["S1.1"],
      }),
    ).rejects.toBeInstanceOf(UnsupportedFileTypeError);
    expect(await service.list()).toEqual([]);
  });

  it("rejects an oversized file", async () => {
    const { service } = await serviceFor(await makeTenant("acme-co"));
    await expect(
      service.upload({
        fileName: "big.pdf",
        contentType: "application/pdf",
        bytes: Buffer.alloc(SERVICE_CONFIG.maxBytes + 1),
        links: ["S1.1"],
      }),
    ).rejects.toBeInstanceOf(FileTooLargeError);
  });

  it("keeps an uploaded file undownloadable through every path until the scan job clears it", async () => {
    const { service, tenant } = await serviceFor(await makeTenant("acme-co"));
    const up = await service.upload(pdf());
    expect(up.scanStatus).toBe("quarantined");

    // No signed URL is issued for a quarantined file.
    await expect(
      service.createDownloadUrl(up.evidenceId, up.version),
    ).rejects.toBeInstanceOf(EvidenceNotReadyError);

    // Even a validly-signed token cannot fetch the bytes (defense in depth).
    const objectKey = `${tenant.schemaName}/evidence/${up.evidenceId}/v${up.version}`;
    const forged = new HmacSignedUrlSigner(SIGNER_SECRET).sign(
      { key: objectKey, evidenceId: up.evidenceId, version: up.version },
      300,
    );
    await expect(service.resolveDownload(forged.token)).rejects.toBeInstanceOf(
      EvidenceNotReadyError,
    );

    // After the scan job runs and clears it, it becomes downloadable.
    await queue.onIdle();
    const url = await service.createDownloadUrl(up.evidenceId, up.version);
    const { bytes } = await service.resolveDownload(url.token);
    expect(bytes.equals(PDF_BYTES)).toBe(true);
  });

  it("runs the malware scan as a real job and audits its outcome", async () => {
    const { service, repos } = await serviceFor(await makeTenant("acme-co"));
    const up = await service.upload(pdf());
    await queue.onIdle();

    const meta = await repos.evidence.get(up.evidenceId, up.version);
    expect(meta?.scanStatus).toBe("clean");
    expect(meta?.scanner).toBe("av-stub");

    const entries = await repos.audit.list();
    // The user upload is audited.
    expect(
      entries.some((e) => e.entity === "evidence" && e.action === "create"),
    ).toBe(true);
    // The scan's status change is audited as a system actor.
    const statusChange = entries.find(
      (e) => e.entity === "evidence" && e.action === "status_change",
    );
    expect(statusChange?.actorRole).toBe("system");
    // The job outcome itself is audited via the tenant-scoped job audit port.
    const jobOutcome = entries.find(
      (e) => e.entity === `job:${MALWARE_SCAN_JOB}`,
    );
    expect(jobOutcome).toBeDefined();
    expect(jobOutcome?.actorRole).toBe("system");
    expect((await repos.audit.verify()).valid).toBe(true);
  });

  it("marks an infected file and never makes it downloadable", async () => {
    scanClean = false;
    const { service } = await serviceFor(await makeTenant("acme-co"));
    const up = await service.upload(pdf());
    await queue.onIdle();

    expect(await service.list()).toHaveLength(1);
    expect((await service.list())[0]?.scanStatus).toBe("infected");
    await expect(
      service.createDownloadUrl(up.evidenceId, up.version),
    ).rejects.toBeInstanceOf(EvidenceNotReadyError);
  });

  it("encrypts evidence bytes at rest with the per-tenant data key", async () => {
    const { service, tenant } = await serviceFor(await makeTenant("acme-co"));
    const up = await service.upload(pdf());

    const objectKey = `${tenant.schemaName}/evidence/${up.evidenceId}/v${up.version}`;
    const stored = await objectStore.get(objectKey);
    expect(stored).not.toBeNull();
    // The stored bytes are ciphertext, not the plaintext file.
    expect(stored?.equals(PDF_BYTES)).toBe(false);

    // …and they round-trip only via the tenant's data key.
    const cipher = new TenantCipher(
      kms,
      await registry.getEncryptedDataKey("acme-co"),
    );
    expect((await cipher.openBytes(stored as Buffer)).equals(PDF_BYTES)).toBe(
      true,
    );
  });

  it("isolates evidence between tenants", async () => {
    const acme = await serviceFor(await makeTenant("acme-co"));
    const beta = await serviceFor(await makeTenant("beta-co"));

    const up = await acme.service.upload(pdf());

    expect(await acme.repos.evidence.list()).toHaveLength(1);
    expect(await beta.repos.evidence.list()).toEqual([]);
    expect(await beta.repos.evidence.get(up.evidenceId, up.version)).toBeNull();
  });

  it("requires authorization to download and audit-logs the grant; Board cannot upload", async () => {
    const acme = await makeTenant("acme-co");

    // CAE uploads and the scan clears it.
    const cae = await serviceFor(acme, "cae");
    const up = await cae.service.upload(pdf());
    await queue.onIdle();

    // A read-only Board user may download (READ) and the grant is audited.
    const board = await serviceFor(acme, "board");
    const url = await board.service.createDownloadUrl(
      up.evidenceId,
      up.version,
    );
    expect(url.token).toBeTruthy();

    const grant = (await board.repos.audit.list()).find(
      (e) => e.entity === "evidence_download_grant",
    );
    expect(grant?.action).toBe("create");
    expect(grant?.actorRole).toBe("board");

    // …but a Board user cannot upload (WRITE).
    await expect(board.service.upload(pdf())).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
