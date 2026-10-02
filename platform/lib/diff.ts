import { diffLines } from "diff";

export type DiffLine = { type: "add" | "remove" | "same"; value: string };

export function lineDiff(before: string, after: string): DiffLine[] {
  const parts = diffLines(before || "", after || "");
  const lines: DiffLine[] = [];

  for (const part of parts) {
    const type = part.added ? "add" : part.removed ? "remove" : "same";
    const chunk = part.value.replace(/\n$/, "").split("\n");
    for (const value of chunk) {
      lines.push({ type, value });
    }
  }

  return lines;
}
