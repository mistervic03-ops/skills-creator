import {
  type FormEvent,
  Fragment,
  type ReactNode,
  useMemo,
  useState,
} from 'react'
import { saveSkillApi } from '../api'
import { copyTextToClipboard } from '../utils/clipboard'
import { trackRecentSkill } from '../utils/recentSkills'

interface SkillExportProps {
  skillMd: string
}

type ExportMode = 'preview' | 'markdown'
type CopyStatus = 'idle' | 'copied' | 'selected'
type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface MetadataItem {
  label: string
  value: string
}

type MarkdownBlock =
  | {
      type: 'heading'
      depth: number
      text: string
    }
  | {
      type: 'paragraph'
      lines: string[]
    }
  | {
      type: 'list'
      ordered: boolean
      start?: number
      items: string[]
    }
  | {
      type: 'code'
      language: string
      code: string
    }

function timestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join('')
}

function splitFrontmatter(markdown: string) {
  const normalizedMarkdown = markdown.replace(/\r\n/g, '\n')
  const frontmatterMatch = normalizedMarkdown.match(/^---\n([\s\S]*?)\n---\n?/)

  if (!frontmatterMatch) {
    return {
      metadata: [] as MetadataItem[],
      body: normalizedMarkdown,
    }
  }

  const metadata = frontmatterMatch[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separatorIndex = line.indexOf(':')

      if (separatorIndex === -1) {
        return {
          label: line,
          value: '',
        }
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, ''),
      }
    })
    .filter((item) => item.label)

  return {
    metadata,
    body: normalizedMarkdown.slice(frontmatterMatch[0].length),
  }
}

function findMetadataValue(metadata: MetadataItem[], keys: string[]) {
  const normalizedKeys = keys.map((key) => key.toLowerCase())

  return (
    metadata.find((item) =>
      normalizedKeys.includes(item.label.toLowerCase()),
    )?.value.trim() ?? ''
  )
}

function parseDefaultSkillTitle(markdown: string) {
  const { metadata, body } = splitFrontmatter(markdown)
  const metadataTitle = findMetadataValue(metadata, ['title', 'name'])

  if (metadataTitle) {
    return metadataTitle
  }

  return body.match(/^#\s+(.+?)\s*$/m)?.[1].trim() ?? ''
}

function parseDefaultAuthor(markdown: string) {
  return findMetadataValue(splitFrontmatter(markdown).metadata, ['author'])
}

function isHeading(line: string) {
  return /^(#{1,4})\s+/.test(line)
}

function isListItem(line: string) {
  return /^\s*(?:[-*]|\d+[.)])\s+/.test(line)
}

function isBlockStart(line: string) {
  return line.trim().startsWith('```') || isHeading(line) || isListItem(line)
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      index += 1
      continue
    }

    if (trimmedLine.startsWith('```')) {
      const language = trimmedLine.slice(3).trim()
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }

      if (index < lines.length) {
        index += 1
      }

      blocks.push({
        type: 'code',
        language,
        code: codeLines.join('\n'),
      })
      continue
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        depth: headingMatch[1].length,
        text: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/)
    const orderedMatch = line.match(/^\s*(\d+)[.)]\s+(.+)$/)
    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch)
      const start = orderedMatch ? Number(orderedMatch[1]) : undefined
      const items: string[] = []

      while (index < lines.length) {
        const itemMatch = ordered
          ? lines[index].match(/^\s*\d+[.)]\s+(.+)$/)
          : lines[index].match(/^\s*[-*]\s+(.+)$/)

        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: 'list',
        ordered,
        start,
        items,
      })
      continue
    }

    const paragraphLines: string[] = []

    while (index < lines.length) {
      const paragraphLine = lines[index]

      if (!paragraphLine.trim() || isBlockStart(paragraphLine)) {
        break
      }

      paragraphLines.push(paragraphLine.trim())
      index += 1
    }

    blocks.push({
      type: 'paragraph',
      lines: paragraphLines,
    })
  }

  return blocks
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = []
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let tokenIndex = 0

  for (const match of text.matchAll(tokenPattern)) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    const key = `${keyPrefix}-${tokenIndex}`

    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    }

    lastIndex = match.index + token.length
    tokenIndex += 1
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function renderInlineLines(lines: string[], keyPrefix: string) {
  return lines.map((line, index) => (
    <Fragment key={`${keyPrefix}-${index}`}>
      {index > 0 && <br />}
      {renderInlineMarkdown(line, `${keyPrefix}-${index}`)}
    </Fragment>
  ))
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const { metadata, body } = useMemo(
    () => splitFrontmatter(markdown),
    [markdown],
  )
  const blocks = useMemo(() => parseMarkdownBlocks(body), [body])
  const isEmpty = !markdown.trim()

  if (isEmpty) {
    return (
      <div className="export-document export-document-empty">
        생성된 스킬 내용이 아직 없습니다.
      </div>
    )
  }

  return (
    <article className="export-document">
      <div className="export-document-body">
        {blocks.map((block, index) => {
          const key = `${block.type}-${index}`

          if (block.type === 'heading') {
            const HeadingTag = `h${Math.min(block.depth + 1, 4)}` as
              | 'h2'
              | 'h3'
              | 'h4'

            return (
              <HeadingTag key={key} className={`export-doc-heading depth-${block.depth}`}>
                {renderInlineMarkdown(block.text, key)}
              </HeadingTag>
            )
          }

          if (block.type === 'list') {
            const ListTag = block.ordered ? 'ol' : 'ul'

            return (
              <ListTag
                key={key}
                className="export-doc-list"
                start={block.ordered ? block.start : undefined}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInlineMarkdown(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ListTag>
            )
          }

          if (block.type === 'code') {
            return (
              <pre key={key} className="export-doc-code">
                {block.language && (
                  <span className="export-doc-code-label">{block.language}</span>
                )}
                <code>{block.code}</code>
              </pre>
            )
          }

          return (
            <p key={key} className="export-doc-paragraph">
              {renderInlineLines(block.lines, key)}
            </p>
          )
        })}
      </div>

      {metadata.length > 0 && (
        <section className="export-metadata" aria-label="세부 정보">
          <p className="export-metadata-title">세부 정보</p>
          <dl className="export-metadata-list">
            {metadata.map((item) => (
              <div key={`${item.label}-${item.value}`} className="export-metadata-row">
                <dt>{item.label}</dt>
                <dd>{item.value || '미입력'}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  )
}

export default function SkillExport({ skillMd }: SkillExportProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [mode, setMode] = useState<ExportMode>('preview')
  const [currentMarkdown, setCurrentMarkdown] = useState(() => skillMd)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveAuthor, setSaveAuthor] = useState('')
  const isSaving = saveStatus === 'saving'
  const canSubmitSave = saveTitle.trim().length > 0 && !isSaving

  function downloadSkill() {
    const blob = new Blob([currentMarkdown], {
      type: 'text/markdown;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `skill-${timestamp()}.md`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function copySkill() {
    const copyResult = await copyTextToClipboard(currentMarkdown)
    setCopyStatus(copyResult === 'copied' ? 'copied' : 'selected')
    window.setTimeout(() => setCopyStatus('idle'), 2000)
  }

  function openSavePanel() {
    if (isSaving) {
      return
    }

    setSaveTitle(parseDefaultSkillTitle(currentMarkdown))
    setSaveAuthor(parseDefaultAuthor(currentMarkdown))
    setSaveStatus('idle')
    setSaveMessage('')
    setIsSavePanelOpen(true)
  }

  function cancelSave() {
    if (!isSaving) {
      setIsSavePanelOpen(false)
      setSaveStatus('idle')
      setSaveMessage('')
    }
  }

  async function saveToLibrary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = saveTitle.trim()
    const trimmedAuthor = saveAuthor.trim()
    if (!trimmedTitle || isSaving) {
      return
    }

    setSaveStatus('saving')
    setSaveMessage('')

    try {
      const response = await saveSkillApi({
        skill_md: currentMarkdown,
        title: trimmedTitle,
        author: trimmedAuthor || undefined,
      })
      trackRecentSkill(response.data)
      setSaveStatus('success')
      setSaveMessage(`라이브러리에 저장됨: ${response.data.title}`)
      setIsSavePanelOpen(false)
    } catch {
      setSaveStatus('error')
      setSaveMessage('저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <section className="export-panel fade-in">
      <div className="export-header">
        <div>
          <h2>SKILL.md 내보내기</h2>
        </div>
      </div>

      <div className="export-toolbar">
        <div className="export-mode-switch" aria-label="내보내기 보기 방식">
          <button
            type="button"
            className={mode === 'preview' ? 'active' : ''}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
          <button
            type="button"
            className={mode === 'markdown' ? 'active' : ''}
            onClick={() => setMode('markdown')}
          >
            Markdown
          </button>
        </div>

        <div className="export-actions" aria-label="문서 작업">
          <button
            type="button"
            onClick={openSavePanel}
            className="export-action-button export-action-button-primary"
            disabled={isSaving}
          >
            Save to Library
          </button>
          <button
            type="button"
            onClick={downloadSkill}
            className="export-action-button"
          >
            .md 다운로드
          </button>
          <button
            type="button"
            onClick={copySkill}
            className="export-action-button"
          >
            {copyStatus === 'copied'
              ? '복사됨!'
              : copyStatus === 'selected'
                ? '선택됨'
                : '클립보드 복사'}
          </button>
        </div>
      </div>

      {isSavePanelOpen && (
        <form className="export-save-panel" onSubmit={saveToLibrary}>
          <div className="export-save-fields">
            <label>
              <span>Skill Name</span>
              <input
                type="text"
                value={saveTitle}
                onChange={(event) => setSaveTitle(event.target.value)}
                disabled={isSaving}
                required
              />
            </label>
            <label>
              <span>Author</span>
              <input
                type="text"
                value={saveAuthor}
                onChange={(event) => setSaveAuthor(event.target.value)}
                disabled={isSaving}
              />
            </label>
          </div>
          <div className="export-save-actions">
            <button
              type="button"
              className="export-action-button"
              onClick={cancelSave}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="export-action-button export-action-button-primary"
              disabled={!canSubmitSave}
            >
              {isSaving ? '저장 중...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {saveMessage && (
        <p
          className={`export-save-status export-save-status-${saveStatus}`}
          role={saveStatus === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {saveMessage}
        </p>
      )}

      {mode === 'preview' ? (
        <MarkdownPreview markdown={currentMarkdown} />
      ) : (
        <div className="export-markdown-mode">
          <p className="export-mode-helper">
            고급 수정 모드입니다. 수정한 내용이 복사와 다운로드에 반영됩니다.
          </p>
          <textarea
            value={currentMarkdown}
            onChange={(event) => setCurrentMarkdown(event.target.value)}
            className="export-markdown-editor"
            aria-label="SKILL.md 마크다운 수정"
            spellCheck={false}
          />
        </div>
      )}
    </section>
  )
}
