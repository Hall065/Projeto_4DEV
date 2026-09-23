import { createElement, type ElementType, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { easing } from './tokens'
import { useMotionPreference } from './useMotionPreference'

export type WordRiseSegment = {
  text: string
  className?: string
}

type WordRiseProps = {
  /** Plain string, or segments for mixed styles (e.g. highlight words). */
  text?: string
  segments?: WordRiseSegment[]
  className?: string
  /** Extra class on every word span (or per-word via function). */
  wordClassName?: string
  as?: ElementType
  /** Delay before the first word (seconds). */
  delay?: number
  /** Gap between consecutive words — Portfolio Intro uses 0.08. */
  stagger?: number
  /** Rise duration per word — Portfolio Intro uses 1. */
  durationSec?: number
  /** Initial y as % of word height — Portfolio Intro uses 120. */
  yPercent?: number
  /**
   * `settings` (default) — landing/decorative; OS reduce alone does not freeze.
   * `all` — also respect prefers-reduced-motion.
   */
  preferenceMode?: 'settings' | 'all'
}

type FlatWord = {
  word: string
  className?: string
  key: string
}

function flattenWords(text: string | undefined, segments: WordRiseSegment[] | undefined): FlatWord[] {
  const parts: WordRiseSegment[] =
    segments?.length ? segments : text != null ? [{ text }] : []

  const out: FlatWord[] = []
  let n = 0
  for (const part of parts) {
    const words = part.text.trim().split(/\s+/).filter(Boolean)
    for (const word of words) {
      out.push({
        word,
        className: part.className,
        key: `${n}-${word}`,
      })
      n += 1
    }
  }
  return out
}

/**
 * Portfolio Intro-style word rise: each word clips and slides up in sequence.
 * GSAP reference: yPercent 120, stagger 0.08, duration 1, power4.out.
 */
export function WordRise({
  text,
  segments,
  className,
  wordClassName,
  as = 'span',
  delay = 0,
  stagger = 0.08,
  durationSec = 1,
  yPercent = 120,
  preferenceMode = 'settings',
}: WordRiseProps) {
  const reduceMotion = useMotionPreference(preferenceMode)
  const words = flattenWords(text, segments)

  const children: ReactNode = words.map((item, i) => (
    <span
      key={item.key}
      className="mr-[0.28em] inline-block overflow-hidden align-bottom last:mr-0"
    >
      <motion.span
        className={['inline-block', wordClassName, item.className].filter(Boolean).join(' ')}
        initial={reduceMotion ? false : { y: `${yPercent}%` }}
        animate={{ y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : durationSec,
          ease: easing.marketing,
          delay: reduceMotion ? 0 : delay + i * stagger,
        }}
      >
        {item.word}
      </motion.span>
    </span>
  ))

  return createElement(as, { className }, children)
}
