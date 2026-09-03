import { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import { createProductThunk } from '../store/thunks/createProductThunk'
import { updateProductThunk } from '../store/thunks/updateProductThunk'
import { deleteProductThunk } from '../store/thunks/deleteProductThunk'
import { getAllOrdersThunk } from '../store/thunks/getAllOrdersThunk'
import { updateOrderStatusThunk } from '../store/thunks/updateOrderStatusThunk'
import { deleteOrderThunk } from '../store/thunks/deleteOrderThunk'
import { resetNewOrdersCount } from '../store/slices/ordersSlice'
import { getAllMessagesThunk } from '../store/thunks/getAllMessagesThunk'
import { sendMessageThunk } from '../store/thunks/sendMessageThunk'
import { clearConversationThunk } from '../store/thunks/clearConversationThunk'
import { resetAdminUnreadCount } from '../store/slices/chatSlice'
import { validateProductForm } from '../validations/createProductValidate'
import { handleImageChange } from '../core/handlemageChange'
import { formatPrice } from '../utils/format'
import { useToast } from '../hooks/useToast'
import { getProductFallbackImage } from '../utils/productImages'
import GlassSelect from './GlassSelect'
import api from '../api/api'
import { FaBoxOpen, FaBoxesStacked, FaChartLine, FaClock, FaDollarSign, FaTriangleExclamation, FaUsers, FaXmark, FaPaperPlane, FaHeadset } from 'react-icons/fa6'
import { AdminDashboardSkeleton } from './Skeleton'
import ConfirmDialog from './ConfirmDialog'

const CATEGORIES = ['phones', 'laptops', 'accessories', 'watches']

const ORDER_STATUSES = [
  { value: 'pending', labelKey: 'statusPending', cls: 'status-pending' },
  { value: 'accepted', labelKey: 'statusAccepted', cls: 'status-accepted' },
  { value: 'transit', labelKey: 'statusTransit', cls: 'status-transit' },
  { value: 'delivered', labelKey: 'statusDelivered', cls: 'status-delivered' },
]

const EMPTY_FORM = {
  name: '', brand: '', category: 'phones', price: '', oldPrice: '',
  stock: '', storage: '', description: { uz: '', ru: '', en: '' }, images: [], variants: [],
  specs: [
    { key: 'display', value: '' },
    { key: 'chip', value: '' },
    { key: 'ram', value: '' },
    { key: 'camera', value: '' },
    { key: 'battery', value: '' },
  ],
}
const SEEN_MESSAGES_KEY = 'technest_admin_seen_messages'

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const { items: products, status: productStatus } = useSelector((s) => s.products)
  const { items: orders, newOrdersCount, status: ordersStatus } = useSelector((s) => s.orders)
  const { allMessages, adminUnreadCount, allStatus } = useSelector((s) => s.chat)
  const [users, setUsers] = useState([])

  const [tab, setTab] = useState('products') // 'products' | 'orders' | 'support'
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const supportMessagesRef = useRef(null)
  const knownMessageIds = useRef(null)
  const seenMessageIds = useRef(new Set(JSON.parse(localStorage.getItem(SEEN_MESSAGES_KEY) || '[]')))
  const hasSeenMessageStore = useRef(localStorage.getItem(SEEN_MESSAGES_KEY) !== null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [deletingId, setDeletingId] = useState(null)
  const [deletingOrderId, setDeletingOrderId] = useState(null)
  const [selectedStat, setSelectedStat] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(null)
  const [clearingConversation, setClearingConversation] = useState(false)
  const [clearConversationConfirmOpen, setClearConversationConfirmOpen] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const pollRef = useRef(null)
  const knownOrderIds = useRef(null)

  // ── Initial data loads ──
  useEffect(() => {
    if (productStatus === 'idle') dispatch(getProductsThunk())
    dispatch(getAllOrdersThunk())
    dispatch(resetNewOrdersCount())
    dispatch(getAllMessagesThunk())
    dispatch(resetAdminUnreadCount())
    api.getUsers().then(setUsers).catch(() => {})
  }, [dispatch, productStatus])

  // ── Poll orders + support messages every 12 seconds ──
  useEffect(() => {
    pollRef.current = setInterval(() => {
      dispatch(getAllOrdersThunk())
      dispatch(getProductsThunk())
      dispatch(getAllMessagesThunk())
    }, 12000)
    const refreshOnFocus = () => dispatch(getAllOrdersThunk())
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      clearInterval(pollRef.current)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [dispatch])

  useEffect(() => {
    if (!modalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.classList.add('product-editor-open')
    document.body.style.overflow = 'hidden'
    const header = document.querySelector('header')
    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--admin-header-height', `${header?.getBoundingClientRect().height || 0}px`)
    }
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      document.body.classList.remove('product-editor-open')
      document.body.style.overflow = previousOverflow
      document.documentElement.style.removeProperty('--admin-header-height')
    }
  }, [modalOpen])

  // ── Notify admin of new support messages ──
  useEffect(() => {
    if (allStatus !== 'succeeded') return

    const userMessageIds = new Set(allMessages.filter((m) => m.sender === 'user').map((m) => m.id))

    if (!knownMessageIds.current) {
      knownMessageIds.current = userMessageIds
      if (!hasSeenMessageStore.current) {
        seenMessageIds.current = userMessageIds
        localStorage.setItem(SEEN_MESSAGES_KEY, JSON.stringify([...userMessageIds]))
        hasSeenMessageStore.current = true
      } else {
        const unseenMessages = [...userMessageIds].filter((id) => !seenMessageIds.current.has(id))
        if (unseenMessages.length > 0) {
          showToast(`💬 ${unseenMessages.length} ${t('admin.newMessageToast')}`, 'info', 5000)
        }
      }
      return
    }

    const newMessages = [...userMessageIds].filter(
      (id) => !knownMessageIds.current.has(id) && !seenMessageIds.current.has(id)
    ).length
    if (newMessages > 0) {
      showToast(`💬 ${newMessages} ${t('admin.newMessageToast')}`, 'info', 5000)
    }

    knownMessageIds.current = userMessageIds
  }, [allMessages, allStatus, showToast, t])

  function openConversation(conversation) {
    const viewedIds = conversation.messages.filter((message) => message.sender === 'user').map((message) => message.id)
    viewedIds.forEach((id) => seenMessageIds.current.add(id))
    localStorage.setItem(SEEN_MESSAGES_KEY, JSON.stringify([...seenMessageIds.current]))
    setActiveConversationId(conversation.userId)
  }

  // ── Notify admin of new orders ──
  useEffect(() => {
    if (ordersStatus !== 'succeeded') return

    const orderIds = new Set(orders.map((order) => String(order.id)))

    if (!knownOrderIds.current) {
      knownOrderIds.current = orderIds
      return
    }

    const newOrders = [...orderIds].filter((id) => !knownOrderIds.current.has(id)).length
    if (newOrders > 0) {
      showToast(`🔔 ${newOrders} ${t('admin.newOrdersToast')}`, 'info', 5000)
    }

    knownOrderIds.current = orderIds
  }, [orders, ordersStatus, showToast, t])

  const stats = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0)
    const lowStock = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length
    const outOfStock = products.filter((p) => (p.stock || 0) === 0).length
    const pendingOrders = orders.filter((o) => o.status === 'pending').length
    const stockValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0)
    return { total: products.length, totalStock, lowStock, outOfStock, pendingOrders, totalOrders: orders.length, stockValue }
  }, [products, orders])

  const conversations = useMemo(() => {
    const byUser = new Map()
    for (const message of allMessages) {
      const userKey = String(message.userId)
      if (!byUser.has(userKey)) byUser.set(userKey, [])
      byUser.get(userKey).push(message)
    }
    users.filter((registeredUser) => registeredUser.role !== 'admin').forEach((registeredUser) => {
      const userKey = String(registeredUser.id)
      if (!byUser.has(userKey)) byUser.set(userKey, [])
    })
    return [...byUser.entries()]
      .map(([userId, msgs]) => {
        const sorted = [...msgs].sort((a, b) => a.id - b.id)
        const registeredUser = users.find((user) => String(user.id) === userId)
        return {
          userId: registeredUser?.id ?? userId,
          userName: sorted[sorted.length - 1]?.userName || registeredUser?.name || t('admin.noName'),
          messages: sorted,
          lastMessage: sorted[sorted.length - 1],
        }
      })
      .sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0))
  }, [allMessages, t, users])

  const activeConversation = conversations.find((c) => c.userId === activeConversationId) || null

  useEffect(() => {
    if (!activeConversationId || !supportMessagesRef.current) return
    requestAnimationFrame(() => {
      if (supportMessagesRef.current) supportMessagesRef.current.scrollTop = supportMessagesRef.current.scrollHeight
    })
  }, [activeConversationId, activeConversation?.messages])

  const filteredOrders = useMemo(() => {
    if (!orderSearch) return orders
    const q = orderSearch.toLowerCase()
    return orders.filter(
      (o) =>
        String(o.id).includes(q) ||
        o.contact?.fullName?.toLowerCase().includes(q) ||
        o.contact?.phone?.includes(q) ||
        o.contact?.address?.toLowerCase().includes(q) ||
        o.contact?.city?.toLowerCase().includes(q)
    )
  }, [orders, orderSearch])

  const descriptionLanguages = [
    { code: 'uz', label: "O'zbekcha" },
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
  ]
  const orderedDescriptionLanguages = [
    ...descriptionLanguages.filter((language) => language.code === i18n.language),
    ...descriptionLanguages.filter((language) => language.code !== i18n.language),
  ]

  if (productStatus === 'loading' && ordersStatus === 'loading' && products.length === 0 && orders.length === 0) {
    return <AdminDashboardSkeleton />
  }

  function openCreate() {
    setEditingId(null); setEditingProduct(null); setForm(EMPTY_FORM); setErrors({}); setModalOpen(true)
  }

  function openEdit(product) {
    const descriptions = typeof product.description === 'object'
      ? product.description
      : { uz: product.description || '', ru: '', en: '' }
    setEditingId(product.id)
    setEditingProduct(product)
    setForm({
      name: product.name, brand: product.brand, category: product.category,
      price: product.price, oldPrice: product.oldPrice || '', stock: product.stock,
      storage: (product.storage || []).join(', '), description: descriptions,
      images: product.images || [],
      specs: normalizeSpecs(product.specs),
      variants: (product.variants || []).map((variant) => ({
        ...variant,
        hex: variant.hex || product.colors?.find((color) => color.name === variant.color)?.hex || '#1c1c1e',
      })),
    })
    setErrors({})
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validateProductForm(form)
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return }

    const payload = {
      name: form.name.trim(), brand: form.brand.trim(), category: form.category,
      price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      stock: form.variants.length ? form.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0) : Number(form.stock),
      storage: form.storage ? form.storage.split(',').map((s) => s.trim()).filter(Boolean) : ['Standart'],
      colors: [...new Map(form.variants.map((v) => [v.color, { name: v.color, hex: v.hex || '#1c1c1e' }])).values()],
      variants: form.variants,
      description: form.description,
      images: form.images.length ? form.images : [getProductFallbackImage(form)],
      specs: form.specs.reduce((result, spec) => {
        const key = spec.key.trim()
        if (key) result[key] = spec.value.trim() || '—'
        return result
      }, {}),
      rating: editingProduct?.rating ?? 4.5,
      reviews: editingProduct?.reviews ?? 0,
      featured: editingProduct?.featured ?? false,
    }

    if (editingId) {
      await dispatch(updateProductThunk({ id: editingId, payload }))
      showToast(`${t('admin.productUpdated')} ✓`, 'success')
    } else {
      await dispatch(createProductThunk(payload))
      showToast(`${t('admin.productCreated')} ✓`, 'success')
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    await dispatch(deleteProductThunk(id))
    setDeletingId(null)
    showToast(t('admin.productDeleted'), 'warning')
  }

  async function handleStatusChange(orderId, status) {
    setStatusUpdating(orderId)
    await dispatch(updateOrderStatusThunk({ orderId, status })).unwrap()
    await dispatch(getProductsThunk())
    setStatusUpdating(null)
    const lbl = t(`admin.status${status[0].toUpperCase()}${status.slice(1)}`)
    showToast(`Buyurtma #${orderId} holati: ${lbl}`, 'success')
  }

  async function handleOrderDelete(id) {
    const deletedOrder = orders.find((order) => order.id === id)
    await dispatch(deleteOrderThunk(id))
    if (deletedOrder?.status === 'pending') {
      await dispatch(getProductsThunk())
    }
    setDeletingOrderId(null)
    showToast(
      deletedOrder?.status === 'pending'
        ? `${t('admin.order')} #${id} ${t('admin.orderCancelled')}, ${t('admin.stockRestored')}`
        : `${t('admin.order')} #${id} ${t('admin.orderDeleted')}`,
      'warning'
    )
  }

  function handleSendReply(e) {
    e.preventDefault()
    const trimmed = replyText.trim()
    if (!trimmed || !activeConversation) return
    dispatch(sendMessageThunk({
      userId: activeConversation.userId,
      userName: activeConversation.userName,
      sender: 'admin',
      text: trimmed,
    }))
    setReplyText('')
  }

  async function handleClearConversation() {
    if (!activeConversation) return
    setClearingConversation(true)
    try {
      await dispatch(clearConversationThunk(activeConversation.userId)).unwrap()
      setActiveConversationId(null)
      setClearConversationConfirmOpen(false)
      showToast(t('admin.chatCleared'), 'success')
    } finally {
      setClearingConversation(false)
    }
  }

  function updateVariant(index, changes) {
    setForm((prev) => ({ ...prev, variants: prev.variants.map((variant, i) => i === index ? { ...variant, ...changes } : variant) }))
  }

  function updateSpec(index, changes) {
    setForm((prev) => ({ ...prev, specs: prev.specs.map((spec, i) => i === index ? { ...spec, ...changes } : spec) }))
  }

  function removeImage(index) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, imageIndex) => imageIndex !== index) }))
  }

  const statusInfo = (val) => {
    const status = ORDER_STATUSES.find((item) => item.value === val) || ORDER_STATUSES[0]
    return { ...status, label: t(`admin.${status.labelKey}`) }
  }

  const statCards = [
    { key: 'products', label: t('admin.statsProducts'), value: stats.total, color: '#3d7fff', icon: FaBoxOpen },
    { key: 'stock', label: t('admin.statsStock'), value: stats.totalStock, color: '#16a34a', icon: FaBoxesStacked },
    { key: 'lowStock', label: t('admin.statsLowStock'), value: stats.lowStock, color: '#f59e0b', icon: FaTriangleExclamation },
    { key: 'outOfStock', label: t('admin.statsOutOfStock'), value: stats.outOfStock, color: '#ef4444', icon: FaXmark },
    { key: 'orders', label: t('admin.statsOrders'), value: stats.totalOrders, color: '#8b5cf6', icon: FaChartLine },
    { key: 'pending', label: t('admin.statsPending'), value: stats.pendingOrders, color: '#f59e0b', icon: FaClock },
    { key: 'value', label: t('admin.statsValue'), value: `${formatPrice(stats.stockValue)} ${t('common.currency')}`, color: '#0f766e', icon: FaDollarSign },
    { key: 'users', label: t('admin.statsUsers'), value: users.length, color: '#db2777', icon: FaUsers },
  ]

  const selectedStatData = selectedStat === 'products'
    ? { title: t('admin.statsProducts'), rows: products.map((product) => `${product.name} · ${product.stock || 0} ${t('admin.units')}`) }
    : selectedStat === 'stock'
      ? { title: t('admin.detailStock'), rows: products.map((product) => `${product.name} · ${product.stock || 0} ${t('admin.units')}`) }
      : selectedStat === 'lowStock'
        ? { title: t('admin.detailLowStock'), rows: products.filter((product) => (product.stock || 0) > 0 && (product.stock || 0) <= 10).map((product) => `${product.name} · ${product.stock} ${t('admin.units')}`) }
        : selectedStat === 'outOfStock'
          ? { title: t('admin.detailOutOfStock'), rows: products.filter((product) => (product.stock || 0) === 0).map((product) => product.name) }
          : selectedStat === 'orders'
            ? { title: t('admin.detailOrders'), rows: orders.map((order) => `${t('admin.order')} #${order.id} · ${statusInfo(order.status).label}`) }
            : selectedStat === 'pending'
              ? { title: t('admin.detailPending'), rows: orders.filter((order) => order.status === 'pending').map((order) => `${t('admin.order')} #${order.id} · ${order.contact?.fullName || t('admin.noName')}`) }
              : selectedStat === 'users'
                ? { title: t('admin.detailUsers'), rows: users.map((user) => `${user.name} · ${user.email}`) }
                : selectedStat === 'value'
                  ? { title: t('admin.detailValue'), rows: [`${formatPrice(stats.stockValue)} ${t('common.currency')}`, `$${Math.round(stats.stockValue / 12600).toLocaleString()} USD`] }
                  : null

  return (
    <div>
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <button key={stat.key} type="button" onClick={() => setSelectedStat(stat.key)} className="group min-w-0 rounded-2xl border border-line bg-white p-4 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-realistic">
              <div className="flex items-center justify-between">
                <div className="spec-strip text-steel">{stat.label}</div>
                <Icon size={17} color={stat.color} aria-hidden="true" />
              </div>
              <div className="mt-2 break-words font-mono-tabular text-xl font-semibold xl:text-2xl" style={{ color: stat.color }}>{stat.value}</div>
              <div className="mt-2 text-xs text-steel opacity-0 transition-opacity group-hover:opacity-100">{t('admin.more')} →</div>
            </button>
          )
        })}
      </div>

      {/* Tab switcher */}
      <div className="mb-5 flex gap-2">
        {[
          { key: 'products', label: t('admin.products'), badge: 0 },
          { key: 'orders', label: `${t('admin.orders')}${newOrdersCount > 0 ? ` (+${newOrdersCount} ${t('admin.new')})` : ''}`, badge: newOrdersCount },
          { key: 'support', label: `${t('admin.support')}${adminUnreadCount > 0 ? ` (+${adminUnreadCount})` : ''}`, badge: adminUnreadCount },
        ].map((tab_) => (
          <button
            key={tab_.key}
            onClick={() => {
              setTab(tab_.key)
              if (tab_.key === 'orders') dispatch(resetNewOrdersCount())
              if (tab_.key === 'support') dispatch(resetAdminUnreadCount())
            }}
            className="relative rounded-full px-5 py-2 text-sm font-semibold"
            style={{
              background: tab === tab_.key ? 'var(--color-ink)' : 'white',
              color: tab === tab_.key ? 'white' : 'var(--color-ink-soft)',
              border: '1px solid var(--color-line)',
            }}
          >
            {tab_.label}
            {tab_.badge > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 font-mono-tabular text-[10px] font-semibold text-white">
                {tab_.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-soft">{t('admin.products')}</h2>
            <button
              onClick={openCreate}
              className="btn-glass rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dim"
            >
              + {t('admin.addProduct')}
            </button>
          </div>

          <div className="admin-list-surface overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line spec-strip uppercase text-steel">
                  <th className="px-4 py-3">{t('admin.name')}</th>
                  <th className="px-4 py-3">{t('admin.brand')}</th>
                  <th className="px-4 py-3">{t('admin.category')}</th>
                  <th className="px-4 py-3">{t('admin.price')}</th>
                  <th className="px-4 py-3">{t('admin.stock')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-steel">{t('admin.noProducts')}</td>
                  </tr>
                )}
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper" style={{ transition: 'background 0.15s ease' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        <span className="font-medium text-ink-soft">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-steel">{p.brand}</td>
                    <td className="px-4 py-3 text-steel">{t(`categories.${p.category}`)}</td>
                    <td className="px-4 py-3 font-mono-tabular">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3 font-mono-tabular">
                      <span className={p.stock === 0 ? 'text-danger' : p.stock <= 10 ? 'text-amber' : 'text-ink-soft'}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="btn-glass rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent">
                          {t('admin.edit')}
                        </button>
                        <button onClick={() => setDeletingId(p.id)} className="btn-glass rounded-full border border-line px-3 py-1.5 text-xs font-medium text-danger hover:border-danger">
                          {t('admin.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="admin-list-surface mt-6 rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-soft">{t('admin.users')}</h2>
            <div className="divide-y divide-line">
              {users.map((registeredUser) => (
                <div key={registeredUser.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium text-ink-soft">{registeredUser.name}</span>
                  <span className="text-steel">{registeredUser.email}</span>
                </div>
              ))}
              {!users.length && <p className="text-sm text-steel">{t('admin.usersEmpty')}</p>}
            </div>
          </section>
        </>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === 'orders' && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display text-lg font-semibold text-ink-soft">{t('admin.allOrders')}</h2>
            <input
              className="input w-auto"
              style={{ maxWidth: '260px' }}
              placeholder="Qidirish (ID, ism, tel)..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center">
              <p className="font-display text-lg font-semibold text-ink-soft">{t('admin.ordersEmpty')}</p>
              <p className="mt-1 text-sm text-steel">{t('admin.ordersEmptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const si = statusInfo(order.status)
                return (
                  <div key={order.id} className="rounded-2xl border border-line bg-white p-5" style={{ transition: 'box-shadow 0.2s ease' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-sm font-semibold text-ink-soft">
                          {t('admin.order')} #{order.id}
                        </div>
                        <div className="spec-strip text-steel mt-0.5">
                          {new Date(order.createdAt).toLocaleString(i18n.language)}
                        </div>
                        {order.contact && (
                          <div className="mt-1 space-y-1 text-xs text-steel">
                            <div>{order.contact.fullName} · {order.contact.phone}</div>
                            {(order.contact.city || order.contact.address || order.contact.street) && (
                              <div className="flex items-start gap-1.5 text-ink-soft">
                                <span aria-hidden="true">📍</span>
                                <span>
                                  {order.contact.city && `${order.contact.city}, `}
                                  {order.contact.address || [order.contact.street, order.contact.house].filter(Boolean).join(', ')}
                                  {order.contact.apartment && `, kv. ${order.contact.apartment}`}
                                  {order.contact.landmark && `, ${order.contact.landmark}`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status selector */}
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 spec-strip text-xs font-medium ${si.cls}`}>
                          {si.label}
                        </span>
                        <GlassSelect
                          value={order.status}
                          disabled={statusUpdating === order.id}
                          onChange={(value) => handleStatusChange(order.id, value)}
                          options={ORDER_STATUSES.map((s) => ({ value: s.value, label: t(`admin.${s.labelKey}`) }))}
                          className="status-select min-w-36 text-xs"
                        />
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-ink-soft">
                            {item.name}
                            {item.storage && <span className="spec-strip text-steel ml-1">· {item.storage}</span>}
                            {item.color && <span className="spec-strip text-steel ml-1">· {item.color}</span>}
                            <span className="spec-strip text-steel ml-1">× {item.qty}</span>
                          </span>
                          <span className="font-mono-tabular text-steel">{formatPrice(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-between border-t border-line pt-3 font-display text-sm font-semibold text-ink-soft">
                      <span>{t('admin.total')}</span>
                      <span className="font-mono-tabular">{formatPrice(order.total)} {t('common.currency')}</span>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => setDeletingOrderId(order.id)} className="btn-glass rounded-full border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50">
                        {t('admin.deleteOrder')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── SUPPORT TAB ── */}
      {tab === 'support' && (
        <>
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-soft">{t('admin.support')}</h2>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center">
              <FaHeadset size={28} className="mb-3 text-steel" aria-hidden="true" />
              <p className="font-display text-lg font-semibold text-ink-soft">{t('admin.supportEmpty')}</p>
              <p className="mt-1 text-sm text-steel">{t('admin.supportEmptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => openConversation(conv)}
                  className="support-conversation-row w-full rounded-2xl border border-line bg-white p-4 text-left"
                  style={{ transition: 'border-color 0.2s ease' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-sm font-semibold text-ink-soft">{conv.userName}</span>
                    {conv.lastMessage && (
                      <span className="spec-strip shrink-0 text-steel">
                        {new Date(conv.lastMessage.createdAt).toLocaleString(i18n.language)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-steel">
                    {conv.lastMessage
                      ? `${conv.lastMessage.sender === 'admin' ? `${t('admin.you')}: ` : ''}${conv.lastMessage.text}`
                      : t('support.chatEmpty')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Support conversation modal ── */}
      {activeConversation && (
        <div className="admin-support-overlay fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 modal-overlay-enter" onClick={() => setActiveConversationId(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="admin-support-modal flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white modal-enter"
            style={{ maxHeight: '80vh' }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-base font-semibold text-ink-soft">{activeConversation.userName}</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setClearConversationConfirmOpen(true)} disabled={clearingConversation} className="clear-chat-button rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                  {t('support.clearChat')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-steel hover:text-ink-soft"
                  aria-label={t('common.close')}
                >
                  <FaXmark size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div ref={supportMessagesRef} className="admin-support-messages flex-1 space-y-2 overflow-y-auto p-4">
              {activeConversation.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex max-w-[80%] flex-col">
                    <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                      m.sender === 'admin' ? 'bg-accent text-white' : 'bg-paper-dim text-ink-soft'
                    }`}
                  >
                    {m.text}
                    </div>
                        {m.sender === 'admin' && (
                          <span className="mr-2 mt-0.5 text-[11px] font-semibold tracking-[-2px] text-accent" aria-label={m.readAt ? t('support.messageRead') : t('support.messageSent')}>
                            {m.readAt ? '✓✓' : '✓'}
                          </span>
                        )}
                        <span className={`mt-0.5 text-[10px] ${m.sender === 'admin' ? 'self-end text-accent/70' : 'text-steel'}`}>
                          {new Date(m.createdAt).toLocaleString(i18n.language, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendReply} className="flex items-center gap-2 border-t border-line p-3">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('admin.replyPlaceholder')}
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                aria-label={t('support.send')}
                className="btn-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaPaperPlane size={14} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      )}

      {clearConversationConfirmOpen && activeConversation && (
        <ConfirmDialog
          title={t('admin.clearChat')}
          message={t('admin.confirmClearChat')}
          confirmLabel={t('admin.confirm')}
          cancelLabel={t('admin.cancel')}
          onConfirm={handleClearConversation}
          onCancel={() => setClearConversationConfirmOpen(false)}
        />
      )}

      {/* ── Product Create/Edit Modal ── */}
      {modalOpen && (
        <div className="admin-modal-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-ink/60 p-2 sm:p-4 modal-overlay-enter" onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="admin-product-modal flex w-full max-w-2xl flex-col rounded-2xl bg-white p-5 modal-enter sm:p-7">
            <h3 className="mb-4 shrink-0 bg-white pb-1 font-display text-lg font-semibold text-ink-soft">
              {editingId ? t('admin.editProduct') : t('admin.addProduct')}
            </h3>
            <form id="product-editor-form" onSubmit={handleSubmit} className="admin-product-form min-h-0">
              <div className="admin-form-scroll space-y-3 overflow-y-auto overscroll-contain pr-1">
              <Field label={t('admin.name')} error={errors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('admin.brand')} error={errors.brand}>
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" />
                </Field>
                <Field label={t('admin.category')} error={errors.category}>
                  <GlassSelect
                    value={form.category}
                    onChange={(value) => setForm({ ...form, category: value })}
                    options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t('admin.price')} error={errors.price}>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
                </Field>
                <Field label="Old price">
                  <input type="number" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} className="input" />
                </Field>
                <Field label={t('admin.stock')} error={errors.stock}>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input" />
                </Field>
              </div>
              <Field label={t('product.storage')}>
                <input value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} placeholder="128GB, 256GB, 512GB" className="input" />
              </Field>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-steel">{t('admin.variantStock')}</span>
                  <button type="button" onClick={() => setForm({ ...form, variants: [...form.variants, { storage: '', color: '', hex: '#1c1c1e', stock: 0 }] })} className="text-xs font-semibold text-accent">+ {t('admin.variant')}</button>
                </div>
                <div className="space-y-2">
                  {form.variants.map((variant, index) => (
                    <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_3rem_minmax(4rem,0.65fr)_2rem] gap-2">
                      <input className="input min-w-0" placeholder="128GB" value={variant.storage} onChange={(e) => updateVariant(index, { storage: e.target.value })} />
                      <input className="input min-w-0" placeholder="Titanium" value={variant.color} onChange={(e) => updateVariant(index, { color: e.target.value })} />
                      <input
                        className="variant-color-picker"
                        type="color"
                        value={variant.hex || '#1c1c1e'}
                        onChange={(e) => updateVariant(index, { hex: e.target.value })}
                        aria-label={`Цвет ${variant.color || index + 1}`}
                        title="Выбрать цвет"
                      />
                      <input className="input min-w-0" type="number" min="0" value={variant.stock} onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })} />
                      <button type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) })} className="text-danger" aria-label="Variantni o'chirish">×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-steel">{t('admin.specifications')}</span>
                  <button type="button" onClick={() => setForm({ ...form, specs: [...form.specs, { key: '', value: '' }] })} className="text-xs font-semibold text-accent">
                    + {t('admin.addSpecification')}
                  </button>
                </div>
                <div className="space-y-2">
                  {form.specs.map((spec, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1.4fr_2rem] gap-2">
                      <input className="input" placeholder={t('admin.specificationName')} value={spec.key} onChange={(e) => updateSpec(index, { key: e.target.value })} />
                      <input className="input" placeholder={t('admin.specificationValue')} value={spec.value} onChange={(e) => updateSpec(index, { value: e.target.value })} />
                      <button type="button" onClick={() => setForm({ ...form, specs: form.specs.filter((_, i) => i !== index) })} className="text-danger" aria-label={t('admin.removeSpecification')}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <Field label={t('product.description')}>
                <div className="space-y-2">
                  {orderedDescriptionLanguages.map((language) => (
                    <textarea
                      key={language.code}
                      rows={2}
                      value={form.description?.[language.code] || ''}
                      onChange={(e) => setForm({
                        ...form,
                        description: { ...form.description, [language.code]: e.target.value },
                      })}
                      placeholder={language.label}
                      aria-label={`${t('product.description')} - ${language.label}`}
                      className="input resize-none"
                    />
                  ))}
                </div>
              </Field>
              <Field label={t('admin.imagesLimit')}>
                <input type="file" accept="image/*" multiple onChange={(e) => handleImageChange(e, setForm)} className="text-sm text-steel" />
                {!!form.images.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.images.map((image, index) => (
                      <div key={`${image}-${index}`} className="admin-image-preview">
                        <img src={image} alt={`preview ${index + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="admin-image-remove"
                          aria-label={`Удалить изображение ${index + 1}`}
                          title="Удалить изображение"
                        >
                          <FaXmark aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
              </div>
              <div className="admin-form-actions flex shrink-0 justify-end gap-2 bg-white pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-glass rounded-full border border-line px-4 py-2 text-sm font-medium">
                  {t('admin.cancel')}
                </button>
                <button type="submit" className="btn-glass rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-dim">
                  {t('admin.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 modal-overlay-enter" onClick={() => setDeletingId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center modal-enter">
            <p className="mb-5 text-sm text-ink-soft">{t('admin.confirmDelete')}</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeletingId(null)} className="rounded-full border border-line px-4 py-2 text-sm font-medium">
                {t('admin.cancel')}
              </button>
              <button onClick={() => handleDelete(deletingId)} className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white">
                {t('admin.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      {deletingOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 modal-overlay-enter" onClick={() => setDeletingOrderId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center modal-enter">
            <p className="mb-2 font-display text-lg font-semibold text-ink-soft">{t('admin.deleteOrderConfirm')}</p>
            <p className="mb-5 text-sm text-steel">{t('admin.deleteOrderHint')}</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeletingOrderId(null)} className="rounded-full border border-line px-4 py-2 text-sm font-medium">{t('admin.cancel')}</button>
              <button onClick={() => handleOrderDelete(deletingOrderId)} className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white">{t('admin.confirm')}</button>
            </div>
          </div>
        </div>
      )}
      {selectedStatData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 modal-overlay-enter" onClick={() => setSelectedStat(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-realistic-lg modal-enter">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-ink-soft">{selectedStatData.title}</h2>
              <button type="button" onClick={() => setSelectedStat(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-steel hover:text-ink-soft" aria-label={t('common.close')}>
                <FaXmark size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 max-h-[55vh] overflow-y-auto rounded-xl border border-line">
              {selectedStatData.rows.length ? selectedStatData.rows.map((row, index) => (
                <div key={`${row}-${index}`} className="border-b border-line px-4 py-3 text-sm text-ink-soft last:border-0">
                  {row}
                </div>
              )) : (
                <div className="px-4 py-8 text-center text-sm text-steel">{t('admin.noData')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-steel">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

function normalizeSpecs(specs) {
  if (Array.isArray(specs)) return specs.map((spec) => ({ key: spec.key || '', value: spec.value || '' }))
  if (specs && typeof specs === 'object') {
    return Object.entries(specs).map(([key, value]) => ({ key, value: String(value ?? '') }))
  }
  return EMPTY_FORM.specs.map((spec) => ({ ...spec }))
}
