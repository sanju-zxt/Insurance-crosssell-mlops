import { Link } from 'react-router-dom'
import { Moon, Sun, Shield } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const Header = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <header style={{
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding: '1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(8px)',
    }}>
      <div className="container flex-between">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
          <Shield size={28} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '600', lineHeight: 1.2 }}>XSell</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Cross-Sell Propensity</p>
          </div>
        </Link>
        
        <button
          onClick={toggleTheme}
          className="btn-secondary"
          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  )
}

export default Header
