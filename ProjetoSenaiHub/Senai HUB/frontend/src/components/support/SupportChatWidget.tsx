import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Mail, Minus, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSupportChat } from '../../contexts/SupportChatContext'
import { HUB_BRAND_ASSETS } from '../../utils/appBrandAssets'

function TypingIndicator() {
  return (
    <div className="support-chat-typing flex items-center gap-1 px-1 py-2" aria-hidden>
      <span className="h-2 w-2 animate-bounce rounded-full bg-hub-navy/40 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-hub-navy/40 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-hub-navy/40 [animation-delay:300ms]" />
    </div>
  )
}

export function SupportChatWidget() {
  const { t } = useTranslation()
  const { view, messages, isAgentTyping, close, minimize, maximize, sendMessage } = useSupportChat()
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (view === 'open') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [view, messages, isAgentTyping])

  const resolveText = (text: string) => {
    if (text === '__welcome__') return t('supportChat.welcome')
    if (text === '__autoReply__') return t('supportChat.autoReply')
    return text
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim()) return
    sendMessage(draft)
    setDraft('')
  }

  if (view === 'closed') return null

  const header = (
    <div className="flex items-center gap-3">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-hub-red/80">
        <img src={HUB_BRAND_ASSETS.icon} alt="" aria-hidden className="h-6 w-6 object-contain" />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a0c10] bg-emerald-400" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{t('supportChat.title')}</p>
        <p className="text-[11px] text-white/70">{t('supportChat.subtitle')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {view === 'open' && (
          <button
            type="button"
            onClick={minimize}
            className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10"
            aria-label={t('supportChat.minimize')}
          >
            <Minus className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10"
          aria-label={t('supportChat.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  if (view === 'minimized') {
    return (
      <div className="support-chat-widget pointer-events-auto fixed bottom-4 right-4 z-[80] w-[min(100vw-2rem,320px)]">
        <button
          type="button"
          onClick={maximize}
          className="hub-chrome flex w-full items-center gap-3 rounded-t-2xl border border-white/10 px-4 py-3 text-left text-white shadow-[0_8px_32px_rgba(2,26,58,0.35)] transition hover:brightness-110"
          aria-label={t('supportChat.open')}
        >
          {header}
        </button>
      </div>
    )
  }

  return (
    <div
      className="support-chat-widget pointer-events-auto fixed bottom-4 right-4 z-[80] flex w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-white/15 shadow-[0_12px_48px_rgba(2,26,58,0.28)]"
      role="dialog"
      aria-label={t('supportChat.title')}
    >
      <div className="hub-chrome shrink-0 border-b border-white/10 px-4 py-3 text-white">{header}</div>

      <div className="support-chat-messages flex max-h-[min(52vh,360px)] min-h-[240px] flex-1 flex-col gap-3 overflow-y-auto bg-white/92 px-3 py-4 backdrop-blur-md">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                message.role === 'user'
                  ? 'rounded-br-md bg-hub-red text-white'
                  : 'rounded-bl-md border border-hub-navy/8 bg-white text-hub-navy'
              }`}
            >
              {resolveText(message.text)}
            </div>
          </div>
        ))}
        {isAgentTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-hub-navy/8 bg-white px-3 py-1 shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-hub-navy/10 bg-white/95 px-3 py-3 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('supportChat.placeholder')}
            className="min-w-0 flex-1 rounded-full border border-hub-navy/15 bg-white px-4 py-2.5 text-sm text-hub-navy outline-none transition placeholder:text-hub-text-muted focus:border-hub-red/50 focus:ring-2 focus:ring-hub-red/15"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hub-red text-white transition hover:bg-hub-red/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('supportChat.send')}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] text-hub-text-muted">
          <Mail className="h-3 w-3 shrink-0" />
          <span>
            {t('supportChat.emailFallback')}{' '}
            <a href="mailto:suporte@senaihub.local" className="font-medium text-hub-red hover:underline">
              suporte@senaihub.local
            </a>
          </span>
        </p>
      </form>
    </div>
  )
}
