/**
 * CSV writing for the admin exports.
 *
 * Beyond the usual quoting, cells are protected against **formula injection**.
 * A spreadsheet treats a cell starting with `=`, `+`, `-` or `@` as a formula,
 * and every one of these exports mixes staff-entered data with fields ordinary
 * members chose for themselves — a first name of `=HYPERLINK("http://evil",
 * "Open")`, a company of `=cmd|'/c calc'!A1`. The person who opens the file is
 * an admin, so that is a live path from any sign-up form to code running on an
 * administrator's machine.
 *
 * Prefixing a single quote is the standard neutralisation: the spreadsheet
 * shows the literal text and evaluates nothing. Mirrors `csvCell` in
 * `backend/src/modules/admin/admin.service.ts` — the same rows can be built on
 * either side, so the two must agree.
 */
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

/** Quote and neutralise a single cell. */
export const csvCell = (value: unknown): string => {
  const raw = value === null || value === undefined ? "" : String(value);
  const s = FORMULA_TRIGGERS.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Build a CSV document from row objects, taking headers from the first row. */
export const toCsv = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvCell).join(","),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(",")),
  ].join("\n");
};
