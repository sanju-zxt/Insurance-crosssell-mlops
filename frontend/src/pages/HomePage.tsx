import { Link } from 'react-router-dom'
import { Target, Users, BarChart3, CheckCircle, ArrowRight } from 'lucide-react'

const HomePage = () => {
  const features = [
    {
      icon: Target,
      title: 'Single Prediction',
      description: 'Get instant cross-sell propensity for a single policyholder',
      link: '/predict',
    },
    {
      icon: Users,
      title: 'Batch Prediction',
      description: 'Process multiple customers at once for efficient scoring',
      link: '/batch',
    },
    {
      icon: BarChart3,
      title: 'Model Information',
      description: 'View model metrics, version, and configuration details',
      link: '/model',
    },
  ]

  return (
    <div>
      <div className="text-center mb-8">
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', lineHeight: 1.2 }}>
          Insurance Cross-Sell Propensity
        </h1>
        <p className="text-secondary" style={{ fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
          Machine learning powered prediction of which policyholders are most likely to purchase additional insurance products
        </p>
      </div>

      <div className="grid grid-3 mb-8">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link to={feature.link} key={feature.title} style={{ color: 'inherit' }}>
              <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: 'var(--accent-light)',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={24} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{feature.title}</h2>
                </div>
                <p className="text-secondary mb-4">{feature.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--accent)', fontWeight: '500' }}>
                  Get started <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>About This Project</h2>
        <p className="text-secondary mb-4">
          This is an end-to-end MLOps project for predicting insurance cross-sell opportunities. 
          The model analyzes customer demographics, policy details, and driving history to estimate 
          the probability of purchasing additional coverage.
        </p>
        <div className="grid grid-2">
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} style={{ color: 'var(--success)' }} />
              Key Features
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li className="text-secondary text-sm">• Real-time single predictions</li>
              <li className="text-secondary text-sm">• Batch processing for multiple customers</li>
              <li className="text-secondary text-sm">• Model versioning and metadata tracking</li>
              <li className="text-secondary text-sm">• FastAPI backend with MLflow integration</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} style={{ color: 'var(--success)' }} />
              Tech Stack
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li className="text-secondary text-sm">• Backend: FastAPI, scikit-learn, MLflow</li>
              <li className="text-secondary text-sm">• Frontend: React, TypeScript, Vite</li>
              <li className="text-secondary text-sm">• Deployment: Docker, Docker Compose</li>
              <li className="text-secondary text-sm">• Data: Pandas, NumPy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
