import { useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
} from 'react-router-dom'
import InterviewPage from './pages/InterviewPage'
import LibraryPage from './pages/LibraryPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const [interviewKey, setInterviewKey] = useState(0)

  function handleNewConversation() {
    setInterviewKey((currentKey) => currentKey + 1)
  }

  return (
    <div className="app-shell">
      <nav className="app-nav" aria-label="주요 메뉴">
        <div className="app-nav-inner">
          <Link to="/" className="nav-brand">
            <span className="nav-brand-name">Skill Creator</span>
          </Link>
          <div className="nav-links" aria-label="섹션">
            <NavLink to="/" end className="nav-link">
              대화
            </NavLink>
            <NavLink to="/library" className="nav-link">
              라이브러리
            </NavLink>
          </div>
          <NewConversationButton onNewConversation={handleNewConversation} />
        </div>
      </nav>
      <Routes>
        <Route
          path="/"
          element={<InterviewPage key={interviewKey} />}
        />
        <Route path="/library" element={<LibraryPage />} />
      </Routes>
    </div>
  )
}

interface NewConversationLinkProps {
  onNewConversation: () => void
}

function NewConversationButton({ onNewConversation }: NewConversationLinkProps) {
  const navigate = useNavigate()

  function handleClick() {
    onNewConversation()
    navigate('/')
  }

  return (
    <button type="button" className="nav-action" onClick={handleClick}>
      새 대화
    </button>
  )
}
