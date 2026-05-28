import { useCallback, useEffect, useRef, useState } from 'react'
import { chatApi, createSessionApi, generateApi } from '../api'
import type { GenerateResponse } from '../api'

export interface InterviewMessage {
  id: string
  role: 'interviewer' | 'user'
  content: string
}

const createMessage = (
  role: InterviewMessage['role'],
  content: string,
): InterviewMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
})

const errorMessage = '응답을 불러오지 못했어요. 백엔드 설정을 확인해주세요.'

export function useInterview() {
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<GenerateResponse | null>(
    null,
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const initStarted = useRef(false)

  const generateSkill = useCallback(async (currentSessionId: string) => {
    setIsGenerating(true)
    try {
      const response = await generateApi({ session_id: currentSessionId })
      setGenerateResult(response.data)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const requestChat = useCallback(
    async (currentSessionId: string, content: string) => {
      const response = await chatApi({
        session_id: currentSessionId,
        message: content,
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
    [],
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
        const shouldGenerate = await requestChat(newSessionId, '')

        setIsLoading(false)

        if (shouldGenerate) {
          await generateSkill(newSessionId)
        }
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
  }, [generateSkill, requestChat])

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim()
      if (!sessionId || !trimmedContent || isLoading || isGenerating) {
        return
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', trimmedContent),
      ])

      setIsLoading(true)
      try {
        const shouldGenerate = await requestChat(sessionId, trimmedContent)
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

  const resumeInterviewForEdit = useCallback(() => {
    setGenerateResult(null)
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
    sessionId,
    sendMessage,
    resumeInterviewForEdit,
  }
}
