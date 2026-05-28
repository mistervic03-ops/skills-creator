import axios from 'axios'

const BASE_URL = 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export interface ChatRequest {
  session_id: string
  message: string
  files?: never[]
}

export interface ChatResponse {
  message: string
  ready_to_generate: boolean
}

export interface GenerateRequest {
  session_id: string
}

export interface GenerateResponse {
  skill_md: string
  summary: {
    trigger: string
    inputs: string
    output_format: string
    audience: string
    environment: string
  }
}

export const chatApi = (data: ChatRequest) =>
  api.post<ChatResponse>('/chat', data)

export const generateApi = (data: GenerateRequest) =>
  api.post<GenerateResponse>('/generate', data)

export const createSessionApi = () =>
  api.post<{ session_id: string }>('/sessions')
