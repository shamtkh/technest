import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { getMyMessagesThunk } from '../store/thunks/getMyMessagesThunk'
import { sendMessageThunk } from '../store/thunks/sendMessageThunk'
import { markMyMessagesRead } from '../store/slices/chatSlice'
import { markMessageReadThunk } from '../store/thunks/markMessageReadThunk'
import { useToast } from '../hooks/useToast'
import { FaHeadset, FaXmark, FaTelegram, FaPhone, FaPaperPlane, FaCommentDots, FaChevronLeft, FaChevronRight } from 'react-icons/fa6'

const TELEGRAM_HANDLE = '@TkhrVv1'
const TELEGRAM_URL = 'https://t.me/TkhrVv1'
const PHONE_DISPLAY = '+998 97 000 45 25'
const PHONE_HREF = 'tel:+998970004525'

export default function SupportWidget() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const user = useSelector((s) => s.auth.user)
  const messages = useSelector((s) => s.chat.myMessages)
  const unreadCount = useSelector((s) => s.chat.myUnreadCount)
  const isAdmin = user?.role === 'admin'

  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu') // 'menu' | 'chat'
  const [text, setText] = useState('')
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const lastNotifiedUnread = useRef(null)

  function formatMessageTime(createdAt) {
    return new Date(createdAt).toLocaleString(i18n.language, {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  useEffect(() => {
    if (!user || isAdmin) return
    dispatch(getMyMessagesThunk(user.id))
    const interval = setInterval(() => dispatch(getMyMessagesThunk(user.id)), 10000)
    return () => clearInterval(interval)
  }, [user, isAdmin, dispatch])

  useEffect(() => {
    if (!user || isAdmin || unreadCount === undefined) return
    if (lastNotifiedUnread.current === null) {
      lastNotifiedUnread.current = unreadCount
      if (unreadCount > 0 && !(open && view === 'chat')) {
        showToast(`💬 ${t('support.newMessageToast')}`, 'info', 5000)
      }
      return
    }
    if (unreadCount > lastNotifiedUnread.current && !(open && view === 'chat')) {
      showToast(`💬 ${t('support.newMessageToast')}`, 'info', 5000)
    }
    lastNotifiedUnread.current = unreadCount
  }, [isAdmin, open, showToast, t, unreadCount, user, view])

  useEffect(() => {
    if (open && view === 'chat' && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [open, view, messages])

  useEffect(() => {
    if (!user || isAdmin || !open || view !== 'chat') return
    const adminMessageIds = messages.filter((message) => message.sender === 'admin').map((message) => message.id)
    localStorage.setItem(`technest_seen_support_${user.id}`, JSON.stringify(adminMessageIds))
    if (unreadCount > 0) dispatch(markMyMessagesRead())
  }, [dispatch, isAdmin, messages, open, unreadCount, user, view])

  useEffect(() => {
    function handlePointerDown(event) {
      if (open && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  if (isAdmin) return null

  function toggleOpen() {
    setOpen((value) => {
      const next = !value
      if (!next) setView('menu')
      return next
    })
  }

  function openChat() {
    setView('chat')
    const adminMessageIds = messages.filter((message) => message.sender === 'admin').map((message) => message.id)
    localStorage.setItem(`technest_seen_support_${user.id}`, JSON.stringify(adminMessageIds))
    messages
      .filter((message) => message.sender === 'admin' && !message.readAt)
      .forEach((message) => dispatch(markMessageReadThunk(message.id)))
    dispatch(markMyMessagesRead())
  }

  function handleSend(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || !user) return
    dispatch(sendMessageThunk({ userId: user.id, userName: user.name, sender: 'user', text: trimmed }))
    setText('')
  }

  return (
    <div ref={rootRef} className="fixed z-40 bottom-24 right-4 flex flex-col items-end sm:right-6 lg:bottom-6">
      {open && (
        <div
          className="mb-3 flex w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-realistic-lg modal-enter"
          style={{ maxHeight: '30rem' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
            {view === 'chat' && (
              <button
                onClick={() => setView('menu')}
                aria-label={t('common.back')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-steel hover:text-ink-soft"
              >
                <FaChevronLeft size={13} aria-hidden="true" />
              </button>
            )}
            <div className="flex-1 spec-strip font-bold uppercase tracking-wide text-ink-soft">
              {view === 'chat' ? t('support.chatTitle') : t('support.title')}
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('common.close')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-steel hover:text-ink-soft"
            >
              <FaXmark size={15} aria-hidden="true" />
            </button>
          </div>

          {view === 'menu' && (
            <div className="divide-y divide-line overflow-y-auto py-1">
              <SupportRow
                icon={<FaCommentDots size={17} aria-hidden="true" />}
                iconBg="rgba(61,127,255,0.12)"
                iconColor="var(--color-accent)"
                title={t('support.chatTitle')}
                subtitle={user ? t('support.chatSubtitle') : t('support.chatLoginRequired')}
                onClick={openChat}
              />
              <SupportRow
                as="a"
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                icon={<FaTelegram size={18} aria-hidden="true" />}
                iconBg="rgba(38,165,228,0.12)"
                iconColor="#26A5E4"
                title={t('support.telegram')}
                subtitle={TELEGRAM_HANDLE}
              />
              <SupportRow
                as="a"
                href={PHONE_HREF}
                icon={<FaPhone size={16} aria-hidden="true" />}
                iconBg="rgba(34,197,94,0.12)"
                iconColor="#16a34a"
                title={t('support.callUs')}
                subtitle={PHONE_DISPLAY}
              />
            </div>
          )}

          {view === 'chat' && (
            !user ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-steel">{t('support.chatLoginRequired')}</p>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
                >
                  {t('auth.loginBtn')}
                </Link>
              </div>
            ) : (
              <>
                <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2" style={{ minHeight: '10rem' }}>
                  {messages.length === 0 && (
                    <p className="mt-8 text-center text-xs text-steel">{t('support.chatEmpty')}</p>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex max-w-[80%] flex-col items-end">
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                            m.sender === 'user' ? 'bg-accent text-white' : 'bg-paper-dim text-ink-soft'
                          }`}
                        >
                          {m.text}
                        </div>
                        {m.sender === 'user' && (
                          <span className="mr-2 mt-0.5 text-[11px] font-semibold tracking-[-2px] text-accent" aria-label={t('support.messageRead')}>
                            ✓✓
                          </span>
                        )}
                        <span className={`mt-0.5 text-[10px] ${m.sender === 'user' ? 'mr-2 text-accent/70' : 'ml-2 text-steel'}`}>
                          {formatMessageTime(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-line p-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('support.chatPlaceholder')}
                    className="input flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    aria-label={t('support.send')}
                    className="btn-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaPaperPlane size={14} aria-hidden="true" />
                  </button>
                </form>
              </>
            )
          )}
        </div>
      )}

      <button
        onClick={toggleOpen}
        aria-label={t('support.title')}
        className="btn-glass relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-realistic-lg hover:bg-accent-dim"
      >
        {open ? <FaXmark size={20} aria-hidden="true" /> : <FaHeadset size={22} aria-hidden="true" />}
        {!open && unreadCount > 0 && (
          <span className="support-unread-badge absolute z-10 flex items-center justify-center rounded-full bg-danger px-1 font-mono-tabular text-[10px] font-semibold leading-none text-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}

function SupportRow({ as = 'button', icon, iconBg, iconColor, title, subtitle, onClick, href, target, rel }) {
  const Tag = as
  const tagProps = as === 'a' ? { href, target, rel } : { type: 'button', onClick }
  return (
    <Tag {...tagProps} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-soft">{title}</span>
        <span className="block truncate text-xs text-steel">{subtitle}</span>
      </span>
      <FaChevronRight size={11} className="shrink-0 text-steel" aria-hidden="true" />
    </Tag>
  )
}
