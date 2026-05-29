export default function LibraryPage() {
  return (
    <main className="library-page">
      <section className="library-placeholder content-column-wide">
        <div className="library-placeholder-header">
          <p className="eyebrow">Library</p>
          <h1>스킬 라이브러리</h1>
        </div>

        <div className="library-placeholder-status" aria-label="구현 상태">
          <span className="library-status-indicator" aria-hidden="true" />
          <span>
            라이브러리 탭은 현재 준비 중입니다. 지금은 Slack/Notion의 스킬
            공유 공간을 이용 부탁드려요.
          </span>
        </div>
      </section>
    </main>
  )
}
