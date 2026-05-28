import { type FormEvent, useState } from 'react'
import SkillExport from '../components/SkillExport'
import SummaryCard from '../components/SummaryCard'
import { useInterview } from '../hooks/useInterview'

export default function InterviewPage() {
  const {
    messages,
    isLoading,
    isGenerating,
    generateResult,
    sessionId,
    sendMessage,
    resumeInterviewForEdit,
  } = useInterview()
  const [draftMessage, setDraftMessage] = useState('')
  const [isExportVisible, setIsExportVisible] = useState(false)

  const isReviewing = Boolean(generateResult)
  const isInputDisabled = isLoading || isGenerating || !sessionId || isReviewing

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = draftMessage.trim()
    if (!message || isInputDisabled) {
      return
    }

    setDraftMessage('')
    await sendMessage(message)
  }

  function handleEdit() {
    setIsExportVisible(false)
    resumeInterviewForEdit()
  }

  return (
    <div
      style={{
        minHeight: 'calc(100svh - 58px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        textAlign: 'left',
      }}
    >
      <header
        style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            lineHeight: 1.2,
            letterSpacing: 0,
          }}
        >
          새 스킬 만들기
        </h1>
      </header>

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 24px 120px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {!isExportVisible &&
            messages.map((message) => {
              const isUser = message.role === 'user'

              return (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: 'min(680px, 82%)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: isUser
                        ? 'var(--accent-bg)'
                        : 'var(--social-bg)',
                      color: 'var(--text-h)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              )
            })}

          {!isExportVisible && isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--social-bg)',
                  color: 'var(--text)',
                }}
              >
                답변을 기다리는 중...
              </div>
            </div>
          )}

          {!isExportVisible && isGenerating && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--accent-border)',
                  background: 'var(--accent-bg)',
                  color: 'var(--text-h)',
                }}
              >
                내용을 정리하는 중...
              </div>
            </div>
          )}

          {generateResult && !isExportVisible && (
            <SummaryCard
              summary={generateResult.summary}
              onConfirm={() => setIsExportVisible(true)}
              onEdit={handleEdit}
            />
          )}

          {generateResult && isExportVisible && (
            <SkillExport skillMd={generateResult.skill_md} />
          )}
        </div>
      </main>

      {!isReviewing && (
        <form
          onSubmit={handleSubmit}
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            gap: '10px',
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}
        >
          <input
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            disabled={isInputDisabled}
            placeholder="답변을 입력하세요"
            style={{
              flex: 1,
              minWidth: 0,
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 14px',
              font: 'inherit',
              color: 'var(--text-h)',
              background: 'var(--bg)',
            }}
          />
          <button
            type="submit"
            disabled={isInputDisabled || !draftMessage.trim()}
            style={{
              border: '1px solid var(--accent-border)',
              borderRadius: '8px',
              padding: '0 18px',
              font: 'inherit',
              fontWeight: 600,
              color: 'var(--text-h)',
              background: 'var(--accent-bg)',
              cursor:
                isInputDisabled || !draftMessage.trim()
                  ? 'not-allowed'
                  : 'pointer',
              opacity: isInputDisabled || !draftMessage.trim() ? 0.55 : 1,
            }}
          >
            전송
          </button>
        </form>
      )}
    </div>
  )
}
