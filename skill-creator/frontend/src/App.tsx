import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import InterviewPage from './pages/InterviewPage'
import LibraryPage from './pages/LibraryPage'

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
        <span style={{ fontWeight: 'bold', marginRight: '1rem' }}>
          Skill Creator
        </span>
        <Link to="/" style={{ marginRight: '1rem' }}>새 스킬 만들기</Link>
        <Link to="/library">라이브러리</Link>
      </nav>
      <Routes>
        <Route path="/" element={<InterviewPage />} />
        <Route path="/library" element={<LibraryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
