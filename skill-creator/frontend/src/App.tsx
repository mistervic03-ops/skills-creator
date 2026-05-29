import { useState, type MouseEvent } from 'react'
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
            Skill Creator
          </Link>
          <div className="nav-links">
            <NewConversationLink onNewConversation={handleNewConversation} />
            <NavLink to="/library" className="nav-link">
              라이브러리
            </NavLink>
          </div>
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

function NewConversationLink({ onNewConversation }: NewConversationLinkProps) {
  const navigate = useNavigate()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    onNewConversation()
    navigate('/')
  }

  return (
    <NavLink to="/" className="nav-link" onClick={handleClick}>
      새 대화
    </NavLink>
  )
}
