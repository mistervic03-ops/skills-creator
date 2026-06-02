import type { SkillMetadata } from '../api'

export interface RecentSkill {
  id: string
  title: string
  workflow_type: string
  last_accessed_at: string
}

export const RECENT_SKILLS_UPDATED_EVENT = 'recent-skills-updated'

const RECENT_SKILLS_STORAGE_KEY = 'skill_creator_recent_skills'
const MAX_RECENT_SKILLS = 10

export function readRecentSkills() {
  try {
    const storedValue = window.localStorage.getItem(RECENT_SKILLS_STORAGE_KEY)
    if (!storedValue) {
      return []
    }

    const parsedValue = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .map(normalizeRecentSkill)
      .filter((skill): skill is RecentSkill => Boolean(skill))
      .sort((a, b) => b.last_accessed_at.localeCompare(a.last_accessed_at))
      .slice(0, MAX_RECENT_SKILLS)
  } catch {
    return []
  }
}

export function trackRecentSkill(metadata: SkillMetadata) {
  if (!metadata.id) {
    return []
  }

  const nextSkill = {
    id: metadata.id,
    title: metadata.title || 'Untitled Skill',
    workflow_type: metadata.workflow_type || '',
    last_accessed_at: new Date().toISOString(),
  }
  const existingSkills = readRecentSkills().filter(
    (skill) => skill.id !== metadata.id,
  )
  const nextSkills = [nextSkill, ...existingSkills].slice(0, MAX_RECENT_SKILLS)

  try {
    window.localStorage.setItem(
      RECENT_SKILLS_STORAGE_KEY,
      JSON.stringify(nextSkills),
    )
    window.dispatchEvent(new Event(RECENT_SKILLS_UPDATED_EVENT))
  } catch {
    return existingSkills
  }

  return nextSkills
}

export function removeRecentSkill(skillId: string) {
  const nextSkills = readRecentSkills().filter((skill) => skill.id !== skillId)

  try {
    window.localStorage.setItem(
      RECENT_SKILLS_STORAGE_KEY,
      JSON.stringify(nextSkills),
    )
    window.dispatchEvent(new Event(RECENT_SKILLS_UPDATED_EVENT))
  } catch {
    return readRecentSkills()
  }

  return nextSkills
}

function normalizeRecentSkill(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.last_accessed_at !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    title: candidate.title,
    workflow_type:
      typeof candidate.workflow_type === 'string'
        ? candidate.workflow_type
        : '',
    last_accessed_at: candidate.last_accessed_at,
  }
}
