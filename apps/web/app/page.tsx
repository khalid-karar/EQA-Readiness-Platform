import type { ReactNode } from "react";

export default function HomePage(): ReactNode {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>EQA Readiness Platform</h1>
      <p>
        Skeleton only. See <code>/health</code> for the liveness probe.
      </p>
    </main>
  );
}
