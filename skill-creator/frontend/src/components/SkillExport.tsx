import { useState } from 'react'

interface SkillExportProps {
  skillMd: string
}

function timestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join('')
}

export default function SkillExport({ skillMd }: SkillExportProps) {
  const [copied, setCopied] = useState(false)

  function downloadSkill() {
    const blob = new Blob([skillMd], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `skill-${timestamp()}.md`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function copySkill() {
    await navigator.clipboard.writeText(skillMd)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0 }}>SKILL.md 내보내기</h2>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={downloadSkill}
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
            .md 다운로드
          </button>
          <button
            type="button"
            onClick={copySkill}
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
            {copied ? '복사됨!' : '클립보드 복사'}
          </button>
        </div>
      </div>

      <pre
        style={{
          maxHeight: 'min(620px, 64svh)',
          overflow: 'auto',
          margin: 0,
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--code-bg)',
          color: 'var(--text-h)',
          fontFamily: 'var(--mono)',
          fontSize: '14px',
          lineHeight: 1.55,
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {skillMd}
      </pre>
    </section>
  )
}
