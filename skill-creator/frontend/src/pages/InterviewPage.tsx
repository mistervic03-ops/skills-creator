import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import GenerationProgress from '../components/GenerationProgress'
import SkillExport from '../components/SkillExport'
import SummaryCard from '../components/SummaryCard'
import { useInterview } from '../hooks/useInterview'
import type { InterviewModelSelection } from '../api'

const supportedFileExtensions = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'docx',
  'xlsx',
]
const supportedFileAccept = supportedFileExtensions
  .map((extension) => `.${extension}`)
  .join(',')
const unsupportedFileMessage =
  '지원하지 않는 파일 형식입니다. pdf, png, jpg, jpeg, gif, webp, docx, xlsx 파일만 첨부할 수 있어요.'
const modelOptions: Array<{
  label: string
  value: InterviewModelSelection
}> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Haiku', value: 'haiku' },
  { label: 'Sonnet', value: 'sonnet' },
]

function renderInterviewerMarkdown(content: string) {
  return content
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replaceAll('\n', '<br />')
}

export default function InterviewPage() {
  const {
    messages,
    isLoading,
    isGenerating,
    generateResult,
    generationError,
    generationAttempt,
    selectedModel,
    setSelectedModel,
    sessionId,
    sendMessage,
    generateFromCurrentInterview,
    resumeInterviewForEdit,
  } = useInterview()
  const [draftMessage, setDraftMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isExportVisible, setIsExportVisible] = useState(false)
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const modelSelectorRef = useRef<HTMLDivElement | null>(null)
  const modelTriggerRef = useRef<HTMLButtonElement | null>(null)
  const modelOptionRefs = useRef<
    Partial<Record<InterviewModelSelection, HTMLButtonElement | null>>
  >({})

  const isGenerationFinalizing = isGenerating && Boolean(generateResult)
  const visibleGenerateResult = isGenerating ? null : generateResult
  const isReviewing = Boolean(visibleGenerateResult)
  const isInputDisabled = isLoading || isGenerating || !sessionId || isReviewing
  const hasUserMessages = messages.some((message) => message.role === 'user')
  const isIntroOnly = !isExportVisible && !generateResult && !hasUserMessages
  const isManualGenerateVisible = hasUserMessages && !isReviewing
  const isManualGenerateDisabled = isLoading || isGenerating || !sessionId
  const selectedModelLabel =
    modelOptions.find((option) => option.value === selectedModel)?.label ??
    'Auto'
  const isModelMenuVisible = isModelMenuOpen && !isInputDisabled

  useEffect(() => {
    if (!isModelMenuVisible) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (
        target instanceof Node &&
        !modelSelectorRef.current?.contains(target)
      ) {
        setIsModelMenuOpen(false)
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsModelMenuOpen(false)
        modelTriggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModelMenuVisible])

  useEffect(() => {
    if (isModelMenuVisible) {
      modelOptionRefs.current[selectedModel]?.focus()
    }
  }, [isModelMenuVisible, selectedModel])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = draftMessage.trim()
    if (!message || isInputDisabled) {
      return
    }

    setDraftMessage('')
    setIsModelMenuOpen(false)
    await sendMessage(message, selectedFile ?? undefined)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleEdit() {
    setIsExportVisible(false)
    resumeInterviewForEdit()
  }

  async function handleManualGenerate() {
    if (isManualGenerateDisabled) {
      return
    }

    setIsModelMenuOpen(false)
    await generateFromCurrentInterview()
  }

  function handleModelTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsModelMenuOpen(true)
    }
  }

  function handleModelOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    model: InterviewModelSelection,
  ) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    event.preventDefault()
    const currentIndex = modelOptions.findIndex(
      (option) => option.value === model,
    )
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex =
      (currentIndex + direction + modelOptions.length) % modelOptions.length
    modelOptionRefs.current[modelOptions[nextIndex].value]?.focus()
  }

  function selectModel(model: InterviewModelSelection) {
    setSelectedModel(model)
    setIsModelMenuOpen(false)
    modelTriggerRef.current?.focus()
  }

  function handleAttachClick() {
    if (!isInputDisabled) {
      fileInputRef.current?.click()
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !supportedFileExtensions.includes(extension)) {
      alert(unsupportedFileMessage)
      event.target.value = ''
      return
    }

    setSelectedFile(file)
  }

  return (
    <div className="interview-page">
      <main className="interview-main">
        <div
          className={`conversation ${
            isExportVisible ? 'content-column-wide' : 'content-column'
          } ${
            isIntroOnly ? 'conversation-intro' : ''
          }`}
        >
          {!isExportVisible &&
            messages.map((message, index) => {
              const isUser = message.role === 'user'
              const isIntroPrompt = isIntroOnly && index === 0 && !isUser

              return (
                <div
                  key={message.id}
                  className={`message-row fade-in ${
                    isUser ? 'message-row-user' : 'message-row-interviewer'
                  } ${isIntroPrompt ? 'message-row-intro-prompt' : ''}`}
                >
                  {isUser ? (
                    <div className="message-content">{message.content}</div>
                  ) : (
                    <div
                      className="message-content"
                      dangerouslySetInnerHTML={{
                        __html: renderInterviewerMarkdown(message.content),
                      }}
                    />
                  )}
                </div>
              )
            })}

          {!isExportVisible && isLoading && hasUserMessages && (
            <div className="status-row fade-in">
              <div className="typing-indicator" aria-live="polite">
                <span>생각 중</span>
                <span className="typing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}

          {!isExportVisible && (isGenerating || generationError) && (
            <GenerationProgress
              key={generationAttempt}
              isComplete={isGenerationFinalizing}
              errorMessage={generationError}
              onRetry={generateFromCurrentInterview}
            />
          )}

          {visibleGenerateResult && !isExportVisible && (
            <SummaryCard
              summary={visibleGenerateResult.summary}
              onConfirm={() => setIsExportVisible(true)}
              onEdit={handleEdit}
            />
          )}

          {visibleGenerateResult && isExportVisible && (
            <SkillExport skillMd={visibleGenerateResult.skill_md} />
          )}
        </div>
      </main>

      {!isReviewing && (
        <form
          onSubmit={handleSubmit}
          className="composer-wrap"
        >
          {isManualGenerateVisible && (
            <div className="composer-action-row content-column">
              <button
                type="button"
                onClick={handleManualGenerate}
                disabled={isManualGenerateDisabled}
                className="manual-generate-button"
              >
                지금까지 내용으로 생성
              </button>
            </div>
          )}
          <div className="composer content-column">
            <input
              ref={fileInputRef}
              type="file"
              accept={supportedFileAccept}
              onChange={handleFileChange}
              className="visually-hidden"
            />
            {selectedFile && (
              <div className="selected-file">
                첨부 파일: {selectedFile.name}
              </div>
            )}
            <div className="composer-controls">
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={isInputDisabled}
                className="composer-icon-button"
                aria-label="파일 첨부"
                title="파일 첨부"
              >
                +
              </button>
              <div
                className="model-selector"
                ref={modelSelectorRef}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsModelMenuOpen(false)
                  }
                }}
              >
                <button
                  ref={modelTriggerRef}
                  type="button"
                  className="model-selector-trigger"
                  onClick={() =>
                    setIsModelMenuOpen((currentValue) => !currentValue)
                  }
                  onKeyDown={handleModelTriggerKeyDown}
                  disabled={isInputDisabled}
                  aria-haspopup="listbox"
                  aria-expanded={isModelMenuVisible}
                  aria-label="모델 선택"
                >
                  <span>{selectedModelLabel}</span>
                  <span className="model-selector-chevron" aria-hidden="true">
                    ⌄
                  </span>
                </button>
                {isModelMenuVisible && (
                  <div className="model-menu" role="listbox">
                    {modelOptions.map((option) => {
                      const isSelected = selectedModel === option.value

                      return (
                        <button
                          key={option.value}
                          ref={(element) => {
                            modelOptionRefs.current[option.value] = element
                          }}
                          type="button"
                          className={`model-menu-option ${
                            isSelected ? 'selected' : ''
                          }`}
                          onPointerDown={(event) => {
                            event.preventDefault()
                            selectModel(option.value)
                          }}
                          onKeyDown={(event) =>
                            handleModelOptionKeyDown(event, option.value)
                          }
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span
                            className="model-menu-check"
                            aria-hidden="true"
                          >
                            {isSelected ? '✓' : ''}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                disabled={isInputDisabled}
                placeholder="업무를 편하게 설명해주세요"
                className="composer-input"
              />
              <button
                type="submit"
                disabled={isInputDisabled || !draftMessage.trim()}
                className="composer-send-button"
                aria-label="전송"
                title="전송"
              >
                ↑
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
