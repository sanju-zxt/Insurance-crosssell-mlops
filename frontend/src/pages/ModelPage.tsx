import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Activity, Database, Clock, Loader2, RefreshCw, Server, Info, Tag, TrendingUp, ShieldCheck, AlertCircle } from 'lucide-react'
import { modelApi, healthApi } from '../utils/api'
import { ModelInfo, Health } from '../types/api'

const ModelPage = () => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastHealthUpdate, setLastHealthUpdate] = useState<Date | null>(null)

  const fetchAllData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true)
    }
    setError(null)
    try {
      const [healthData, modelData] = await Promise.all([
        healthApi.getHealth(),
        modelApi.getInfo(),
      ])
      setHealth(healthData)
      setModelInfo(modelData)
      setLastHealthUpdate(new Date())
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch model information')
    } finally {
      if (isInitial) {
        setLoading(false)
      }
    }
  }, [])

  const refreshHealthOnly = useCallback(async () => {
    setHealthLoading(true)
    try {
      const healthData = await healthApi.getHealth()
      setHealth(healthData)
      setLastHealthUpdate(new Date())
    } catch (err: any) {
      console.error('Failed to refresh health:', err)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData(true)
  }, [fetchAllData])

  // Auto-refresh health every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshHealthOnly()
    }, 30000)
    return () => clearInterval(interval)
  }, [refreshHealthOnly])

  const getApiBaseUrl = () => {
    return '/api (proxied to backend)'
  }

  const categorizeFeatures = (features: string[]) => {
    const categories: Record<string, string[]> = {
      'Demographics': [],
      'Policy/Vehicle': [],
      'Customer Behavior': [],
      'Other': []
    }
    
    features.forEach(feature => {
      const lower = feature.toLowerCase()
      if (lower.includes('gender') || lower.includes('age') || lower.includes('region')) {
        categories['Demographics'].push(feature)
      } else if (lower.includes('vehicle') || lower.includes('driving') || lower.includes('premium') || lower.includes('policy')) {
        categories['Policy/Vehicle'].push(feature)
      } else if (lower.includes('switch') || lower.includes('accident') || lower.includes('days') || lower.includes('channel')) {
        categories['Customer Behavior'].push(feature)
      } else {
        categories['Other'].push(feature)
      }
    })
    
    return Object.entries(categories).filter(([_, feats]) => feats.length > 0)
  }

  const getMetricDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      'roc_auc': 'Area Under ROC Curve - measures overall discriminative ability',
      'f1': 'F1 Score - harmonic mean of precision and recall',
      'accuracy': 'Overall classification accuracy',
      'precision': 'Proportion of positive predictions that are correct',
      'recall': 'Proportion of actual positives correctly identified',
      'average_precision': 'Average Precision - summarizes precision-recall curve',
      'pr_auc': 'Precision-Recall AUC'
    }
    return descriptions[key.toLowerCase()] || 'Model performance metric'
  }

  const formatMetricValue = (value: number, key: string): string => {
    if (key.toLowerCase().includes('auc') || key.toLowerCase() === 'f1' || 
        key.toLowerCase() === 'accuracy' || key.toLowerCase() === 'precision' || 
        key.toLowerCase() === 'recall' || key.toLowerCase() === 'average_precision') {
      if (value >= 0 && value <= 1) {
        return value.toFixed(4)
      }
    }
    return typeof value === 'number' ? value.toFixed(4) : String(value)
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div style={{ height: '2.5rem', width: '250px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', marginBottom: '0.5rem', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: '1.25rem', width: '300px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', animation: 'pulse 2s ease-in-out infinite' }} />
        </div>
        <div className="grid grid-2 mb-6">
          {[1, 2].map(i => (
            <div key={i} className="card">
              <div style={{ height: '1.5rem', width: '150px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', marginBottom: '1rem', animation: 'pulse 2s ease-in-out infinite' }} />
              <div style={{ height: '80px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', animation: 'pulse 2s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
        <div className="card mb-6">
          <div style={{ height: '1.5rem', width: '100px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', marginBottom: '1rem', animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: '32px', width: '80px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', animation: 'pulse 2s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ height: '1.5rem', width: '80px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', marginBottom: '1rem', animation: 'pulse 2s ease-in-out infinite' }} />
          <div className="grid grid-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: '80px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', animation: 'pulse 2s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    )
  }

  if (error && !modelInfo) {
    return (
      <div>
        <div className="mb-6">
          <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={32} style={{ color: 'var(--accent)' }} />
            Model Information
          </h1>
        </div>
        <div className="card">
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--error-light)',
            border: '1px solid var(--error)',
            borderRadius: 'var(--radius)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>Error fetching model information</p>
              <p style={{ fontSize: '0.875rem' }}>{error}</p>
              <button onClick={() => fetchAllData(true)} className="btn" style={{ marginTop: '0.75rem' }}>
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={32} style={{ color: 'var(--accent)' }} />
            Model Dashboard
          </h1>
          <p className="text-secondary">Model metadata, configuration, health status, and performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={refreshHealthOnly} className="btn btn-secondary" disabled={healthLoading}>
            <RefreshCw size={16} className={healthLoading ? 'animate-spin' : ''} />
            Refresh Health
          </button>
          <button onClick={() => fetchAllData(false)} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={16} />
            Refresh All
          </button>
        </div>
      </div>

      {error && modelInfo && (
        <div className="card mb-6" style={{ backgroundColor: 'var(--warning-light)', border: '1px solid var(--warning)', color: 'var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <p style={{ fontSize: '0.875rem' }}>{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-2 mb-6">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} style={{ color: 'var(--accent)' }} />
              Health Status
            </h2>
            {healthLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />}
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: health?.model_loaded ? 'var(--success-light)' : health?.status === 'degraded' ? 'var(--warning-light)' : 'var(--error-light)',
            border: `1px solid ${health?.model_loaded ? 'var(--success)' : health?.status === 'degraded' ? 'var(--warning)' : 'var(--error)'}`,
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: health?.model_loaded ? 'var(--success)' : health?.status === 'degraded' ? 'var(--warning)' : 'var(--error)',
              marginTop: '0.25rem',
              flexShrink: 0,
              boxShadow: health?.model_loaded ? '0 0 0 4px rgba(22, 163, 74, 0.1)' : health?.status === 'degraded' ? '0 0 0 4px rgba(234, 88, 12, 0.1)' : '0 0 0 4px rgba(220, 38, 38, 0.1)'
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: health?.model_loaded ? 'var(--success)' : health?.status === 'degraded' ? 'var(--warning)' : 'var(--error)' }}>
                  {health?.model_loaded ? 'Healthy' : health?.status === 'degraded' ? 'Degraded' : 'Unhealthy'}
                </p>
                {health?.model_loaded && <ShieldCheck size={16} style={{ color: 'var(--success)' }} />}
              </div>
              <p className="text-sm" style={{ color: health?.model_loaded ? 'var(--success)' : health?.status === 'degraded' ? 'var(--warning)' : 'var(--error)' }}>
                API Status: {health?.status || 'unknown'} • Model Loaded: {health?.model_loaded ? 'Yes' : 'No'}
              </p>
              {health?.detail && (
                <p className="text-xs" style={{ color: health?.model_loaded ? 'var(--success)' : health?.status === 'degraded' ? 'var(--warning)' : 'var(--error)', marginTop: '0.375rem', opacity: 0.9 }}>
                  {health.detail}
                </p>
              )}
              {lastHealthUpdate && (
                <p className="text-xs text-secondary" style={{ marginTop: '0.5rem' }}>
                  Last updated: {lastHealthUpdate.toLocaleTimeString()}
                </p>
              )}
              <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>
                Auto-refreshes every 30 seconds
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} style={{ color: 'var(--accent)' }} />
            Model Configuration
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="flex-between">
              <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Tag size={14} />
                Project
              </span>
              <span style={{ fontWeight: '500' }}>{modelInfo?.project || 'N/A'}</span>
            </div>
            <div className="flex-between">
              <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Info size={14} />
                Model Version
              </span>
              <span style={{ fontWeight: '500', fontFamily: 'monospace', fontSize: '0.8125rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                {modelInfo?.model_version || 'N/A'}
              </span>
            </div>
            <div className="flex-between">
              <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Clock size={14} />
                Trained At
              </span>
              <span style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{modelInfo?.trained_at || 'N/A'}</span>
            </div>
            <div className="flex-between">
              <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <TrendingUp size={14} />
                Decision Threshold
              </span>
              <span style={{ fontWeight: '600', color: 'var(--accent)' }}>{modelInfo?.threshold ?? 'N/A'}</span>
            </div>
            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginTop: '0.25rem' }}>
              <div className="flex-between">
                <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Server size={14} />
                  API Base URL
                </span>
                <span style={{ fontWeight: '500', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{getApiBaseUrl()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modelInfo && (
        <>
          <div className="card mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={20} style={{ color: 'var(--accent)' }} />
                Model Features
              </h2>
              <span className="text-sm text-secondary">{modelInfo.features.length} features</span>
            </div>
            {categorizeFeatures(modelInfo.features).map(([category, features]) => (
              <div key={category} style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {category}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {features.map((feature, idx) => (
                    <span key={idx} style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      cursor: 'default'
                    }}
                    title={`Feature: ${feature}`}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-light)'
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.color = 'var(--accent)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
                Performance Metrics
              </h2>
              <span className="text-sm text-secondary">Model evaluation scores</span>
            </div>
            <div className="grid grid-3">
              {Object.entries(modelInfo.metrics).map(([key, value]) => (
                <div key={key} className="card" style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  padding: '1rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                title={getMetricDescription(key)}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '3px',
                    height: '100%',
                    backgroundColor: 'var(--accent)'
                  }} />
                  <p className="text-xs text-secondary mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                    {typeof value === 'number' ? formatMetricValue(value, key) : value}
                  </p>
                  <p className="text-xs text-secondary" style={{ lineHeight: '1.3' }}>
                    {getMetricDescription(key)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default ModelPage
