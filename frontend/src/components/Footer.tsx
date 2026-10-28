import { Shield, Github } from 'lucide-react'

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      marginTop: 'auto',
      padding: '2rem 0 1.5rem',
    }}>
      <div className="container">
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: '500' }}>Insurance Cross-Sell MLOps</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a 
              href="https://github.com/sanju-zxt/Insurance-crosssell-mlops" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)' }}
            >
              <Github size={18} />
              <span className="text-sm">GitHub</span>
            </a>
          </div>
        </div>
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <p className="text-sm text-secondary text-center">
            © 2026 Sanju. Built with FastAPI + React + Vite.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
