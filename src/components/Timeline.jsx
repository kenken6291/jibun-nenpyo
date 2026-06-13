import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Newspaper } from 'lucide-react'

function calcAge(year, profile) {
  if (!profile.birthYear || !year) return null
  const age = parseInt(year) - parseInt(profile.birthYear)
  return age >= 0 ? age : null
}

function groupEntriesByYear(entries) {
  return entries.reduce((acc, entry) => {
    const y = entry.year
    if (!acc[y]) acc[y] = []
    acc[y].push(entry)
    return acc
  }, {})
}

function NewsPopover({ year, historicalEvents }) {
  const [open, setOpen] = useState(false)
  const events = historicalEvents[String(year)]
  if (!events) return null

  const allNews = [
    ...(events.politics || []).map(e => ({ text: e, type: 'politics' })),
    ...(events.economy || []).map(e => ({ text: e, type: 'economy' })),
    ...(events.culture || []).map(e => ({ text: e, type: 'culture' })),
    ...(events.trend || []).map(e => ({ text: e, type: 'trend' })),
  ]

  const typeConfig = {
    politics: { label: '政治', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950', icon: '🏛️' },
    economy: { label: '経済', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', icon: '💹' },
    culture: { label: '文化', color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950', icon: '🎭' },
    trend: { label: '流行', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950', icon: '✨' },
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors font-medium border
          ${open
            ? 'bg-ink-700 text-white border-ink-700 dark:bg-ink-300 dark:text-ink-900 dark:border-ink-300'
            : 'bg-ink-50 dark:bg-ink-800 text-ink-500 dark:text-ink-400 border-ink-200 dark:border-ink-600 hover:border-ink-400'
          }`}
      >
        <Newspaper size={9} />
        社会の出来事
        {open ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-xl border border-ink-200 dark:border-ink-600
          bg-white dark:bg-ink-800 shadow-md
          text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {Object.entries(typeConfig).map(([type, cfg]) => {
            const items = allNews.filter(n => n.type === type)
            if (items.length === 0) return null
            return (
              <div key={type}>
                <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} mb-1`}>
                  {cfg.icon} {cfg.label}
                </div>
                <ul className="space-y-0.5 pl-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-ink-600 dark:text-ink-300 text-[11px] leading-relaxed flex gap-1">
                      <span className="text-ink-300 dark:text-ink-500 flex-shrink-0 mt-px">・</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimelineEntry({ entry, isLeft, categories, profile, historicalEvents, isLastInYear, isFirstInYear, year }) {
  const cat = categories[entry.category] || categories.general
  const age = calcAge(entry.year, profile)

  return (
    <div className={`flex w-full gap-4 md:gap-6 items-start timeline-entry`}>
      {/* Left side content (for alternating layout) */}
      <div className={`flex-1 ${isLeft ? '' : 'order-2'}`}>
        <div className={`rounded-xl border p-3 shadow-sm transition-all hover:shadow-md
          ${cat.lightBg} ${cat.darkBg} ${cat.borderColor.replace('border-', 'border-').replace('700', '200').replace('600', '200').replace('500', '200')}
          border-l-4 ${cat.borderColor}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className={`text-xs font-semibold ${cat.textColor}`}>
                  {cat.icon} {cat.label}
                </span>
                {entry.month && (
                  <span className="text-[10px] text-ink-400 dark:text-ink-500">{entry.month}月</span>
                )}
              </div>
              <p className="text-sm font-semibold text-ink-800 dark:text-ink-100 leading-snug">
                {entry.title}
              </p>
              {entry.memo && (
                <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1.5 leading-relaxed">
                  {entry.memo}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* News popover under the first entry of this year on the right side */}
        {isFirstInYear && !isLeft && (
          <div className="mt-2">
            <NewsPopover year={year} historicalEvents={historicalEvents} />
          </div>
        )}
        {isFirstInYear && isLeft && (
          <div className="mt-2">
            <NewsPopover year={year} historicalEvents={historicalEvents} />
          </div>
        )}
      </div>

      {/* Center dot + year label */}
      <div className={`flex flex-col items-center flex-shrink-0 ${isLeft ? 'order-2' : 'order-1'}`}>
        <div className={`w-3 h-3 rounded-full ring-4 ring-white dark:ring-ink-900 ${cat.color} dot-pulse flex-shrink-0`} />
      </div>

      {/* Right side spacer (for alternating) */}
      <div className="flex-1" />
    </div>
  )
}

export default function Timeline({ profile, entries, categories, historicalEvents }) {
  const grouped = useMemo(() => groupEntriesByYear(entries), [entries])
  const years = useMemo(() => Object.keys(grouped).sort((a, b) => a - b), [grouped])

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center
        bg-washi dark:bg-ink-900">
        <div className="relative mb-8">
          {/* Decorative timeline illustration */}
          <div className="w-1 h-48 bg-gradient-to-b from-gold via-vermillion to-indigo-700 rounded-full mx-auto opacity-30" />
          {[0, 40, 80, 140, 180].map((top, i) => (
            <div
              key={i}
              className={`absolute -translate-x-1/2 left-1/2 w-4 h-4 rounded-full opacity-30 ${
                ['bg-gold', 'bg-vermillion', 'bg-indigo-600', 'bg-moss', 'bg-slate-400'][i]
              }`}
              style={{ top: `${top}px` }}
            />
          ))}
        </div>
        <h2 className="text-2xl font-display font-semibold text-ink-300 dark:text-ink-600 mb-3">
          あなたの年表がここに現れます
        </h2>
        <p className="text-sm text-ink-300 dark:text-ink-600 max-w-xs leading-relaxed">
          左の編集エリアから出来事を追加すると、時系列の美しい年表として表示されます
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-washi dark:bg-ink-900 py-8 px-4 md:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        {profile.name && (
          <h2 className="text-2xl font-display font-semibold text-ink-800 dark:text-ink-100 mb-1">
            {profile.name}の年表
          </h2>
        )}
        {!profile.name && (
          <h2 className="text-2xl font-display font-semibold text-ink-800 dark:text-ink-100 mb-1">
            わたしの年表
          </h2>
        )}
        <p className="text-sm text-ink-400 dark:text-ink-500 font-display">
          {entries.length}件の記録 · {years[0]}年〜{years[years.length - 1]}年
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 flex-wrap">
          {Object.entries(categories).map(([key, cat]) => {
            const count = entries.filter(e => e.category === key).length
            if (count === 0) return null
            return (
              <span key={key} className={`flex items-center gap-1 text-xs ${cat.textColor}`}>
                <span className={`inline-block w-2 h-2 rounded-full ${cat.color}`} />
                {cat.label} {count}件
              </span>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative max-w-2xl mx-auto">
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2
          bg-gradient-to-b from-gold via-vermillion to-indigo-700 opacity-30" />

        <div className="space-y-10">
          {years.map((year, yearIdx) => {
            const yearEntries = grouped[year]
            const age = calcAge(parseInt(year), profile)
            const hasNews = !!historicalEvents[year]

            return (
              <div key={year} className="relative">
                {/* Year badge */}
                <div className="flex justify-center mb-5">
                  <div className="relative z-10 flex items-center gap-2
                    bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-600
                    px-4 py-1.5 rounded-full shadow-sm">
                    <span className="font-display font-semibold text-base text-ink-800 dark:text-ink-100">
                      {year}
                    </span>
                    {age !== null && (
                      <span className="text-xs text-ink-400 dark:text-ink-500 font-medium">
                        ({age}歳)
                      </span>
                    )}
                    {hasNews && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" title="社会の出来事あり" />
                    )}
                  </div>
                </div>

                {/* Entries for this year */}
                <div className="space-y-4">
                  {yearEntries.map((entry, entryIdx) => {
                    const cat = categories[entry.category] || categories.general
                    const isLeft = entryIdx % 2 === 0

                    return (
                      <div key={entry.id} className="flex items-start gap-3 md:gap-4">
                        {/* Left slot */}
                        <div className={`flex-1 ${isLeft ? '' : 'invisible'}`}>
                          {isLeft && (
                            <div>
                              <div className={`rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow
                                bg-white dark:bg-ink-800 border-l-4 ${cat.borderColor}`}
                              >
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className={`text-[10px] font-semibold ${cat.textColor}`}>
                                    {cat.icon} {cat.label}
                                  </span>
                                  {entry.month && (
                                    <span className="text-[10px] text-ink-300 dark:text-ink-600">{entry.month}月</span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-ink-800 dark:text-ink-100 leading-snug">
                                  {entry.title}
                                </p>
                                {entry.memo && (
                                  <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1.5 leading-relaxed">
                                    {entry.memo}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Center dot */}
                        <div className="flex flex-col items-center flex-shrink-0 mt-4">
                          <div className={`w-3 h-3 rounded-full ring-[3px] ring-white dark:ring-ink-900 z-10 ${cat.color}`} />
                        </div>

                        {/* Right slot */}
                        <div className={`flex-1 ${!isLeft ? '' : 'invisible'}`}>
                          {!isLeft && (
                            <div>
                              <div className={`rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow
                                bg-white dark:bg-ink-800 border-l-4 ${cat.borderColor}`}
                              >
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className={`text-[10px] font-semibold ${cat.textColor}`}>
                                    {cat.icon} {cat.label}
                                  </span>
                                  {entry.month && (
                                    <span className="text-[10px] text-ink-300 dark:text-ink-600">{entry.month}月</span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-ink-800 dark:text-ink-100 leading-snug">
                                  {entry.title}
                                </p>
                                {entry.memo && (
                                  <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1.5 leading-relaxed">
                                    {entry.memo}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Social news for this year */}
                {hasNews && (
                  <div className="mt-4 flex justify-center">
                    <div className="max-w-sm w-full">
                      <NewsAccordion year={year} historicalEvents={historicalEvents} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* End of timeline */}
        <div className="flex justify-center mt-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-900" />
            <span className="text-xs text-ink-300 dark:text-ink-600">現在</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewsAccordion({ year, historicalEvents }) {
  const [open, setOpen] = useState(false)
  const events = historicalEvents[String(year)]
  if (!events) return null

  const typeConfig = {
    politics: { label: '政治', icon: '🏛️', color: 'text-red-600 dark:text-red-400' },
    economy: { label: '経済', icon: '💹', color: 'text-amber-700 dark:text-amber-400' },
    culture: { label: '文化', icon: '🎭', color: 'text-indigo-700 dark:text-indigo-400' },
    trend: { label: '流行', icon: '✨', color: 'text-emerald-700 dark:text-emerald-400' },
  }

  const allItems = Object.entries(typeConfig).flatMap(([type, cfg]) =>
    (events[type] || []).map(text => ({ text, ...cfg }))
  )

  const preview = allItems.slice(0, 2)

  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-700 overflow-hidden
      bg-ink-50/60 dark:bg-ink-800/40 backdrop-blur-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-ink-100/50 dark:hover:bg-ink-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Newspaper size={12} className="text-ink-400 dark:text-ink-500" />
          <span className="text-[11px] font-medium text-ink-500 dark:text-ink-400">
            {year}年の社会の出来事
          </span>
          {!open && (
            <span className="text-[10px] text-ink-300 dark:text-ink-600">
              {preview.map(p => p.text).join('、').slice(0, 30)}…
            </span>
          )}
        </div>
        {open ? <ChevronDown size={12} className="text-ink-400 flex-shrink-0" /> : <ChevronRight size={12} className="text-ink-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-ink-100 dark:border-ink-700 pt-2">
          {Object.entries(typeConfig).map(([type, cfg]) => {
            const items = events[type] || []
            if (items.length === 0) return null
            return (
              <div key={type}>
                <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                <ul className="mt-0.5 space-y-0.5">
                  {items.map((item, i) => (
                    <li key={i} className="text-[11px] text-ink-500 dark:text-ink-400 leading-relaxed flex gap-1">
                      <span className="text-ink-300 dark:text-ink-600 flex-shrink-0">・</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
