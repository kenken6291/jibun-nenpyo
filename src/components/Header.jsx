import { Sun, Moon, Download, Upload } from 'lucide-react'
import { useRef } from 'react'

export default function Header({ darkMode, onToggleDark, onExport, onImport }) {
  const fileInputRef = useRef()

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 md:px-6
      bg-white/90 dark:bg-ink-900/90 backdrop-blur-sm
      border-b border-ink-200 dark:border-ink-700 no-print shadow-sm">
      
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-center justify-center w-7 h-7">
            <div className="w-0.5 h-full bg-gradient-to-b from-gold to-vermillion rounded-full relative">
              <div className="absolute top-1 -translate-x-1/2 left-1/2 w-2.5 h-2.5 rounded-full bg-vermillion ring-2 ring-vermillion/20" />
              <div className="absolute top-[44%] -translate-x-1/2 left-1/2 w-2 h-2 rounded-full bg-gold ring-2 ring-gold/20" />
              <div className="absolute bottom-1 -translate-x-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />
            </div>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-display font-semibold text-ink-800 dark:text-ink-100 leading-tight">
              人生の棚卸し年表
            </h1>
            <p className="text-[10px] text-ink-400 dark:text-ink-500 leading-none hidden sm:block">
              My Life Chronicle
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onExport}
          title="JSONで保存"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-ink-600 dark:text-ink-300
            hover:bg-ink-100 dark:hover:bg-ink-700 rounded-lg transition-colors"
        >
          <Download size={14} />
          <span className="hidden sm:inline">保存</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="JSONから読み込み"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-ink-600 dark:text-ink-300
            hover:bg-ink-100 dark:hover:bg-ink-700 rounded-lg transition-colors"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">読込</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onImport}
        />

        <div className="w-px h-5 bg-ink-200 dark:bg-ink-700 mx-0.5" />

        <button
          onClick={onToggleDark}
          title={darkMode ? 'ライトモードへ' : 'ダークモードへ'}
          className="p-1.5 rounded-lg text-ink-600 dark:text-ink-300
            hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}
