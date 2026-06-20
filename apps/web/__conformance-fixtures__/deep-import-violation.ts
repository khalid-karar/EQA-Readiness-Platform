/**
 * Intentional package-boundary violation for standing-rules conformance (c).
 * ESLint must fail on this file — only exercised by standing-rules-conformance.test.ts.
 */
import { ScopedExecutor } from "../../../packages/db/src/scoped/scoped-executor";

export const intentionalBoundaryViolation = ScopedExecutor;
