import { useState, useEffect, useRef } from 'react'
import { api } from './api'


// ---------------------------------------------------------------------
// PROFESSIONAL AI MESSAGE RENDERER
// Converts the agents' Markdown responses into clean, readable UI.
// ---------------------------------------------------------------------
function AIMessage({ text }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0

  const inline = (value) => {
    const parts = String(value).split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
    return parts.map((part, index) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return <strong key={index} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>
      }
      if (/^`[^`]+`$/.test(part)) {
        return <code key={index} className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[0.9em]">{part.slice(1, -1)}</code>
      }
      if (/^\*[^*]+\*$/.test(part)) {
        return <em key={index}>{part.slice(1, -1)}</em>
      }
      return <span key={index}>{part}</span>
    })
  }

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) {
      i += 1
      continue
    }

    // Markdown table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const tableLines = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        tableLines.push(lines[i].trim())
        i += 1
      }
      const parseRow = (row) => row.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
      const headers = parseRow(tableLines[0])
      const rows = tableLines.slice(2).map(parseRow)
      blocks.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4 rounded-2xl border border-slate-200">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100">
              <tr>{headers.map((h, idx) => <th key={idx} className="px-3 py-2.5 text-left font-black text-slate-700 border-b border-slate-200 whitespace-nowrap">{inline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className={r % 2 ? 'bg-slate-50/60' : 'bg-white'}>
                  {headers.map((_, c) => <td key={c} className="px-3 py-2.5 text-slate-600 border-b border-slate-100">{inline(row[c] || '—')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Headings
    const heading = line.match(/^#{1,3}\s+(.+)$/)
    if (heading) {
      blocks.push(<h3 key={`h-${i}`} className="text-base font-black text-slate-900 mt-2 mb-2">{inline(heading[1])}</h3>)
      i += 1
      continue
    }

    // Bulleted list
    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i += 1
      }
      blocks.push(<ul key={`ul-${i}`} className="list-disc pl-5 space-y-1.5 my-2">{items.map((item, idx) => <li key={idx}>{inline(item)}</li>)}</ul>)
      continue
    }

    // Numbered list
    if (/^\d+[.)]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''))
        i += 1
      }
      blocks.push(<ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1.5 my-2">{items.map((item, idx) => <li key={idx}>{inline(item)}</li>)}</ol>)
      continue
    }

    // Normal paragraph; combine consecutive text lines.
    const paragraph = [line]
    i += 1
    while (i < lines.length && lines[i].trim() && !/^#{1,3}\s+/.test(lines[i].trim()) && !/^[-*]\s+/.test(lines[i].trim()) && !/^\d+[.)]\s+/.test(lines[i].trim())) {
      paragraph.push(lines[i].trim())
      i += 1
    }
    blocks.push(<p key={`p-${i}`} className="leading-7 mb-3 last:mb-0">{inline(paragraph.join(' '))}</p>)
  }

  return <div className="text-sm leading-relaxed text-slate-700">{blocks}</div>
}

// ---------------------------------------------------------------------
// ENHANCED GLASSMORPHIC LOGIN SCREEN
// ---------------------------------------------------------------------
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Normalize before sending, same as everywhere else in the app -
    // matches the backend's now-case-insensitive lookups, and keeps
    // login/signup/Google-connect all keyed to the same value.
    const normalizedEmail = email.trim().toLowerCase()

    setLoading(true)
    try {
      if (mode === 'login') {
        const result = await api.login(normalizedEmail, password)
        onLogin(result.email) // Updated to expect email back from the API
      } else {
        await api.signup(normalizedEmail, password)
        setSuccess('Account created! Switch to Log In to continue.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Dynamic Background Mesh Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/30 rounded-full blur-[150px] pointer-events-none" />

      {/* Glassmorphism Portal Card */}
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 p-10 rounded-[2.5rem] w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-4 h-4 bg-gradient-to-tr from-teal-400 to-teal-300 rounded-full shadow-lg shadow-teal-500/50 animate-ping" />
          <h1 className="text-2xl font-black text-white tracking-tight">Apex Capital Bank</h1>
        </div>
        <p className="text-slate-400 text-xs font-semibold mb-8 tracking-wider uppercase">Secure Bank Portal</p>

        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl mb-8 border border-slate-800/80">
          <button
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${mode === 'login' ? 'bg-gradient-to-r from-teal-500 to-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
          >
            Log In
          </button>
          <button
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${mode === 'signup' ? 'bg-gradient-to-r from-teal-500 to-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl font-bold backdrop-blur-sm">{error}</div>}
        {success && <div className="mb-6 p-4 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs rounded-2xl font-bold backdrop-blur-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Enter Email</label>
            <input
              className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-600"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. your_name@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Enter Password</label>
            <input
              className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-600"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Confirm Password</label>
              <input
                className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-600"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button className="w-full mt-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:opacity-95 text-slate-950 font-black py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide" type="submit" disabled={loading}>
            {loading ? 'Authenticating System...' : mode === 'login' ? 'Access Dashboard' : 'Initialize Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// SIDEBAR
// ---------------------------------------------------------------------
const NAV_ITEMS = [
  'Dashboard',
  'Weather Updates',
  'Crypto Updates',
  'Your AI Assistant',
  'Email Agent',
  'Web Search Agent',
  'Image Generator',
  'Email Reader',
  'Calendar Agent',
  'Create Account',
  'Deposit',
  'Withdraw',
  'Transfer',
  'View Balance',
  'Transaction History',
  'All Accounts',
]

function Sidebar({ page, setPage, email, onLogout }) {
  return (
    <div className="w-72 bg-white/70 backdrop-blur-xl border-r border-slate-200/80 flex flex-col h-screen p-6 sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3.5 mb-10 px-2">
        <div className="w-3.5 h-3.5 bg-gradient-to-tr from-teal-600 to-teal-400 rounded-full shadow-md shadow-teal-500/20" />
        <span className="font-extrabold text-slate-900 tracking-tight text-sm">Apex Capital Bank</span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const isActive = page === item
          return (
            <button
              key={item}
              className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-between group ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15 translate-x-1' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}`}
              onClick={() => setPage(item)}
            >
              <span>{item}</span>
              {isActive && <div className="w-1.5 h-1.5 bg-teal-400 rounded-full shadow-sm animate-pulse" />}
            </button>
          )
        })}
      </div>

      <div className="pt-6 border-t border-slate-100 mt-4">
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl mb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active Session</div>
          <div className="text-xs font-black text-slate-800 truncate">{email}</div>
        </div>
        <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all shadow-sm" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// SVG LIQUIDITY TREND CHART
// ---------------------------------------------------------------------
function LiquidityTrendChart() {
  const points = [
    { month: 'Jan', val: 320 },
    { month: 'Feb', val: 450 },
    { month: 'Mar', val: 410 },
    { month: 'Apr', val: 680 },
    { month: 'May', val: 590 },
    { month: 'Jun', val: 740 },
    { month: 'Jul', val: 830 },
  ]

  const maxVal = 1000
  const height = 120
  const width = 600

  const svgPoints = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * width
    const y = height - (p.val / maxVal) * height
    return `${x},${y}`
  }).join(' ')

  const areaPath = `M 0,${height} L ${svgPoints} L ${width},${height} Z`

  return (
    <div className="mt-6 pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Capital Growth Velocity</span>
          <p className="text-xs font-semibold text-slate-500">System Liquidity Trajectory</p>
        </div>
        <span className="text-xs font-extrabold text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100/80">
          ↑ 159.3% Growth
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id="tealArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1="0" y1="0" x2={width} y2="0" stroke="#f1f5f9" strokeDasharray="4" />
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#f1f5f9" strokeDasharray="4" />
          <line x1="0" y1={height} x2={width} y2={height} stroke="#f1f5f9" strokeDasharray="4" />

          <path d={areaPath} fill="url(#tealArea)" />

          <polyline
            fill="none"
            stroke="#0f766e"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={svgPoints}
          />

          {points.map((p, idx) => {
            const x = (idx / (points.length - 1)) * width
            const y = height - (p.val / maxVal) * height
            return (
              <g key={idx} className="group/dot cursor-pointer">
                <circle cx={x} cy={y} r="5" className="fill-white stroke-teal-600 stroke-[3] group-hover/dot:r-7 transition-all duration-200" />
              </g>
            )
          })}
        </svg>

        <div className="flex justify-between text-[10px] font-black text-slate-400 mt-2 font-mono">
          {points.map(p => <span key={p.month}>{p.month}</span>)}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// ENHANCED ANALYTICS DASHBOARD
// ---------------------------------------------------------------------
function Dashboard({ email, onNavigate }) {
  const [accounts, setAccounts] = useState([])
  const [weather, setWeather] = useState([])
  const [crypto, setCrypto] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadDashboardData(showRefreshState = false) {
    if (showRefreshState) setRefreshing(true)
    setError('')

    try {
      const [accountData, weatherData, cryptoData] = await Promise.all([
        api.listAccounts(),
        api.getWeatherCities(),
        api.getCryptoCurrencies(),
      ])

      setAccounts(accountData || [])
      setWeather(weatherData?.cities || [])
      setCrypto(cryptoData?.currencies || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboardData()

    const interval = setInterval(() => {
      loadDashboardData()
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const totalAccounts = accounts.length
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0)
  const avgBalance = totalAccounts ? totalBalance / totalAccounts : 0
  const maxBalance = Math.max(1, ...accounts.map((a) => Number(a.balance || 0)))
  const topAccount = accounts.reduce(
    (best, account) => (!best || Number(account.balance || 0) > Number(best.balance || 0) ? account : best),
    null
  )

  const firstName = email?.split('@')[0]?.split(/[._-]/)[0]
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'there'
  const lahoreWeather = weather.find((city) => city.city === 'Lahore') || weather[0]
  const bitcoin = crypto.find((coin) => coin.name === 'Bitcoin') || crypto[0]

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white p-7 md:p-9 mb-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute right-20 -bottom-40 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-teal-400/5 blur-3xl" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.8)] animate-pulse" />
              Banking Command Center
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl xl:text-6xl font-black tracking-tight">
              Welcome back, {displayName}.
            </h1>

            <p className="mt-3 max-w-2xl text-sm md:text-base font-medium leading-relaxed text-slate-300">
              Your accounts, liquidity, live markets and intelligent banking tools are all in one place.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start xl:self-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md min-w-[165px]">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Status</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-black text-teal-300">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-400 animate-pulse" />
                Live & Synchronized
              </div>
            </div>

            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="min-w-[130px] rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh Data'}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-600">
          {error}
        </div>
      )}

      {/* KPI CARDS */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-[2rem] border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Balance',
              value: `$${totalBalance.toFixed(2)}`,
              detail: 'Across all active accounts',
              icon: '◆',
              accent: 'teal',
            },
            {
              label: 'Available Funds',
              value: `$${totalBalance.toFixed(2)}`,
              detail: 'Fully liquid capital',
              icon: '↗',
              accent: 'teal',
            },
            {
              label: 'Active Accounts',
              value: totalAccounts,
              detail: 'Connected banking profiles',
              icon: '◎',
              accent: 'slate',
            },
            {
              label: 'Average Balance',
              value: `$${avgBalance.toFixed(2)}`,
              detail: 'Average per account',
              icon: '≈',
              accent: 'slate',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.09)]"
            >
              <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${
                card.accent === 'teal' ? 'bg-teal-50' : 'bg-slate-50'
              } transition-transform duration-500 group-hover:scale-125`} />

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{card.label}</div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${
                    card.accent === 'teal' ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-600'
                  }`}>
                    {card.icon}
                  </div>
                </div>

                <div className="mt-7 text-3xl font-black tracking-tight text-slate-900">{card.value}</div>
                <div className="mt-2 text-xs font-semibold text-slate-400">{card.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS + QUICK ACTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6 mb-6">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 md:p-7 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Balance Overview</div>
              <h3 className="mt-1 text-xl font-black text-slate-900">Capital distribution</h3>
              <p className="mt-1 text-xs font-medium text-slate-400">Current account allocation and liquidity trajectory</p>
            </div>
            <div className="rounded-xl bg-teal-50 px-3 py-2 text-right">
              <div className="text-[9px] font-black uppercase tracking-wider text-teal-600">Liquidity</div>
              <div className="text-sm font-black text-teal-700">100%</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
                No accounts initialized yet.
              </div>
            ) : (
              accounts.slice(0, 4).map((account) => (
                <div key={account.account_id} className="group">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white group-hover:bg-teal-600 transition-colors">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-800">{account.name}</div>
                        <div className="text-[10px] font-mono font-bold text-slate-400">#{account.account_number}</div>
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-sm font-black text-slate-900">${Number(account.balance || 0).toFixed(2)}</div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400 transition-all duration-700 group-hover:brightness-110"
                      style={{ width: `${(Number(account.balance || 0) / maxBalance) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <LiquidityTrendChart />
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)] text-white">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Quick Actions</div>
          <h3 className="mt-1 text-xl font-black">Move money faster</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">Jump directly into your most-used banking operations.</p>

          <div className="mt-6 space-y-3">
            {[
              ['＋', 'Create Account', 'Open a new banking profile'],
              ['↓', 'Deposit', 'Add funds to an account'],
              ['↑', 'Withdraw', 'Move available funds out'],
              ['⇄', 'Transfer', 'Route funds between accounts'],
            ].map(([icon, title, detail]) => (
              <button
                key={title}
                onClick={() => onNavigate(title)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-teal-400/30 hover:bg-white/[0.08]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-lg font-black text-teal-300">{icon}</div>
                  <div>
                    <div className="text-sm font-black">{title}</div>
                    <div className="mt-0.5 text-[10px] font-medium text-slate-400">{detail}</div>
                  </div>
                  <div className="ml-auto text-slate-500">→</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LIVE DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Live Weather</div>
              <h3 className="mt-1 text-lg font-black text-slate-900">Lahore</h3>
            </div>
            <div className="text-3xl">{lahoreWeather ? <WeatherIcon condition={lahoreWeather.current.condition} /> : '🌤️'}</div>
          </div>

          {lahoreWeather ? (
            <>
              <div className="mt-5 flex items-end gap-3">
                <div className="text-4xl font-black text-slate-900">{Math.round(lahoreWeather.current.temperature)}°</div>
                <div className="pb-1 text-xs font-bold text-slate-400">Celsius</div>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-500">{lahoreWeather.current.condition}</div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase text-slate-400">Feels</div>
                  <div className="mt-1 text-xs font-black text-slate-800">{Math.round(lahoreWeather.current.feels_like)}°C</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase text-slate-400">Wind</div>
                  <div className="mt-1 text-xs font-black text-slate-800">{Math.round(lahoreWeather.current.wind_speed)} km/h</div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-8 h-20 rounded-2xl bg-slate-50 animate-pulse" />
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Live Crypto</div>
              <h3 className="mt-1 text-lg font-black text-slate-900">Bitcoin</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-teal-300">₿</div>
          </div>

          {bitcoin ? (
            <>
              <div className="mt-5 text-4xl font-black text-slate-900">{formatCryptoPrice(bitcoin.price_usd)}</div>
              <div className={`mt-1 text-sm font-black ${bitcoin.price_change_24h_percent >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                {bitcoin.price_change_24h_percent >= 0 ? '↑' : '↓'} {Math.abs(bitcoin.price_change_24h_percent).toFixed(2)}% today
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase text-slate-400">24h High</div>
                  <div className="mt-1 text-xs font-black text-slate-800">{formatCryptoPrice(bitcoin.high_24h_usd)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase text-slate-400">24h Low</div>
                  <div className="mt-1 text-xs font-black text-slate-800">{formatCryptoPrice(bitcoin.low_24h_usd)}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-8 h-20 rounded-2xl bg-slate-50 animate-pulse" />
          )}
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-700 via-teal-800 to-slate-950 p-6 text-white shadow-[0_18px_45px_rgba(15,118,110,0.20)]">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-teal-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">✦</span>
              AI Banking Assistant
            </div>
            <h3 className="mt-5 text-2xl font-black leading-tight">Your banking copilot is ready.</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-teal-50/80">
              Ask about balances, transfers, accounts, policies and more using natural language.
            </p>
            <button
              onClick={() => onNavigate('Your AI Assistant')}
              className="mt-6 rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-teal-50"
            >
              Open AI Assistant →
            </button>
          </div>
        </div>
      </div>

      {/* ACCOUNTS */}
      <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 md:p-7 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Portfolio</div>
            <h3 className="mt-1 text-xl font-black text-slate-900">Your Accounts</h3>
            <p className="mt-1 text-xs font-medium text-slate-400">Live view of your connected banking profiles</p>
          </div>

          {topAccount && (
            <div className="rounded-2xl bg-teal-50 border border-teal-100 px-4 py-3">
              <div className="text-[9px] font-black uppercase tracking-wider text-teal-600">Largest account</div>
              <div className="mt-1 text-sm font-black text-teal-800">{topAccount.name} · ${Number(topAccount.balance || 0).toFixed(2)}</div>
            </div>
          )}
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-400">
            No accounts found. Create your first account to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white group-hover:bg-teal-600 transition-colors">
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900">{account.name}</div>
                      <div className="mt-0.5 text-[10px] font-mono font-bold text-slate-400">Account #{account.account_number}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-black text-slate-900 font-mono">${Number(account.balance || 0).toFixed(2)}</div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-teal-600">Active</div>
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400 transition-all duration-700"
                    style={{ width: `${(Number(account.balance || 0) / maxBalance) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// CREATE ACCOUNT
// ---------------------------------------------------------------------
function CreateAccountPage({email}) {
  const [name, setName] = useState('')
  const [startingBalance, setStartingBalance] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    try {
      const account = await api.createAccount(name.trim(), Number(startingBalance) || 0, email)
      setResult(account)
      setName('')
      setStartingBalance('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Open a new secure client banking profile</p>
      </div>

      <div className="bg-white border border-slate-200/80 p-10 rounded-[2.5rem] shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Account Holder Name</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wahaj Ahmed"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Initial Funding Balance</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              min="0"
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-teal-600/25 active:scale-[0.99]" type="submit">
            Initialize Account Profile
          </button>
        </form>

        {error && <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl font-bold">{error}</div>}
        {result && (
          <div className="mt-6 p-5 bg-teal-50 border border-teal-200 text-teal-800 text-sm font-mono rounded-2xl font-bold">
            ✓ Success! ID {result.account_id} · #{result.account_number} · Balance ${result.balance.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// DEPOSIT / WITHDRAW
// ---------------------------------------------------------------------
function AmountActionPage({ title, subtitle, actionLabel, onSubmit }) {
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    try {
      const account = await onSubmit(Number(accountId), Number(amount))
      setResult(account)
      setAmount('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">{subtitle}</p>
      </div>

      <div className="bg-white border border-slate-200/80 p-10 rounded-[2.5rem] shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Enter Account Number</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g., 1"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Enter Transaction Amount</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-teal-600/25 active:scale-[0.99]" type="submit">
            {actionLabel}
          </button>
        </form>

        {error && <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl font-bold">{error}</div>}
        {result && result.new_balance !== undefined && (
          <div className="mt-6 p-5 bg-teal-50 border border-teal-200 text-teal-800 text-sm font-mono rounded-2xl font-bold">
            ✓ Updated Ledger — {result.name}: ${result.new_balance.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// TRANSFER
// ---------------------------------------------------------------------
function TransferPage({ email }) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    try {
      // Pass email for authorization
      const res = await api.transfer(Number(fromId), Number(toId), Number(amount), email)
      setResult(res)
      setAmount('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fund Transfer</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Execute secure inter-account capital routing</p>
      </div>

      <div className="bg-white border border-slate-200/80 p-10 rounded-[2.5rem] shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Sender Account Number</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              placeholder="1"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Receiver Account Number</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              placeholder="2"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Transfer Amount</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-teal-600/25 active:scale-[0.99]" type="submit">
            Authorize Transfer
          </button>
        </form>

        {error && <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl font-bold">{error}</div>}
        {result && result.from_account && result.to_account && (
          <div className="mt-6 p-5 bg-teal-50 border border-teal-200 text-teal-800 text-sm font-mono rounded-2xl font-bold">
            ✓ Transfer Verified · {result.from_account.name}: ${result.from_account.balance.toFixed(2)} → {result.to_account.name}: ${result.to_account.balance.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// VIEW BALANCE
// ---------------------------------------------------------------------
function ViewBalancePage({ email }) {
  const [accountId, setAccountId] = useState('')
  const [account, setAccount] = useState(null)
  const [error, setError] = useState('')

  async function handleCheck(e) {
    e.preventDefault()
    setError('')
    setAccount(null)
    try {
      // Pass email for permission check
      const result = await api.getAccount(Number(accountId), email)
      setAccount(result)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Balance Inquiry</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Instant liquidity lookup for specified profile</p>
      </div>

      <div className="bg-white border border-slate-200/80 p-10 rounded-[2.5rem] shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
        <form onSubmit={handleCheck} className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Account Number</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="1"
              required
            />
          </div>
          <button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-teal-600/25 active:scale-[0.99]" type="submit">
            Query Balance
          </button>
        </form>

        {error && <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl font-bold">{error}</div>}
        {account && (
          <div className="mt-6 p-8 bg-slate-900 text-white rounded-3xl flex items-center justify-between shadow-lg shadow-slate-900/10">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{account.name}</div>
              <div className="text-[10px] font-mono text-slate-500">Account #{account.account_number}</div>
            </div>
            <div className="text-3xl font-black text-teal-400 font-mono">${account.balance.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// TRANSACTION HISTORY
// ---------------------------------------------------------------------
function TransactionHistoryPage({ email }) {
  const [accountId, setAccountId] = useState('')
  const [history, setHistory] = useState(null)
  const [error, setError] = useState('')

  async function handleFetch(e) {
    e.preventDefault()
    setError('')
    setHistory(null)
    try {
      // Pass email for permission check
      const result = await api.transactionHistory(Number(accountId), email)
      setHistory(result)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Audit History</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Immutable transaction ledger and movement logs</p>
      </div>

      <div className="bg-white border border-slate-200/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_rgba(15,23,42,0.045)] mb-8">
        <form onSubmit={handleFetch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Account Number</label>
            <input
              className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all"
              type="number"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="1"
              required
            />
          </div>
          <button className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-teal-600/25 active:scale-[0.99]" type="submit">
            Fetch Log
          </button>
        </form>
        {error && <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl font-bold">{error}</div>}
      </div>

      {history && (
        history.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-16 text-center text-slate-400 text-sm font-semibold">No transactional audit logs found for this account.</div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-[2.5rem] overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-wider bg-slate-50/50">
                  <th className="p-5">Type</th>
                  <th className="p-5">Amount</th>
                  <th className="p-5">Balance After</th>
                  <th className="p-5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {history.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${t.type === 'deposit' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-5 font-mono font-bold text-slate-900">${t.amount.toFixed(2)}</td>
                    <td className="p-5 font-mono text-slate-600">${t.balance_after.toFixed(2)}</td>
                    <td className="p-5 font-mono text-slate-400 text-xs">{t.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// ALL ACCOUNTS
// ---------------------------------------------------------------------
function AllAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listAccounts()
      .then(setAccounts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Registry</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Complete system database of active banking profiles</p>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl mb-6 font-bold">{error}</div>}
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white border border-slate-200/60 rounded-3xl animate-pulse shadow-sm" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-16 text-center text-slate-400 text-sm font-semibold">No accounts found in registry.</div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-[2.5rem] overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-wider bg-slate-50/50">
                <th className="p-5">ID</th>
                <th className="p-5">Account Number</th>
                <th className="p-5">Holder Name</th>
                <th className="p-5">Current Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium">
              {accounts.map((a) => (
                <tr key={a.account_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 font-mono text-slate-400 font-bold">#{a.account_id}</td>
                  <td className="p-5 font-mono text-slate-600">{a.account_number}</td>
                  <td className="p-5 font-extrabold text-slate-900">{a.name}</td>
                  <td className="p-5 font-mono text-teal-600 font-black text-base">${a.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// AI AGENT & RAG PAGE (With Split History & email Check)
// ---------------------------------------------------------------------
function AIAgentPage({ email }) {
  const [mode, setMode] = useState('agent') // 'agent' | 'rag'
  const [agentMessages, setAgentMessages] = useState([])
  const [ragMessages, setRagMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const messages = mode === 'agent' ? agentMessages : ragMessages
  const setMessages = mode === 'agent' ? setAgentMessages : setRagMessages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { role: 'user', text: input }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)

    try {
      if (mode === 'agent') {
        const res = await api.chatAgent(input, messages, email)
        setMessages([...newHistory, { role: 'assistant', text: res.response }])
      } else {
        const res = await api.askPolicy(input)
        setMessages([...newHistory, { role: 'assistant', text: res.answer }])
      }
    } catch (err) {
      setMessages([...newHistory, { role: 'assistant', text: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl h-[calc(100vh-5rem)] flex flex-col animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Ai Assistant</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Autonomous Database Actions & RAG Institutional Intelligence</p>
        </div>

        <div className="flex bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/50 shadow-inner">
          <button
            className={`px-5 py-2 text-xs font-black rounded-xl transition-all duration-300 ${mode === 'agent' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setMode('agent')}
          >
            Banking Agent
          </button>
          <button
            className={`px-5 py-2 text-xs font-black rounded-xl transition-all duration-300 ${mode === 'rag' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setMode('rag')}
          >
            RAG Intelligence
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[2.5rem] flex-1 flex flex-col p-6 shadow-[0_10px_30px_rgba(15,23,42,0.045)] overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center font-black text-xl mb-4 shadow-sm border border-teal-100">AI</div>
              <div className="text-slate-800 font-bold text-base mb-1">
                {mode === 'agent' ? "Gemini Function-Calling Active" : "RAG Vector Intelligence Active"}
              </div>
              <div className="text-slate-400 text-xs font-medium max-w-sm">
                {mode === 'agent' 
                  ? "Ask me to execute transfers, query balances, or modify accounts naturally." 
                  : "Ask questions regarding institutional protocols, terms, and regulatory compliance documents."}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-6 py-4 rounded-3xl text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-slate-900 text-white rounded-br-none shadow-md shadow-slate-900/10' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                  {m.role === 'assistant' ? <AIMessage text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 border border-slate-200/60 text-slate-500 px-6 py-4 rounded-3xl text-sm font-medium animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-600 rounded-full animate-ping" />
                {mode === 'agent' ? 'Executing operational function...' : 'Parsing vector embedding repository...'}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-3 pt-2">
          <input
            className="flex-1 bg-slate-50/50 border border-slate-200/80 rounded-2xl px-5 py-4 text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 transition-all shadow-inner"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'agent' ? "e.g., Transfer $100 from account 1 to account 2..." : "e.g., What are the compliance policies for funding?"}
            disabled={loading}
          />
          <button className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-teal-600/25 disabled:opacity-50 active:scale-[0.99]" type="submit" disabled={loading}>
            Transmit
          </button>
        </form>
      </div>
    </div>
  )
}



// ---------------------------------------------------------------------
// AI EMAIL AGENT
// ---------------------------------------------------------------------
function EmailAgentPage({ email }) {
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function generateDraft(e) {
    e.preventDefault()
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setStatus('')
    setDraft(null)

    try {
      const result = await api.createEmailDraft(prompt, email)
      setDraft(result)
      setStatus('Draft ready. Review it below and send only when you are satisfied.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendDraft() {
    if (!draft) return
    setSending(true)
    setError('')
    setStatus('')

    try {
      await api.sendEmail(draft.recipient, draft.subject, draft.body, email)
      setStatus('Email sent successfully through Gmail.')
      setDraft(null)
      setPrompt('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <GoogleConnectionCard provider="gmail" email={email} />
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
          ✉ AI Email Agent
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Professional Gmail Assistant</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Tell the agent who to email and what you want to say. It will prepare the email first — nothing is sent without your approval.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">1. Your instruction</div>
          <h3 className="mt-1 text-xl font-black text-slate-900">Describe the email</h3>
          <p className="mt-2 text-xs leading-relaxed font-medium text-slate-400">
            Example: “Send an email to manager@example.com about requesting leave for Friday. Keep it polite and professional.”
          </p>

          <form onSubmit={generateDraft} className="mt-6">
            <textarea
              className="w-full min-h-48 resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Send an email to..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Writing professional email…' : 'Generate Email Draft'}
            </button>
          </form>

          {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">{error}</div>}
          {status && <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs font-bold text-teal-700">{status}</div>}
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">2. Review & approve</div>
          <h3 className="mt-1 text-xl font-black text-slate-900">Email Preview</h3>

          {!draft ? (
            <div className="mt-6 flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center px-8">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-lg shadow-sm">✉</div>
                <div className="mt-4 text-sm font-black text-slate-700">No draft yet</div>
                <div className="mt-1 text-xs font-medium text-slate-400">Generate an email on the left to review it here.</div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Recipient</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-teal-500"
                value={draft.recipient}
                onChange={e => setDraft({ ...draft, recipient: e.target.value })}
              />

              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-slate-400">Subject</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-teal-500"
                value={draft.subject}
                onChange={e => setDraft({ ...draft, subject: e.target.value })}
              />

              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-slate-400">Message</label>
              <textarea
                className="mt-2 w-full min-h-56 resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-800 outline-none focus:border-teal-500"
                value={draft.body}
                onChange={e => setDraft({ ...draft, body: e.target.value })}
              />

              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                Review the recipient, subject, and message. You can edit anything before sending.
              </div>

              <button
                type="button"
                onClick={sendDraft}
                disabled={sending}
                className="mt-4 w-full rounded-2xl bg-teal-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-500 disabled:opacity-50"
              >
                {sending ? 'Sending through Gmail…' : '✓ Send Email'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// WEATHER
// ---------------------------------------------------------------------
const WEATHER_ICONS = {
  'Clear sky': '☀️',
  'Mainly clear': '🌤️',
  'Partly cloudy': '⛅',
  'Overcast': '☁️',
  'Fog': '🌫️',
  'Depositing rime fog': '🌫️',
  'Slight drizzle': '🌦️',
  'Moderate drizzle': '🌦️',
  'Dense drizzle': '🌧️',
  'Slight rain': '🌦️',
  'Moderate rain': '🌧️',
  'Heavy rain': '🌧️',
  'Slight rain showers': '🌦️',
  'Moderate rain showers': '🌧️',
  'Violent rain showers': '⛈️',
  'Thunderstorm': '⛈️',
  'Thunderstorm with slight hail': '⛈️',
  'Thunderstorm with heavy hail': '⛈️',
}

function WeatherIcon({ condition }) {
  return <span className="text-3xl" aria-hidden="true">{WEATHER_ICONS[condition] || '🌤️'}</span>
}

function formatWeatherDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function WeatherPage() {
  const [cities, setCities] = useState([])
  const [selectedCity, setSelectedCity] = useState('Lahore')
  const [selectedWeather, setSelectedWeather] = useState(null)
  const [mode, setMode] = useState('manual')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, agentLoading])

  async function loadWeather() {
    setError('')
    try {
      const data = await api.getWeatherCities()
      setCities(data.cities || [])
      const selected = (data.cities || []).find(c => c.city === selectedCity) || data.cities?.[0]
      if (selected) {
        setSelectedCity(selected.city)
        setSelectedWeather(selected)
      }
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadSelectedCity(city) {
    setSelectedCity(city)
    setDetailLoading(true)
    setError('')
    try {
      const data = await api.getWeatherCity(city)
      setSelectedWeather(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadWeather()
    const interval = setInterval(loadWeather, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleWeatherChat(e) {
    e.preventDefault()
    if (!input.trim() || agentLoading) return

    const text = input.trim()
    const userMsg = { role: 'user', text }
    const history = messages
    setMessages([...history, userMsg])
    setInput('')
    setAgentLoading(true)

    try {
      const result = await api.askWeatherAgent(text, history)
      setMessages([...history, userMsg, { role: 'assistant', text: result.response }])
    } catch (err) {
      setMessages([...history, userMsg, { role: 'assistant', text: `Error: ${err.message}` }])
    } finally {
      setAgentLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Live Weather</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Live conditions and 5-day forecasts for five supported cities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={() => setMode('manual')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${mode === 'manual' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Manual Check
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${mode === 'ai' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Ask AI Agent
            </button>
          </div>
          <button
            onClick={loadWeather}
            disabled={loading}
            className="bg-white border border-slate-200 px-4 py-3 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}

      {mode === 'manual' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-44 bg-white border border-slate-200 rounded-3xl animate-pulse" />
                ))
              : cities.map((city) => (
                <button
                  key={city.city}
                  onClick={() => loadSelectedCity(city.city)}
                  className={`text-left bg-white border p-5 rounded-3xl shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all ${
                    selectedCity === city.city
                      ? 'border-teal-400 ring-4 ring-teal-500/10'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-black text-slate-900">{city.city}</span>
                    <WeatherIcon condition={city.current.condition} />
                  </div>
                  <div className="text-4xl font-black text-slate-900">
                    {Math.round(city.current.temperature)}°C
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">{city.current.condition}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-4">
                    Feels {Math.round(city.current.feels_like)}° · Wind {Math.round(city.current.wind_speed)} km/h
                  </div>
                </button>
              ))}
          </div>

          {selectedWeather && (
            <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-7 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
                <div>
                  <div className="flex items-center gap-3">
                    <WeatherIcon condition={selectedWeather.current.condition} />
                    <h3 className="text-2xl font-black text-slate-900">{selectedWeather.city}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    {selectedWeather.timezone} · Live data from Open-Meteo
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-teal-600">{Math.round(selectedWeather.current.temperature)}°C</div>
                  <div className="text-sm font-bold text-slate-500">{selectedWeather.current.condition}</div>
                </div>
              </div>

              {detailLoading && (
                <div className="text-xs text-teal-600 font-bold mb-4">Updating selected city…</div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  ['Feels Like', `${Math.round(selectedWeather.current.feels_like)}°C`],
                  ['Humidity', `${selectedWeather.current.humidity}%`],
                  ['Wind', `${Math.round(selectedWeather.current.wind_speed)} km/h`],
                  ['Rain Now', `${selectedWeather.current.precipitation} mm`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
                    <div className="text-lg font-black text-slate-900 mt-1">{value}</div>
                  </div>
                ))}
              </div>

              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">5-Day Forecast</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {selectedWeather.forecast.map(day => (
                  <div key={day.date} className="border border-slate-200 rounded-2xl p-4">
                    <div className="text-xs font-black text-slate-700">{formatWeatherDate(day.date)}</div>
                    <div className="my-3"><WeatherIcon condition={day.condition} /></div>
                    <div className="text-sm font-bold text-slate-600">{day.condition}</div>
                    <div className="mt-2 text-sm font-black text-slate-900">
                      {Math.round(day.max_temperature)}° / {Math.round(day.min_temperature)}°
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-2">
                      Rain {day.precipitation_probability}% · {day.precipitation} mm
                    </div>
                  </div>
                ))}
              </div>

              {lastUpdated && (
                <div className="text-[10px] font-bold text-slate-400 mt-5">
                  Dashboard refreshed: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.045)] max-w-5xl">
          <div className="bg-teal-50 border border-teal-100 rounded-3xl p-5 mb-5">
            <div className="text-sm font-black text-teal-800">AI Weather Agent</div>
            <p className="text-xs text-teal-700 mt-1">
              Ask naturally about Lahore, Karachi, Islamabad, Peshawar, or Quetta.
              The agent uses live weather data before answering.
            </p>
          </div>

          <div className="h-[430px] overflow-y-auto space-y-4 pr-2 mb-5">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-4xl mb-3">🌤️</div>
                  <div className="font-black text-slate-800">What is the weather like?</div>
                  <div className="text-xs text-slate-400 mt-2">Try: “What is the forecast for Lahore?”</div>
                </div>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-5 py-4 rounded-3xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}>
                  {m.role === 'assistant' ? <AIMessage text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                </div>
              </div>
            ))}
            {agentLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 px-5 py-4 rounded-3xl text-sm animate-pulse">
                  Checking live weather…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleWeatherChat} className="flex gap-3">
            <input
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. What's the 5-day forecast for Karachi?"
              disabled={agentLoading}
            />
            <button
              type="submit"
              disabled={agentLoading}
              className="bg-teal-600 hover:bg-teal-500 text-white font-black px-7 rounded-2xl disabled:opacity-50"
            >
              Ask AI
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// CRYPTO
// ---------------------------------------------------------------------
const CRYPTO_ICONS = {
  Bitcoin: '₿',
  Ethereum: 'Ξ',
  BNB: '◆',
  Solana: '≋',
  XRP: '✕',
}

function formatCryptoPrice(value) {
  if (!Number.isFinite(value)) return '—'
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
}

function CryptoPage() {
  const [currencies, setCurrencies] = useState([])
  const [selectedAsset, setSelectedAsset] = useState('Bitcoin')
  const [selectedCrypto, setSelectedCrypto] = useState(null)
  const [mode, setMode] = useState('manual')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, agentLoading])

  async function loadCrypto() {
    setError('')
    try {
      const data = await api.getCryptoCurrencies()
      setCurrencies(data.currencies || [])
      const selected = (data.currencies || []).find(c => c.name === selectedAsset) || data.currencies?.[0]
      if (selected) {
        setSelectedAsset(selected.name)
        setSelectedCrypto(selected)
      }
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadSelectedCrypto(asset) {
    setSelectedAsset(asset)
    setDetailLoading(true)
    setError('')
    try {
      const data = await api.getCryptoAsset(asset)
      setSelectedCrypto(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadCrypto()
    const interval = setInterval(loadCrypto, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleCryptoChat(e) {
    e.preventDefault()
    if (!input.trim() || agentLoading) return

    const text = input.trim()
    const userMsg = { role: 'user', text }
    const history = messages
    setMessages([...history, userMsg])
    setInput('')
    setAgentLoading(true)

    try {
      const result = await api.askCryptoAgent(text, history)
      setMessages([...history, userMsg, { role: 'assistant', text: result.response }])
    } catch (err) {
      setMessages([...history, userMsg, { role: 'assistant', text: `Error: ${err.message}` }])
    } finally {
      setAgentLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Live Crypto</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Live market prices and 24-hour data for five supported cryptocurrencies
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={() => setMode('manual')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${mode === 'manual' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Manual Check
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${mode === 'ai' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Ask AI Agent
            </button>
          </div>
          <button
            onClick={loadCrypto}
            disabled={loading}
            className="bg-white border border-slate-200 px-4 py-3 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}

      {mode === 'manual' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-48 bg-white border border-slate-200 rounded-3xl animate-pulse" />
                ))
              : currencies.map((coin) => (
                <button
                  key={coin.name}
                  onClick={() => loadSelectedCrypto(coin.name)}
                  className={`text-left bg-white border p-5 rounded-3xl shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all ${
                    selectedAsset === coin.name
                      ? 'border-teal-400 ring-4 ring-teal-500/10'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">{CRYPTO_ICONS[coin.name] || '$'}</span>
                      <div>
                        <div className="font-black text-slate-900">{coin.name}</div>
                        <div className="text-[10px] font-black text-slate-400">{coin.symbol}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{formatCryptoPrice(coin.price_usd)}</div>
                  <div className={`text-xs font-black mt-2 ${coin.price_change_24h_percent >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                    {coin.price_change_24h_percent >= 0 ? '↑' : '↓'} {Math.abs(coin.price_change_24h_percent).toFixed(2)}% 24h
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-4">
                    H {formatCryptoPrice(coin.high_24h_usd)} · L {formatCryptoPrice(coin.low_24h_usd)}
                  </div>
                </button>
              ))}
          </div>

          {selectedCrypto && (
            <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-7 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black">{CRYPTO_ICONS[selectedCrypto.name] || '$'}</span>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">{selectedCrypto.name}</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1">{selectedCrypto.symbol}/USDT · Live data from Binance</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-teal-600">{formatCryptoPrice(selectedCrypto.price_usd)}</div>
                  <div className={`text-sm font-black ${selectedCrypto.price_change_24h_percent >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                    {selectedCrypto.price_change_24h_percent >= 0 ? '+' : ''}{selectedCrypto.price_change_24h_percent.toFixed(2)}% in 24h
                  </div>
                </div>
              </div>

              {detailLoading && (
                <div className="text-xs text-teal-600 font-bold mb-4">Updating selected asset…</div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  ['24h High', formatCryptoPrice(selectedCrypto.high_24h_usd)],
                  ['24h Low', formatCryptoPrice(selectedCrypto.low_24h_usd)],
                  ['24h Volume', selectedCrypto.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 2 })],
                  ['Quote Volume', formatCryptoPrice(selectedCrypto.quote_volume_24h_usd)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
                    <div className="text-lg font-black text-slate-900 mt-1 truncate">{value}</div>
                  </div>
                ))}
              </div>

              {lastUpdated && (
                <div className="text-[10px] font-bold text-slate-400 mt-5">
                  Dashboard refreshed: {lastUpdated.toLocaleTimeString()} · Prices update automatically every minute
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.045)] max-w-5xl">
          <div className="bg-teal-50 border border-teal-100 rounded-3xl p-5 mb-5">
            <div className="text-sm font-black text-teal-800">AI Crypto Agent</div>
            <p className="text-xs text-teal-700 mt-1">
              Ask naturally about Bitcoin, Ethereum, BNB, Solana, or XRP. The agent retrieves live market data before answering.
            </p>
          </div>

          <div className="h-[430px] overflow-y-auto space-y-4 pr-2 mb-5">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-4xl mb-3">₿</div>
                  <div className="font-black text-slate-800">Ask about the crypto market</div>
                  <div className="text-xs text-slate-400 mt-2">Try: “What is the current price of Bitcoin?”</div>
                </div>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-5 py-4 rounded-3xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}>
                  {m.role === 'assistant' ? <AIMessage text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                </div>
              </div>
            ))}
            {agentLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 px-5 py-4 rounded-3xl text-sm animate-pulse">
                  Checking live crypto market data…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleCryptoChat} className="flex gap-3">
            <input
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. Compare Bitcoin and Ethereum today"
              disabled={agentLoading}
            />
            <button
              type="submit"
              disabled={agentLoading}
              className="bg-teal-600 hover:bg-teal-500 text-white font-black px-7 rounded-2xl disabled:opacity-50"
            >
              Ask AI
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// WEB SEARCH AGENT
// ---------------------------------------------------------------------
function WebSearchAgentPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search(e) {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      setResult(await api.webSearch(query.trim(), 5))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <AgentHero icon="⌕" eyebrow="WEB SEARCH AGENT" title="Research the live web" subtitle="Search the internet with Tavily and receive a clean AI-generated summary with source links." />
      <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-6">
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search query</label>
          <form onSubmit={search} className="mt-3 space-y-3">
            <textarea value={query} onChange={e => setQuery(e.target.value)} rows={6} placeholder="e.g. What are the latest developments in AI banking?" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
            <button disabled={loading || !query.trim()} className="w-full rounded-2xl bg-slate-900 text-white py-4 text-sm font-black hover:bg-teal-700 disabled:opacity-50">{loading ? 'Searching the web…' : 'Search & Summarize'}</button>
          </form>
          {error && <AgentError text={error} />}
        </div>
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm min-h-[360px]">
          {!result ? <EmptyAgentState icon="⌕" title="Ready to research" text="Your search summary and sources will appear here." /> : (
            <>
              <div className="text-[10px] font-black uppercase tracking-widest text-teal-600">AI summary</div>
              <div className="mt-3"><AIMessage text={result.summary} /></div>
              <div className="mt-7 pt-5 border-t border-slate-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sources</div>
                <div className="mt-3 space-y-3">
                  {(result.results || []).map((source, i) => (
                    <a key={i} href={source.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-all">
                      <div className="text-sm font-black text-slate-800">{source.title || 'Source'}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">{source.content}</div>
                      <div className="text-[10px] text-teal-600 font-bold mt-2 break-all">{source.url}</div>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// IMAGE GENERATOR
// ---------------------------------------------------------------------
function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState('A premium futuristic banking headquarters at night, cinematic architecture, realistic lighting')
  const [ratio, setRatio] = useState('16:9')
  const [size, setSize] = useState('1K')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate(e) {
    e.preventDefault()
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    setImage(null)
    try {
      setImage(await api.generateImage(prompt.trim(), ratio, size))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <AgentHero icon="✦" eyebrow="IMAGE GENERATION AGENT" title="Turn ideas into visuals" subtitle="Generate professional images with Cloudflare Workers AI directly from the banking CRM." />
      <div className="grid grid-cols-1 xl:grid-cols-[0.75fr_1.25fr] gap-6">
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
          <form onSubmit={generate} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prompt</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={8} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aspect ratio</label><select value={ratio} onChange={e => setRatio(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold"><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option><option>21:9</option></select></div>
              <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quality</label><select value={size} onChange={e => setSize(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold"><option>1K</option><option>2K</option><option>4K</option></select></div>
            </div>
            <button disabled={loading || !prompt.trim()} className="w-full rounded-2xl bg-slate-900 text-white py-4 text-sm font-black hover:bg-teal-700 disabled:opacity-50">{loading ? 'Generating image…' : 'Generate Image'}</button>
          </form>
          {error && <AgentError text={error} />}
        </div>
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm min-h-[500px] flex items-center justify-center">
          {loading ? <div className="text-center"><div className="text-4xl animate-pulse">✦</div><div className="mt-3 font-black text-slate-700">Creating your image…</div><div className="text-xs text-slate-400 mt-1">This can take a little while.</div></div> : image ? <div className="w-full"><img src={image.image || (image.data_base64 ? `data:${image.mime_type || 'image/png'};base64,${image.data_base64}` : '')} alt={prompt} className="w-full rounded-2xl shadow-xl" /><div className="text-[10px] font-bold text-slate-400 mt-3">Model: {image.model} · {image.width}×{image.height}</div></div> : <EmptyAgentState icon="✦" title="No image generated yet" text="Describe the visual you want and generate it here." />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// EMAIL READER
// ---------------------------------------------------------------------
function EmailReaderPage({ email }) {
  const [question, setQuestion] = useState('What are the most recent emails about?')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function read(e) {
    e.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      setResult(await api.readEmails(question.trim(), email, 10))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <GoogleConnectionCard provider="gmail" email={email} />
      <AgentHero icon="✉" eyebrow="EMAIL READER AGENT" title="Understand your inbox" subtitle="Ask questions about your recent Gmail messages while keeping your existing email-writing and sending agent unchanged." />
      <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-6">
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ask about your emails</label>
          <form onSubmit={read} className="mt-3">
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={6} placeholder="Did I receive an email from HR?" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
            <button disabled={loading || !question.trim()} className="mt-3 w-full rounded-2xl bg-slate-900 text-white py-4 text-sm font-black hover:bg-teal-700 disabled:opacity-50">{loading ? 'Reading inbox…' : 'Read & Answer'}</button>
          </form>
          {error && <AgentError text={error} />}
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-semibold text-amber-700">This reader is read-only. It does not send, delete, or modify emails.</div>
        </div>
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-teal-600">AI answer</div>
            {!result ? <div className="mt-4 text-sm text-slate-400">Ask a question to analyze your inbox.</div> : <div className="mt-3"><AIMessage text={result.answer} /></div>}
          </div>
          {result?.emails?.length > 0 && <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent messages</div><div className="mt-4 space-y-3">{result.emails.map((mail, i) => <details key={i} className="group rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer list-none"><div className="flex justify-between gap-4"><div className="min-w-0"><div className="text-sm font-black text-slate-800 truncate">{mail.subject || '(No subject)'}</div><div className="text-xs text-slate-500 mt-1 truncate">From: {mail.from}</div></div><div className="text-[10px] text-slate-400 whitespace-nowrap">{mail.date}</div></div></summary><div className="mt-4 pt-4 border-t border-slate-100 text-xs leading-6 text-slate-600 whitespace-pre-wrap">{mail.body}</div></details>)}</div></div>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// CALENDAR AGENT
// ---------------------------------------------------------------------
function CalendarAgentPage({ email }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ summary: '', start: '', end: '', timezone: 'Asia/Karachi', description: '', location: '' })
  const [creating, setCreating] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)
  const chatEndRef = useRef(null)

  async function loadEvents() {
    setLoading(true)
    setError('')
    try {
      const data = await api.getCalendarEvents(10, email)
      setEvents(data.events || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEvents() }, [email])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, agentLoading])

  async function createEvent(e) {
    e.preventDefault()
    if (creating) return
    setCreating(true)
    setError('')
    try {
      await api.createCalendarEvent(form, email)
      setForm({ summary: '', start: '', end: '', timezone: 'Asia/Karachi', description: '', location: '' })
      await loadEvents()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function askAgent(e) {
    e?.preventDefault()
    const prompt = input.trim()
    if (!prompt || agentLoading) return

    const userMessage = { role: 'user', text: prompt }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setAgentLoading(true)
    setError('')

    try {
      const data = await api.askCalendarAgent(prompt, messages, email)
      setMessages([...nextMessages, { role: 'assistant', text: data.response || 'I could not produce a Calendar response.' }])
      await loadEvents()
    } catch (err) {
      setMessages([...nextMessages, { role: 'assistant', text: `**Calendar Agent Error**\n\n${err.message}` }])
    } finally {
      setAgentLoading(false)
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
  }

  const field = (key, label, type = 'text', placeholder = '') => <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label><input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium outline-none focus:border-teal-500" required={key === 'summary' || key === 'start' || key === 'end'} /></div>

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <GoogleConnectionCard provider="calendar" email={email} />
      <AgentHero icon="◷" eyebrow="CALENDAR AGENT" title="Plan your schedule" subtitle="Give the agent a natural-language instruction, read your upcoming events, or create an event manually. Your existing Calendar functionality remains available." />
      {error && <AgentError text={error} />}

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-teal-600">AI CALENDAR ASSISTANT</div>
              <h3 className="text-xl font-black mt-1">Tell me what you want to schedule</h3>
              <p className="text-xs text-slate-500 mt-1">Example: “Schedule a project meeting with Ahmed tomorrow at 3 PM for one hour.”</p>
            </div>
            {messages.length > 0 && <button onClick={clearChat} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50">Clear</button>}
          </div>

          <div className="p-6 h-[430px] overflow-y-auto bg-slate-50/60">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl font-black">◷</div>
                  <div className="mt-4 text-sm font-black text-slate-800">Your Calendar Agent is ready</div>
                  <div className="mt-2 text-xs leading-6 text-slate-500">Ask about upcoming meetings or give a clear instruction to create a Google Calendar event. The agent uses your connected calendar only.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={message.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 text-white px-4 py-3 text-sm whitespace-pre-wrap' : 'max-w-[90%] rounded-2xl rounded-bl-md bg-white border border-slate-200 px-4 py-3 shadow-sm'}>
                      {message.role === 'user' ? message.text : <AIMessage text={message.text} />}
                    </div>
                  </div>
                ))}
                {agentLoading && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-white border border-slate-200 px-4 py-3 text-xs font-bold text-slate-500">Calendar Agent is working…</div></div>}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <form onSubmit={askAgent} className="p-5 border-t border-slate-100 bg-white">
            <div className="flex gap-3">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAgent(e) } }} rows={2} placeholder="Ask the Calendar Agent…" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 resize-none" />
              <button disabled={agentLoading || !input.trim()} className="self-end rounded-2xl bg-slate-900 text-white px-5 py-3 text-sm font-black hover:bg-teal-700 disabled:opacity-50">{agentLoading ? 'Working…' : 'Send'}</button>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Press Enter to send · Shift+Enter for a new line</div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upcoming</div><h3 className="text-xl font-black mt-1">Next calendar events</h3></div><button onClick={loadEvents} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black hover:bg-slate-50">↻ Refresh</button></div>
            <div className="mt-5 space-y-3">{loading ? <div className="text-sm text-slate-400">Loading calendar…</div> : events.length === 0 ? <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">No upcoming events found.</div> : events.map(event => <div key={event.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between gap-4"><div className="font-black text-slate-800">{event.summary || '(Untitled event)'}</div><div className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{event.start}</div></div>{event.location && <div className="text-xs text-slate-500 mt-2">📍 {event.location}</div>}{event.description && <div className="text-xs text-slate-500 mt-2 line-clamp-2">{event.description}</div>}{event.html_link && <a href={event.html_link} target="_blank" rel="noreferrer" className="inline-block text-[10px] font-black text-teal-600 mt-3">Open in Google Calendar →</a>}</div>)}</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual creation</div>
            <h3 className="text-lg font-black mt-1">Create event directly</h3>
            <form onSubmit={createEvent} className="mt-4 space-y-4">
              {field('summary', 'Title', 'text', 'Team meeting')}
              <div className="grid grid-cols-2 gap-3">{field('start', 'Start', 'datetime-local')}{field('end', 'End', 'datetime-local')}</div>
              {field('location', 'Location', 'text', 'Office / Zoom')}
              <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-teal-500" /></div>
              <button disabled={creating} className="w-full rounded-2xl bg-slate-900 text-white py-4 text-sm font-black hover:bg-teal-700 disabled:opacity-50">{creating ? 'Creating event…' : 'Create Google Calendar Event'}</button>
            </form>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-700">Your existing manual Calendar creation remains available. The AI Agent is an additional interface on top of it.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleConnectionCard({ provider, email }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setStatus(await api.googleStatus(provider, email))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [provider, email])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true' && params.get('provider') === provider) {
      refresh()
    }
  }, [provider])

  return (
    <div className="mb-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Google connection</div>
          {loading ? <div className="mt-1 text-sm font-bold text-slate-500">Checking connection…</div> : status?.connected ? (
            <div className="mt-1 text-sm font-black text-teal-700">Connected: {status.google_email}</div>
          ) : <div className="mt-1 text-sm font-bold text-slate-700">No Google account connected</div>}
          <div className="mt-1 text-xs font-medium text-slate-400">This Google account belongs only to your Apex session: {email}</div>
          {error && <div className="mt-2 text-xs font-bold text-rose-600">{error}</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => api.googleConnect(provider, email)} className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white hover:bg-teal-700">
            {status?.connected ? 'Reconnect Google' : 'Connect Google'}
          </button>
          {status?.connected && <button onClick={async () => { await api.googleDisconnect(provider, email); await refresh() }} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50">Disconnect</button>}
        </div>
      </div>
    </div>
  )
}

function AgentHero({ icon, eyebrow, title, subtitle }) {
  return <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white p-7 md:p-9 mb-6 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" /><div className="relative z-10"><div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-teal-300"><span className="text-base">{icon}</span>{eyebrow}</div><h2 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">{title}</h2><p className="mt-2 max-w-3xl text-sm md:text-base text-slate-300 font-medium leading-relaxed">{subtitle}</p></div></div>
}

function EmptyAgentState({ icon, title, text }) {
  return <div className="h-full min-h-72 flex items-center justify-center text-center"><div><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-2xl">{icon}</div><div className="mt-4 text-sm font-black text-slate-700">{title}</div><div className="mt-1 text-xs font-medium text-slate-400">{text}</div></div></div>
}

function AgentError({ text }) {
  return <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">{text}</div>
}

// ---------------------------------------------------------------------
// APP ROOT
// ---------------------------------------------------------------------
export default function App() {
  const [email, setEmail] = useState(() => localStorage.getItem('apex_user_email'))
  const [page, setPage] = useState(() => localStorage.getItem('lastVisitedPath') || 'Dashboard')
  const [profile, setProfile] = useState(null)
  const [googleError, setGoogleError] = useState('')

useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('user_email')

    // If Google redirect handed us the email, capture and save it immediately.
    // Normalize it the same way login/signup do, so it always matches what's
    // stored in localStorage the rest of the time.
    if (emailParam) {
      localStorage.setItem('apex_user_email', emailParam.trim().toLowerCase())
      window.history.replaceState({}, document.title, '/dashboard')
    }

    const storedEmail = localStorage.getItem('apex_user_email')

    if (storedEmail) {
      setEmail(storedEmail)
      api.me(storedEmail)
        .then(setProfile)
        .catch(() => {
          localStorage.removeItem('apex_user_email')
          localStorage.removeItem('lastVisitedPath')
          sessionStorage.clear()
          setProfile(null)
          setEmail(null)
        })
    }

    // After the Google OAuth round-trip the browser does a full page reload,
    // so React state is gone - restore whichever page the user was on
    // (saved just before we navigated away to Google) instead of dumping
    // them back on the generic Dashboard.
    const restoredPage = localStorage.getItem('lastVisitedPath') || 'Dashboard'

    if (params.get('google_connected') === 'true') {
      setPage(restoredPage)
      window.history.replaceState({}, document.title, '/dashboard')
    } else if (params.get('google_error')) {
      // Show this to the user instead of only logging it - otherwise a
      // failed connection looks identical to a successful one, and the
      // very next attempt to use the feature just fails again with no
      // clue why.
      setGoogleError(params.get('google_error'))
      setPage(restoredPage)
      window.history.replaceState({}, document.title, '/dashboard')
    }
  }, [])

  // Keep the current page in sync with localStorage so a forced reload
  // (like the Google OAuth redirect) can restore it.
  useEffect(() => {
    if (email) {
      localStorage.setItem('lastVisitedPath', page)
    }
  }, [page, email])

  function handleLogin(loggedInEmail) {
    const normalizedEmail = String(loggedInEmail || '').trim().toLowerCase()
    localStorage.setItem('apex_user_email', normalizedEmail)
    localStorage.removeItem('lastVisitedPath')
    sessionStorage.clear()
    setEmail(normalizedEmail)
    setPage('Dashboard')
  }

  function handleLogout() {
    localStorage.clear()
    sessionStorage.clear()
    setProfile(null)
    setPage('Dashboard')
    setEmail(null)
    window.history.replaceState({}, document.title, '/login')
  }

  if (!email) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="flex min-h-screen bg-[#f4f8f7] text-slate-900 font-sans selection:bg-teal-500 selection:text-white">
      <Sidebar page={page} setPage={setPage} email={email} onLogout={handleLogout} />
      <div className="flex-1 p-10 overflow-y-auto max-h-screen scrollbar-thin">
        {googleError && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span><strong>Google connection failed:</strong> {googleError}</span>
            <button
              onClick={() => setGoogleError('')}
              className="shrink-0 font-bold text-red-500 hover:text-red-700"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        {page === 'Dashboard' && <Dashboard email={email} onNavigate={setPage} />}
        {page === 'Weather Updates' && <WeatherPage />}
        {page === 'Crypto Updates' && <CryptoPage />}
        {page === 'Your AI Assistant' && <AIAgentPage email={email} />}
        {page === 'Email Agent' && <EmailAgentPage email={email} />}
        {page === 'Web Search Agent' && <WebSearchAgentPage />}
        {page === 'Image Generator' && <ImageGeneratorPage />}
        {page === 'Email Reader' && <EmailReaderPage email={email} />}
        {page === 'Calendar Agent' && <CalendarAgentPage email={email} />}
        {page === 'Create Account' && <CreateAccountPage email={email}/>}
        {page === 'Deposit' && (
          <AmountActionPage
            title="Deposit Capital"
            subtitle="Securely inject funds into designated account profile"
            actionLabel="Confirm Deposit"
            onSubmit={(id, amount) => api.deposit(id, amount, email)}
          />
        )}
        {page === 'Withdraw' && (
          <AmountActionPage
            title="Withdraw Capital"
            subtitle="Process authorized liquidity withdrawal requests"
            actionLabel="Confirm Withdrawal"
            onSubmit={(id, amount) => api.withdraw(id, amount, email)}
          />
        )}
        {page === 'Transfer' && <TransferPage email={email} />}
        {page === 'View Balance' && <ViewBalancePage email={email} />}
        {page === 'Transaction History' && <TransactionHistoryPage email={email} />}
        {page === 'All Accounts' && <AllAccountsPage />}
      </div>
    </div>
  )
}