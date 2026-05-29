import { useCallback, useEffect, useRef, useState } from 'react'
import { api, chatApi, createSessionApi, generateApi } from '../api'
import type {
  ChatResponse,
  GenerateResponse,
  InterviewModelSelection,
} from '../api'
import { createUuid } from '../utils/uuid'

export interface InterviewMessage {
  id: string
  role: 'interviewer' | 'user'
  content: string
}

const createMessage = (
  role: InterviewMessage['role'],
  content: string,
): InterviewMessage => ({
  id: createUuid(),
  role,
  content,
})

const errorMessage = '응답을 불러오지 못했어요. 백엔드 설정을 확인해주세요.'
const generationErrorMessage = '생성 중 문제가 생겼어요. 다시 시도해 주세요.'
const initialMessage = '어떤 업무를 자주 반복하고 계세요?'
const generationCompletionDelayMs = 650

export function useInterview() {
  const [messages, setMessages] = useState<InterviewMessage[]>([
    createMessage('interviewer', initialMessage),
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<GenerateResponse | null>(
    null,
  )
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [generationAttempt, setGenerationAttempt] = useState(0)
  const [selectedModel, setSelectedModel] =
    useState<InterviewModelSelection>('auto')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const initStarted = useRef(false)

  const generateSkill = useCallback(async (currentSessionId: string) => {
    setIsGenerating(true)
    setGenerationError(null)
    setGenerationAttempt((currentAttempt) => currentAttempt + 1)
    try {
      const response = await generateApi({ session_id: currentSessionId })
      setGenerateResult(response.data)
      await wait(generationCompletionDelayMs)
    } catch {
      setGenerationError(generationErrorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const requestChat = useCallback(
    async (currentSessionId: string, content: string, file?: File) => {
      const response = file
        ? await api.post<ChatResponse>(
            '/chat',
            buildChatFormData(currentSessionId, content, file, selectedModel),
            { headers: { 'Content-Type': 'multipart/form-data' } },
          )
        : await chatApi({
            session_id: currentSessionId,
            message: content,
            model_preference: selectedModel,
            files: [],
          })
      const responseMessage = response.data.message

      if (responseMessage) {
        setMessages((currentMessages) => [
          ...currentMessages,
          createMessage('interviewer', responseMessage),
        ])
      }

      return response.data.ready_to_generate
    },
    [selectedModel],
  )

  useEffect(() => {
    if (initStarted.current) {
      return
    }

    initStarted.current = true

    async function startInterview() {
      setIsLoading(true)
      try {
        const sessionResponse = await createSessionApi()
        const newSessionId = sessionResponse.data.session_id

        setSessionId(newSessionId)
      } catch {
        setMessages((currentMessages) => [
          ...currentMessages,
          createMessage('interviewer', errorMessage),
        ])
      } finally {
        setIsLoading(false)
      }
    }

    void startInterview()
  }, [])

  const sendMessage = useCallback(
    async (content: string, file?: File) => {
      const trimmedContent = content.trim()
      if (!sessionId || !trimmedContent || isLoading || isGenerating) {
        return
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', trimmedContent),
      ])
      setGenerationError(null)

      setIsLoading(true)
      try {
        const shouldGenerate = await requestChat(
          sessionId,
          trimmedContent,
          file,
        )
        setIsLoading(false)

        if (shouldGenerate) {
          await generateSkill(sessionId)
        }
      } catch {
        setMessages((currentMessages) => [
          ...currentMessages,
          createMessage('interviewer', errorMessage),
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [generateSkill, isGenerating, isLoading, requestChat, sessionId],
  )

  const generateFromCurrentInterview = useCallback(async () => {
    if (!sessionId || isLoading || isGenerating || generateResult) {
      return
    }

    await generateSkill(sessionId)
  }, [generateResult, generateSkill, isGenerating, isLoading, sessionId])

  const resumeInterviewForEdit = useCallback(() => {
    setGenerateResult(null)
    setGenerationError(null)
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('interviewer', '어떤 부분을 수정할까요?'),
    ])
  }, [])

  return {
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
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

function buildChatFormData(
  sessionId: string,
  message: string,
  file: File,
  modelPreference: InterviewModelSelection,
): FormData {
  const formData = new FormData()
  formData.append('session_id', sessionId)
  formData.append('message', message)
  formData.append('model_preference', modelPreference)
  formData.append('file', file)
  return formData
}
