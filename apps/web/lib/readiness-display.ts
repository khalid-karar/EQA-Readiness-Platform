import type { ReadinessLevel } from "@eqa/workflows";
import { cn } from "@/lib/utils";

/** Maps dashboard readiness bands to semantic design-system tokens. */
export function readinessSemanticTextClass(level: ReadinessLevel): string {
  switch (level) {
    case "green":
      return "text-readiness-conformant";
    case "amber":
      return "text-readiness-partial";
    case "red":
      return "text-readiness-gap";
  }
}

export function readinessSemanticRingClass(level: ReadinessLevel): string {
  switch (level) {
    case "green":
      return "ring-readiness-conformant/40";
    case "amber":
      return "ring-readiness-partial/40";
    case "red":
      return "ring-readiness-gap/40";
  }
}

export function readinessSemanticCircleClass(level: ReadinessLevel): string {
  switch (level) {
    case "green":
      return "border-readiness-conformant/25 bg-readiness-conformant-bg text-readiness-conformant";
    case "amber":
      return "border-readiness-partial/25 bg-readiness-partial-bg text-readiness-partial";
    case "red":
      return "border-readiness-gap/25 bg-readiness-gap-bg text-readiness-gap";
  }
}

export function readinessSemanticClasses(
  level: ReadinessLevel,
): {
  text: string;
  ring: string;
  circle: string;
} {
  return {
    text: readinessSemanticTextClass(level),
    ring: readinessSemanticRingClass(level),
    circle: readinessSemanticCircleClass(level),
  };
}

export function cnReadiness(
  level: ReadinessLevel,
  slot: "text" | "ring" | "circle",
): string {
  return cn(
    slot === "text" && readinessSemanticTextClass(level),
    slot === "ring" && readinessSemanticRingClass(level),
    slot === "circle" && readinessSemanticCircleClass(level),
  );
}
