import { useEffect, useState } from 'react'
import { getSkillApi, type SkillDetail } from '../api'
import { copyTextToClipboard } from '../utils/clipboard'
import {
  RECENT_SKILLS_UPDATED_EVENT,
  readRecentSkills,
  type RecentSkill,
  trackRecentSkill,
} from '../utils/recentSkills'

type CopyStatus = 'idle' | 'success' | 'error'

interface RecentSkillsSidebarProps {
  onCollapse: () => void
}

function formatAccessedAt(accessedAt: string) {
  const date = new Date(accessedAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function RecentSkillsSidebar({
  onCollapse,
}: RecentSkillsSidebarProps) {
  const [recentSkills, setRecentSkills] = useState<RecentSkill[]>(() =>
    readRecentSkills(),
  )
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [copyMessage, setCopyMessage] = useState('')

  useEffect(() => {
    function syncRecentSkills() {
      setRecentSkills(readRecentSkills())
    }

    window.addEventListener(RECENT_SKILLS_UPDATED_EVENT, syncRecentSkills)
    window.addEventListener('storage', syncRecentSkills)

    return () => {
      window.removeEventListener(RECENT_SKILLS_UPDATED_EVENT, syncRecentSkills)
      window.removeEventListener('storage', syncRecentSkills)
    }
  }, [])

  async function openRecentSkill(skillId: string) {
    setSelectedSkillId(skillId)
    setSelectedSkill(null)
    setIsLoading(true)
    setErrorMessage('')
    setCopyStatus('idle')
    setCopyMessage('')

    try {
      const response = await getSkillApi(skillId)
      trackRecentSkill(response.data.metadata)
      setSelectedSkill(response.data)
    } catch {
      setErrorMessage('최근 스킬을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function copySkill() {
    if (!selectedSkill) {
      return
    }

    try {
      const copyResult = await copyTextToClipboard(selectedSkill.skill_md)
      setCopyStatus('success')
      setCopyMessage(
        copyResult === 'copied'
          ? '스킬 내용을 복사했습니다.'
          : '자동 복사가 제한되어 내용을 선택했습니다. Ctrl/Cmd+C로 복사해주세요.',
      )
    } catch {
      setCopyStatus('error')
      setCopyMessage('클립보드에 복사하지 못했습니다.')
    }
  }

  return (
    <aside className="recent-skills-sidebar" aria-label="최근 스킬">
      <div className="recent-skills-header">
        <div className="recent-skills-title-row">
          <p className="recent-skills-title">Recent Skills</p>
          <button
            type="button"
            className="recent-sidebar-collapse"
            onClick={onCollapse}
            aria-label="최근 스킬 사이드바 닫기"
            title="사이드바 닫기"
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <p>최근 저장하거나 열어본 스킬</p>
      </div>

      {recentSkills.length === 0 ? (
        <p className="recent-skills-empty">
          저장하거나 라이브러리에서 열어본 스킬이 여기에 표시됩니다.
        </p>
      ) : (
        <div className="recent-skills-list">
          {recentSkills.map((skill) => {
            const isSelected = skill.id === selectedSkillId
            const accessedAt = formatAccessedAt(skill.last_accessed_at)

            return (
              <div
                key={skill.id}
                className={
                  isSelected
                    ? 'recent-skill-entry active'
                    : 'recent-skill-entry'
                }
              >
                <button
                  type="button"
                  className="recent-skill-item"
                  onClick={() => openRecentSkill(skill.id)}
                >
                  <span className="recent-skill-title">{skill.title}</span>
                  <span className="recent-skill-meta">
                    {skill.workflow_type || 'workflow'}
                    {accessedAt && ` · ${accessedAt}`}
                  </span>
                </button>

                {isSelected && (
                  <div className="recent-skill-inline-detail">
                    {isLoading && (
                      <p className="recent-skills-status">
                        스킬을 불러오는 중입니다.
                      </p>
                    )}

                    {errorMessage && (
                      <p className="recent-skills-status recent-skills-error">
                        {errorMessage}
                      </p>
                    )}

                    {!isLoading && !errorMessage && selectedSkill && (
                      <>
                        <button
                          type="button"
                          className="recent-skill-copy"
                          onClick={copySkill}
                          aria-label={`${selectedSkill.metadata.title} 복사`}
                        >
                          Copy
                        </button>
                        {copyMessage && (
                          <p
                            className={`recent-skills-status recent-skills-${copyStatus}`}
                            role={copyStatus === 'error' ? 'alert' : 'status'}
                          >
                            {copyMessage}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
