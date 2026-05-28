import type { GenerateResponse } from '../api'

interface SummaryCardProps {
  summary: GenerateResponse['summary']
  onConfirm: () => void
  onEdit: () => void
}

const rows = [
  ['트리거', 'trigger'],
  ['필요한 정보', 'inputs'],
  ['출력 형식', 'output_format'],
  ['대상 독자', 'audience'],
  ['구동 환경', 'environment'],
] as const

export default function SummaryCard({
  summary,
  onConfirm,
  onEdit,
}: SummaryCardProps) {
  return (
    <section
      style={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        background: 'var(--bg)',
        boxShadow: 'var(--shadow)',
        padding: '20px',
      }}
    >
      <h2 style={{ marginBottom: '16px' }}>생성 내용 확인</h2>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(108px, 160px) 1fr',
          gap: '12px 16px',
          margin: 0,
        }}
      >
        {rows.map(([label, key]) => {
          const value = summary[key]

          if (!value) {
            return null
          }

          return (
            <div
              key={key}
              style={{
                display: 'contents',
              }}
            >
              <dt
                style={{
                  color: 'var(--text)',
                  fontWeight: 600,
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  color: 'var(--text-h)',
                  lineHeight: 1.5,
                  wordBreak: 'keep-all',
                  overflowWrap: 'anywhere',
                }}
              >
                {value}
              </dd>
            </div>
          )
        })}
      </dl>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '20px',
        }}
      >
        <button
          type="button"
          onClick={onConfirm}
          style={{
            border: '1px solid var(--accent-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            font: 'inherit',
            fontWeight: 600,
            color: 'var(--text-h)',
            background: 'var(--accent-bg)',
            cursor: 'pointer',
          }}
        >
          맞아요, 저장할게요
        </button>
        <button
          type="button"
          onClick={onEdit}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 14px',
            font: 'inherit',
            fontWeight: 600,
            color: 'var(--text-h)',
            background: 'var(--bg)',
            cursor: 'pointer',
          }}
        >
          수정할게요
        </button>
      </div>
    </section>
  )
}
