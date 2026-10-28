import { Link } from 'react-router-dom'
import { Home, AlertCircle } from 'lucide-react'

const NotFoundPage = () => {
  return (
    <div className="text-center" style={{ padding: '4rem 0' }}>
      <AlertCircle size={64} style={{ color: 'var(--warning)', margin: '0 auto 1.5rem' }} />
      <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.75rem' }}>Page Not Found</h1>
      <p className="text-secondary mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn">
        <Home size={18} />
        Back to Home
      </Link>
    </div>
  )
}

export default NotFoundPage
