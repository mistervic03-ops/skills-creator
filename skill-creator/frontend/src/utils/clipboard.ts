export type ClipboardCopyResult = 'copied' | 'selected'

const manualCopyTextareaAttribute = 'data-manual-copy-textarea'

export async function copyTextToClipboard(
  text: string,
): Promise<ClipboardCopyResult> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      // Fall back for HTTP deployments where the async Clipboard API is blocked.
    }
  }

  return copyTextWithSelectionFallback(text)
}

function copyTextWithSelectionFallback(text: string) {
  document.querySelector(`[${manualCopyTextareaAttribute}]`)?.remove()

  const textarea = document.createElement('textarea')

  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.setAttribute(manualCopyTextareaAttribute, 'true')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.border = '0'
  textarea.style.padding = '0'
  textarea.style.opacity = '0.01'

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  const didCopy = document.execCommand('copy')

  if (didCopy) {
    textarea.remove()
    return 'copied'
  }

  window.setTimeout(() => textarea.remove(), 30000)
  return 'selected'
}
