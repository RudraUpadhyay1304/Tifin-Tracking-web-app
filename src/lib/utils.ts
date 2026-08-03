const TZ = "Asia/Kolkata";

export function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function inr2(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Today's date as YYYY-MM-DD in Asia/Kolkata (avoids UTC off-by-one). */
export function todayKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "Mon 3 Aug" style, from YYYY-MM-DD. */
export function prettyDate(iso: string, lang: "en" | "hi" = "en"): string {
  const d = dateFromISO(iso);
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  return d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" });
}

export function monthLabel(year: number, monthIndex: number, lang: "en" | "hi" = "en"): string {
  const d = new Date(year, monthIndex, 1);
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  return d.toLocaleDateString(loc, { month: "long", year: "numeric" });
}

export interface MonthDay {
  iso: string;
  day: number;
  dow: number; // 0 = Sunday
  inMonth: boolean;
}

/** Grid of weeks for a month (Mon-first weeks), padded with prev/next month days. */
export function monthGrid(year: number, monthIndex: number): MonthDay[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const cells: MonthDay[] = [];
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex, prevMonthDays - i);
    cells.push({ iso: isoFromDate(d), day: d.getDate(), dow: d.getDay(), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    cells.push({ iso: isoFromDate(d), day, dow: d.getDay(), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = dateFromISO(cells[cells.length - 1].iso);
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ iso: isoFromDate(d), day: d.getDate(), dow: d.getDay(), inMonth: false });
  }
  return cells;
}

export function addDays(iso: string, days: number): string {
  const d = dateFromISO(iso);
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function endOfMonth(iso: string): string {
  const d = dateFromISO(iso);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return isoFromDate(last);
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  downloadText(filename, toCSV(rows), "text/csv;charset=utf-8");
}

/** .xls via an HTML table — opens cleanly in Excel without any library. */
export function downloadExcel(filename: string, rows: (string | number)[][]) {
  const html =
    `<table><thead><tr>${rows[0]
      .map((c) => `<th>${String(c)}</th>`)
      .join("")}</tr></thead><tbody>` +
    rows
      .slice(1)
      .map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join("")}</tr>`)
      .join("") +
    `</tbody></table>`;
  downloadText(filename, html, "application/vnd.ms-excel");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
