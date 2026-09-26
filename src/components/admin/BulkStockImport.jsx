import { useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaFileArrowDown, FaFileArrowUp } from 'react-icons/fa6'
import api from '../../api/api'
import { getProductsThunk } from '../../store/thunks/getProductsThunk'
import { parseCsv } from '../../utils/csv'
import { exportProductsCsv } from '../../utils/exports'
import { useToast } from '../../hooks/useToast'

function readRows(text) {
  const [header, ...body] = parseCsv(text)
  if (!header) return { error: 'BULK_EMPTY' }
  const columns = header.map((cell) => cell.trim().toLowerCase())
  const col = (...names) => columns.findIndex((name) => names.includes(name))
  const idCol = col('productid', 'product_id', 'id')
  const storageCol = col('storage')
  const colorCol = col('color')
  const stockCol = col('stock')
  if (idCol === -1 || storageCol === -1 || colorCol === -1 || stockCol === -1) return { error: 'BULK_HEADERS' }
  return {
    updates: body.map((cells) => ({
      productId: Number(cells[idCol]),
      storage: (cells[storageCol] || '').trim(),
      color: (cells[colorCol] || '').trim(),
      stock: Number(String(cells[stockCol] || '').trim()),
    })),
  }
}

export default function BulkStockImport({ products }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [rowErrors, setRowErrors] = useState([])

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setRowErrors([])
    const { updates, error } = readRows(await file.text())
    if (error) {
      showToast(t(`bulk.${error}`), 'error')
      return
    }
    if (!updates.length) {
      showToast(t('bulk.BULK_EMPTY'), 'error')
      return
    }
    setBusy(true)
    try {
      const result = await api.bulkUpdateStock(updates)
      dispatch(getProductsThunk({ force: true }))
      showToast(t('bulk.done', { rows: result.updated, products: result.products }), 'success', 5000)
    } catch (err) {
      // Row numbers shown to the admin match the spreadsheet (header is row 1).
      const errors = err.data?.errors || []
      setRowErrors(errors.map((item) => ({ ...item, line: item.row + 2 })))
      showToast(errors.length ? t('bulk.rowsInvalid', { count: errors.length }) : t('common.error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-list-surface mb-4 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-ink-soft">{t('bulk.title')}</h3>
          <p className="mt-1 text-xs text-steel">{t('bulk.hint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportProductsCsv(products)} className="btn-glass flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent">
            <FaFileArrowDown size={13} aria-hidden="true" /> {t('bulk.exportProducts')}
          </button>
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="btn-glass flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            <FaFileArrowUp size={13} aria-hidden="true" /> {busy ? t('checkout.submitting') : t('bulk.importStock')}
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
        </div>
      </div>
      {rowErrors.length > 0 && (
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-red-50 p-3 text-xs text-danger">
          {rowErrors.slice(0, 50).map((item) => (
            <li key={item.row}>{t('bulk.row', { line: item.line })}: {t(`bulk.${item.error}`)}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
