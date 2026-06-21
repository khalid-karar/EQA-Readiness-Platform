import { randomBytes } from "node:crypto";
import { LocalKms, TenantCipher } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import {
  createEicarDetectingScanner,
  createMalwareScanHandler,
  EvidenceNotReadyError,
  EvidenceService,
  EICAR_TEST_BYTES,
  FileTooLargeError,
  HmacSignedUrlSigner,
  InMemoryObjectStore,
  MALWARE_SCAN_JOB,
  UnsupportedFileTypeError,
} from "@eqa/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "./database";
import {
  createEvidenceScanStatusWriter,
  createTenantJobAuditPort,
} from "./evidence-system";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const SIGNER_SECRET = "eicar-url-signing-secret";
const PDF_BYTES = Buffer.from("%PDF-1.7 clean evidence");

const SERVICE_CONFIG = {
  maxBytes: 1024,
  allowedContentTypes: ["application/pdf", "image/png"],
  downloadTtlSeconds: 300,
};

describe("evidence EICAR malware gate", () => {
  let db: Database;
  let kms: LocalKms;
  let registry: TenantRegistry;
  let objectStore: InMemoryObjectStore;
  let queue: InMemoryJobQueue;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    kms = new LocalKms(randomBytes(32), "test-master");
    registry = new TenantRegistry(db, kms);
    await migrateShared(db);
    objectStore = new InMemoryObjectStore("evidence-ksa");

    const scanner = createEicarDetectingScanner();
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

  async function serviceFor(slug: string) {
    const tenant = await registry.createTenant({ slug, name: slug });
    const ctx = contextOf(tenant);
    const repos = createTenantRepositories(db, sessionFor(ctx, "cae"));
    const cipher = new TenantCipher(
      kms,
      await registry.getEncryptedDataKey(tenant.slug),
    );
    const service = new EvidenceService({
      store: repos.evidence,
      objectStore,
      cipher,
      signer: new HmacSignedUrlSigner(SIGNER_SECRET),
      queue,
      tenant: ctx,
      config: SERVICE_CONFIG,
    });
    return { service, tenant: ctx };
  }

  it("quarantines EICAR test bytes and never serves them", async () => {
    const { service, tenant } = await serviceFor("eicar-co");
    const up = await service.upload({
      fileName: "eicar-test.pdf",
      contentType: "application/pdf",
      bytes: EICAR_TEST_BYTES,
      links: ["1.1", "Q-1-1-1"],
    });
    expect(up.scanStatus).toBe("quarantined");

    await queue.onIdle();

    expect((await service.list())[0]?.scanStatus).toBe("infected");
    await expect(
      service.createDownloadUrl(up.evidenceId, up.version),
    ).rejects.toBeInstanceOf(EvidenceNotReadyError);

    const forged = new HmacSignedUrlSigner(SIGNER_SECRET).sign(
      {
        key: `${tenant.schemaName}/evidence/${up.evidenceId}/v${up.version}`,
        evidenceId: up.evidenceId,
        version: up.version,
      },
      300,
    );
    await expect(service.resolveDownload(forged.token)).rejects.toBeInstanceOf(
      EvidenceNotReadyError,
    );
  });

  it("clears a clean PDF after scan and allows download", async () => {
    const { service } = await serviceFor("clean-co");
    const up = await service.upload({
      fileName: "policy.pdf",
      contentType: "application/pdf",
      bytes: PDF_BYTES,
      links: ["1.1", "Q-1-1-1"],
    });
    await queue.onIdle();

    expect((await service.list())[0]?.scanStatus).toBe("clean");
    const url = await service.createDownloadUrl(up.evidenceId, up.version);
    const { bytes } = await service.resolveDownload(url.token);
    expect(bytes.equals(PDF_BYTES)).toBe(true);
  });

  it("rejects oversize and wrong-type uploads before storage", async () => {
    const { service } = await serviceFor("reject-co");

    await expect(
      service.upload({
        fileName: "big.pdf",
        contentType: "application/pdf",
        bytes: Buffer.alloc(SERVICE_CONFIG.maxBytes + 1),
        links: ["1.1"],
      }),
    ).rejects.toBeInstanceOf(FileTooLargeError);

    await expect(
      service.upload({
        fileName: "virus.exe",
        contentType: "application/x-msdownload",
        bytes: Buffer.from("MZ"),
        links: ["1.1"],
      }),
    ).rejects.toBeInstanceOf(UnsupportedFileTypeError);
  });
});
