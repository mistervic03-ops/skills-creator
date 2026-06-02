import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export interface ChatRequest {
  session_id: string
  message: string
  model_preference: InterviewModelSelection
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
    workflow_type: string
  }
}

export interface SkillMetadata {
  id: string
  title: string
  description: string
  workflow_type: string
  tags: string[]
  author: string
  created_at: string
  updated_at: string
}

export interface SkillDetail {
  metadata: SkillMetadata
  skill_md: string
}

export interface SaveSkillRequest {
  skill_md: string
  title: string
  author?: string
}

export type InterviewModelSelection = 'auto' | 'haiku' | 'sonnet'

export const chatApi = (data: ChatRequest) =>
  api.post<ChatResponse>('/chat', data)

export const generateApi = (data: GenerateRequest) =>
  api.post<GenerateResponse>('/generate', data)

export const createSessionApi = () =>
  api.post<{ session_id: string }>('/sessions')

export const saveSkillApi = (data: SaveSkillRequest) =>
  api.post<SkillMetadata>('/skills', data)

export const listSkillsApi = (query = '') =>
  api.get<SkillMetadata[]>('/skills', {
    params: query ? { q: query } : undefined,
  })

export const getSkillApi = (skillId: string) =>
  api.get<SkillDetail>(`/skills/${skillId}`)

export const deleteSkillApi = (skillId: string) =>
  api.delete<{ deleted: true }>(`/skills/${skillId}`)
