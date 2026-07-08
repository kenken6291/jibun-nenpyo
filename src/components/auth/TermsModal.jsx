import { TERMS_SECTIONS } from '../../utils/terms.js'
import { X } from 'lucide-react'

export function TermsBody() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
        本サービスは<strong>無料・個人ボランティア運営</strong>です。ご利用の前に、以下の内容を必ずご確認ください。
      </p>
      {TERMS_SECTIONS.map(section => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold text-ink-700 dark:text-ink-200 mb-1">{section.title}</h3>
          <p className="text-[11px] text-ink-500 dark:text-ink-400 leading-relaxed whitespace-pre-line">
            {section.body}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function TermsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-ink-900 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-700">
          <h2 className="text-sm font-display font-semibold text-ink-800 dark:text-ink-100">
            利用規約・免責事項
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scroll px-4 py-4">
          <TermsBody />
        </div>
        <div className="px-4 py-3 border-t border-ink-100 dark:border-ink-700">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm font-medium bg-indigo-700 hover:bg-indigo-800 text-white transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
