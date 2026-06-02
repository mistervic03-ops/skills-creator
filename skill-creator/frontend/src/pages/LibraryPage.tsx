import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  deleteSkillApi,
  getSkillApi,
  listSkillsApi,
  type SkillDetail,
  type SkillMetadata,
} from '../api'
import { removeRecentSkill, trackRecentSkill } from '../utils/recentSkills'

type ActionStatus = 'idle' | 'success' | 'error'

function formatCreatedAt(createdAt: string) {
  if (!createdAt) {
    return '생성일 없음'
  }

  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return createdAt
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function nextSkillIdAfterDelete(
  previousSkills: SkillMetadata[],
  refreshedSkills: SkillMetadata[],
  deletedSkillId: string,
) {
  if (refreshedSkills.length === 0) {
    return null
  }

  const deletedIndex = previousSkills.findIndex(
    (skill) => skill.id === deletedSkillId,
  )
  if (deletedIndex === -1) {
    return refreshedSkills[0].id
  }

  return refreshedSkills[Math.min(deletedIndex, refreshedSkills.length - 1)].id
}

export default function LibraryPage() {
  const [skills, setSkills] = useState<SkillMetadata[]>([])
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null)
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [isListLoading, setIsListLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [listError, setListError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle')
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    let isCancelled = false

    async function loadSkills() {
      setIsListLoading(true)
      setListError('')

      try {
        const response = await listSkillsApi()
        if (isCancelled) {
          return
        }

        setSkills(response.data)
        setSelectedSkillId(response.data[0]?.id ?? null)
      } catch {
        if (!isCancelled) {
          setListError('스킬 목록을 불러오지 못했습니다.')
        }
      } finally {
        if (!isCancelled) {
          setIsListLoading(false)
        }
      }
    }

    loadSkills()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedSkillId) {
      return
    }

    let isCancelled = false
    const skillId = selectedSkillId

    async function loadSkill() {
      setIsDetailLoading(true)
      setDetailError('')
      setActionMessage('')
      setActionStatus('idle')

      try {
        const response = await getSkillApi(skillId)
        if (!isCancelled) {
          trackRecentSkill(response.data.metadata)
          setSelectedSkill(response.data)
        }
      } catch {
        if (!isCancelled) {
          setSelectedSkill(null)
          setDetailError('스킬 내용을 불러오지 못했습니다.')
        }
      } finally {
        if (!isCancelled) {
          setIsDetailLoading(false)
        }
      }
    }

    loadSkill()

    return () => {
      isCancelled = true
    }
  }, [selectedSkillId])

  const selectedMetadata = useMemo(
    () =>
      skills.find((skill) => skill.id === selectedSkillId) ??
      selectedSkill?.metadata ??
      null,
    [selectedSkill, selectedSkillId, skills],
  )

  async function loadSkillList(query: string, nextSelectedId?: string | null) {
    setIsListLoading(true)
    setListError('')

    try {
      const response = await listSkillsApi(query)
      const nextSkills = response.data
      const nextSkillId =
        nextSelectedId === undefined
          ? nextSkills[0]?.id ?? null
          : nextSelectedId

      setSkills(nextSkills)
      setSelectedSkillId(nextSkillId)
      if (!nextSkillId) {
        setSelectedSkill(null)
      }
      return nextSkills
    } catch {
      setListError('스킬 목록을 불러오지 못했습니다.')
      return null
    } finally {
      setIsListLoading(false)
    }
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = searchDraft.trim()
    setActiveQuery(query)
    setActionMessage('')
    setActionStatus('idle')
    await loadSkillList(query)
  }

  async function copySkill() {
    if (!selectedSkill) {
      return
    }

    try {
      await navigator.clipboard.writeText(selectedSkill.skill_md)
      setActionStatus('success')
      setActionMessage('스킬 내용을 클립보드에 복사했습니다.')
    } catch {
      setActionStatus('error')
      setActionMessage('클립보드에 복사하지 못했습니다.')
    }
  }

  async function deleteSelectedSkill() {
    if (!selectedSkillId || isDeleting) {
      return
    }

    const confirmed = window.confirm('선택한 스킬을 삭제할까요?')
    if (!confirmed) {
      return
    }

    const deletingSkillId = selectedSkillId
    const previousSkills = skills
    setIsDeleting(true)
    setActionMessage('')
    setActionStatus('idle')

    try {
      await deleteSkillApi(deletingSkillId)
      removeRecentSkill(deletingSkillId)
      const response = await listSkillsApi(activeQuery)
      const nextSkills = response.data
      const nextSkillId = nextSkillIdAfterDelete(
        previousSkills,
        nextSkills,
        deletingSkillId,
      )

      setSkills(nextSkills)
      setSelectedSkillId(nextSkillId)
      if (!nextSkillId) {
        setSelectedSkill(null)
      }
      setActionStatus('success')
      setActionMessage('스킬을 삭제했습니다.')
    } catch {
      setActionStatus('error')
      setActionMessage('스킬을 삭제하지 못했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const emptyMessage = activeQuery
    ? '검색 결과가 없습니다.'
    : '아직 저장된 스킬이 없습니다.'

  return (
    <main className="library-page">
      <section className="library-shell content-column-wide">
        <header className="library-header">
          <p className="eyebrow">Library</p>
          <h1>스킬 라이브러리</h1>
        </header>

        <form className="library-search" onSubmit={handleSearchSubmit}>
          <label htmlFor="library-search-input">스킬 검색</label>
          <div className="library-search-controls">
            <input
              id="library-search-input"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="제목, 설명, 태그, 작성자 검색"
            />
            <button type="submit" disabled={isListLoading}>
              검색
            </button>
          </div>
        </form>

        <div className="library-layout">
          <section className="library-list-panel" aria-label="저장된 스킬">
            {isListLoading && (
              <p className="library-state-message">스킬 목록을 불러오는 중입니다.</p>
            )}

            {listError && (
              <p className="library-state-message library-state-error">
                {listError}
              </p>
            )}

            {!isListLoading && !listError && skills.length === 0 && (
              <p className="library-state-message">{emptyMessage}</p>
            )}

            {!isListLoading && !listError && skills.length > 0 && (
              <div className="library-skill-list">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    className={
                      skill.id === selectedSkillId
                        ? 'library-skill-item active'
                        : 'library-skill-item'
                    }
                    onClick={() => setSelectedSkillId(skill.id)}
                  >
                    <span className="library-skill-item-title">
                      {skill.title}
                    </span>
                    {skill.description && (
                      <span className="library-skill-item-description">
                        {skill.description}
                      </span>
                    )}
                    {(skill.workflow_type || skill.tags.length > 0) && (
                      <span className="library-skill-item-tags">
                        {skill.workflow_type && (
                          <span>{skill.workflow_type}</span>
                        )}
                        {skill.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </span>
                    )}
                    <span className="library-skill-item-meta">
                      {formatCreatedAt(skill.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="library-detail-panel" aria-label="스킬 내용">
            {!selectedSkillId && !isListLoading && (
              <p className="library-state-message">스킬을 선택해주세요.</p>
            )}

            {selectedSkillId && isDetailLoading && (
              <p className="library-state-message">스킬 내용을 불러오는 중입니다.</p>
            )}

            {detailError && (
              <p className="library-state-message library-state-error">
                {detailError}
              </p>
            )}

            {!isDetailLoading && !detailError && selectedSkill && (
              <>
                <header className="library-detail-header">
                  <div>
                    <h2>{selectedSkill.metadata.title}</h2>
                    <p>{formatCreatedAt(selectedSkill.metadata.created_at)}</p>
                  </div>

                  <div className="library-detail-tags" aria-label="메타데이터">
                    {selectedMetadata?.workflow_type && (
                      <span>{selectedMetadata.workflow_type}</span>
                    )}
                    {selectedMetadata?.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </header>

                {selectedSkill.metadata.description && (
                  <p className="library-detail-description">
                    {selectedSkill.metadata.description}
                  </p>
                )}

                <div className="library-detail-actions" aria-label="스킬 작업">
                  <button type="button" onClick={copySkill}>
                    Copy Skill
                  </button>
                  <button
                    type="button"
                    className="library-danger-action"
                    onClick={deleteSelectedSkill}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '삭제 중...' : 'Delete Skill'}
                  </button>
                </div>

                {actionMessage && (
                  <p
                    className={`library-action-message library-action-${actionStatus}`}
                    role={actionStatus === 'error' ? 'alert' : 'status'}
                  >
                    {actionMessage}
                  </p>
                )}

                <pre className="library-skill-markdown">
                  <code>{selectedSkill.skill_md}</code>
                </pre>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
