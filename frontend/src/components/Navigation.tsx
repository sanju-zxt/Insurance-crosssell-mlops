import { NavLink } from 'react-router-dom'
import { Home, Target, Users, BarChart3 } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/predict', label: 'Predict', icon: Target },
  { to: '/batch', label: 'Batch Predict', icon: Users },
  { to: '/model', label: 'Model Info', icon: BarChart3 },
]

const Navigation = () => {
  return (
    <nav style={{
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding: '0.75rem 0',
    }}>
      <div className="container">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius)',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  fontWeight: isActive ? '500' : '400',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease',
                })}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default Navigation
