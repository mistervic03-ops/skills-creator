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
    <section className="summary-panel fade-in">
      <div className="summary-panel-header">
        <p className="eyebrow">Review</p>
        <h2>생성 내용 확인</h2>
      </div>

      <dl className="summary-list">
        {rows.map(([label, key]) => {
          const value = summary[key]

          if (!value) {
            return null
          }

          return (
            <div key={key} className="summary-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          )
        })}
      </dl>

      <div className="summary-actions">
        <button
          type="button"
          onClick={onConfirm}
          className="button-primary"
        >
          맞아요, 저장할게요
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="button-secondary"
        >
          수정할게요
        </button>
      </div>
    </section>
  )
}
