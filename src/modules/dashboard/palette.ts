// Chart colours by role. Values live in styles/dashboard.scss as CSS custom
// properties (light + dark steps), validated with the dataviz palette checks:
// categorical slots are assigned in fixed order and follow the entity.
export const C = {
  s1: "var(--db-s1)", // blue
  s2: "var(--db-s2)", // orange
  s3: "var(--db-s3)", // aqua
  s4: "var(--db-s4)", // yellow
  s5: "var(--db-s5)", // magenta
  good: "var(--db-good)",
  warn: "var(--db-warn)",
  serious: "var(--db-serious)",
  critical: "var(--db-critical)",
  neutral: "var(--db-neutral)",
  accent: "var(--db-accent)",
};

/** Each payment mode keeps its colour whatever the ranking. */
export const MODE_COLOR: Record<string, string> = {
  UPI: C.s1,
  BANK_TRANSFER: C.s2,
  CASH: C.s3,
  CHEQUE: C.s4,
  CARD: C.s5,
};
