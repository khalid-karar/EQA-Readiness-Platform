import { createHmac, timingSafeEqual } from "node:crypto";
import { InvalidSignedUrlError, SignedUrlExpiredError } from "./errors";
import type { SignedUrl, SignedUrlPayload, SignedUrlSigner } from "./types";

interface SignedBody extends SignedUrlPayload {
  readonly exp: number;
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/**
 * HMAC-signed, time-limited download URLs. The token embeds the object key plus
 * an expiry and is signed with a server-side secret; tampering or expiry is
 * rejected on {@link verify}. Suitable for dev/tests and as a portable default;
 * a CDN/object-store native signer can implement the same interface.
 */
export class HmacSignedUrlSigner implements SignedUrlSigner {
  constructor(
    private readonly secret: string,
    private readonly baseUrl = "https://evidence.local/download",
    private readonly now: () => number = () => Date.now(),
  ) {}

  private sign_(data: string): string {
    return createHmac("sha256", this.secret).update(data).digest("base64url");
  }

  sign(payload: SignedUrlPayload, ttlSeconds: number): SignedUrl {
    const exp = this.now() + ttlSeconds * 1000;
    const body: SignedBody = { ...payload, exp };
    const data = base64url(JSON.stringify(body));
    const token = `${data}.${this.sign_(data)}`;
    return {
      url: `${this.baseUrl}?token=${encodeURIComponent(token)}`,
      token,
      expiresAt: new Date(exp).toISOString(),
    };
  }

  verify(token: string): SignedUrlPayload {
    const dot = token.lastIndexOf(".");
    if (dot <= 0)
      throw new InvalidSignedUrlError("Malformed signed URL token.");
    const data = token.slice(0, dot);
    const signature = token.slice(dot + 1);

    const expected = this.sign_(data);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new InvalidSignedUrlError("Signed URL signature does not verify.");
    }

    let body: SignedBody;
    try {
      body = JSON.parse(fromBase64url(data)) as SignedBody;
    } catch {
      throw new InvalidSignedUrlError("Signed URL payload is unreadable.");
    }
    if (typeof body.exp !== "number" || body.exp < this.now()) {
      throw new SignedUrlExpiredError("Signed URL has expired.");
    }
    return {
      key: body.key,
      evidenceId: body.evidenceId,
      version: body.version,
    };
  }
}
