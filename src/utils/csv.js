// Minimal RFC 4180 CSV helpers for the admin export/import tools.

const BOM = String.fromCharCode(0xfeff)

function escapeCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

// The BOM makes Excel open UTF-8 (Cyrillic/Uzbek) text correctly.
export function downloadCsv(filename, headers, rows) {
  const blob = new Blob([BOM, toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Excel in ru/uz locales saves CSV with ';' — detect the delimiter from the header line.
export function parseCsv(text) {
  const source = text.startsWith(BOM) ? text.slice(1) : text
  const firstLine = source.split(/\r?\n/, 1)[0] || ''
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','

  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1 }
      else if (char === '"') inQuotes = false
      else cell += char
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(cell); cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(cell); rows.push(row); row = []; cell = ''
    } else {
      cell += char
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''))
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}
