/**
 * Minimal semicolon-separated CSV parser with quoted fields (incl. newlines).
 * Used only by the probe; does not modify any project data files.
 */
export function parseSemicolonCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const len = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length && row.some((c) => String(c).trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < len; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ";") {
      pushField();
    } else if (c === "\r") {
      /* CRLF / lone CR: ignore \r, newline handled on \n */
    } else if (c === "\n") {
      pushField();
      pushRow();
    } else {
      field += c;
    }
  }
  pushField();
  if (row.length && row.some((c) => String(c).trim() !== "")) rows.push(row);
  return rows;
}

export function rowsToObjects(rows) {
  const headerIdx = rows.findIndex((r) => String(r?.[0] ?? "").trim() === "Naam");
  if (headerIdx < 0) return { headers: [], data: [] };
  const headers = rows[headerIdx].map((h, i) => (h && String(h).trim() ? String(h).trim() : `Col${i}`));
  const data = rows.slice(headerIdx + 1).map((r) => {
    const o = {};
    headers.forEach((h, j) => {
      o[h] = r[j] ?? "";
    });
    return o;
  });
  return { headers, data };
}
