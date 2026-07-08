import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({ value, onChange, placeholder, error, autoComplete, id }) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border
            bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            placeholder:text-ink-300 dark:placeholder:text-ink-600
            ${error ? 'border-red-400' : 'border-ink-200 dark:border-ink-600'}`}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          tabIndex={-1}
          title={visible ? 'パスワードを隠す' : 'パスワードを表示'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
