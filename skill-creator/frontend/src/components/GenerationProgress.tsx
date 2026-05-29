import { useEffect, useState } from 'react'

const generationSteps = [
  '업무 유형 파악',
  '입력 자료 정리',
  '결과물 형식 확인',
  '워크플로우 작성',
  '검증 기준 구성',
  '스킬 파일 생성',
]

interface GenerationProgressProps {
  isComplete: boolean
  errorMessage?: string | null
  onRetry: () => void
}

export default function GenerationProgress({
  isComplete,
  errorMessage,
  onRetry,
}: GenerationProgressProps) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (isComplete || errorMessage) {
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveStep((currentStep) =>
        Math.min(currentStep + 1, generationSteps.length - 2),
      )
    }, 1100)

    return () => window.clearInterval(intervalId)
  }, [errorMessage, isComplete])

  const displayedActiveStep = isComplete
    ? generationSteps.length - 1
    : activeStep

  return (
    <section className="generation-progress fade-in" aria-live="polite">
      <div className="generation-progress-header">
        <p className="generation-progress-title">업무 흐름을 정리하고 있습니다</p>
        <p className="generation-progress-subtitle">
          지금까지의 대화를 바탕으로 재사용 가능한 스킬을 만들고 있어요.
        </p>
      </div>

      {errorMessage ? (
        <div className="generation-error">
          <p>{errorMessage}</p>
          <button type="button" onClick={onRetry} className="generation-retry">
            다시 시도
          </button>
        </div>
      ) : (
        <ol className="generation-step-list">
          {generationSteps.map((step, index) => {
            const state = getStepState(index, displayedActiveStep, isComplete)

            return (
              <li key={step} className={`generation-step ${state}`}>
                <span className="generation-step-icon" aria-hidden="true" />
                <span>{step}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function getStepState(index: number, activeStep: number, isComplete: boolean) {
  if (isComplete || index < activeStep) {
    return 'completed'
  }

  if (index === activeStep) {
    return 'active'
  }

  return 'pending'
}
