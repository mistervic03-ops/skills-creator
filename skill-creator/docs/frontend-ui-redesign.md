# Frontend UI Redesign Notes

> 기준일: 2026-05-28
> 범위: `frontend/src/`의 스타일과 레이아웃 개선 방향 정리
> 원칙: 기능 로직, API 호출, 상태 전이, 파일 처리 흐름은 변경하지 않는다.

## 목표
Skill Creator의 인터뷰 화면을 ChatGPT/Claude.ai에 가까운 전문적인 AI 채팅 인터페이스로 정리한다.
화려한 장식보다 읽기 편한 대화 흐름, 안정적인 입력 경험, 사내 도구처럼 보이는 절제된 화면 밀도를 우선한다.
HTML로 급하게 만든 토이 프로젝트처럼 보이지 않게 하되, 과장된 AI SaaS 랜딩 페이지처럼 보이는 장식도 피한다.
최종 인상은 “설정 화면”이 아니라, 사용자가 바로 업무를 설명할 수 있는 조용한 대화 공간이어야 한다.

## 현재 반영된 방향
- 빈 상태에서는 설명형 label/title을 제거하고, 첫 질문과 composer만 남겨 대화 시작에 집중한다.
- 전체 화면은 warm gray 배경 위에 아주 약한 conversation surface를 얹어, 순백의 데모 페이지처럼 보이지 않게 한다.
- assistant 메시지는 말풍선 없이 본문처럼 흐르고, user 메시지만 오른쪽의 조용한 warm bubble로 구분한다.
- composer는 content column과 같은 폭을 쓰며, 입력 가능한 표면으로 읽힐 정도의 낮은 elevation만 준다.
- 수동 생성은 composer가 아니라 대화 상태에 붙은 inline action으로 둔다. 최신 assistant 메시지 아래에 `지금 생성`으로 짧게 표시한다.
- Summary는 작업 확인 panel로 다루고, Export는 raw file dump가 아니라 읽기 좋은 workflow document preview를 기본 경험으로 둔다.

## 참고 이미지에서 가져갈 것
- 화면의 주인공은 메시지 텍스트다. 배경, nav, composer는 조용하게 뒤로 물러난다.
- 본문은 넓은 화면에서도 가운데에 얇게 잡힌 reading column을 유지한다.
- 메시지는 기본적으로 박스가 아니라 문서처럼 흐른다. 다만 user reply는 대화 방향을 구분하기 위해 낮은 대비의 bubble을 허용한다.
- 상단 chrome은 낮고 가볍다. 브랜드와 현재 화면 맥락만 보여주고, 장식적 헤더는 만들지 않는다.
- 입력창은 화면 하단에서 독립된 작업 표면처럼 보여야 한다. 크고 안정적인 radius, 낮은 그림자, 내부 icon actions를 사용한다.
- 좌측 사이드바가 필요한 제품처럼 보이더라도 이번 범위에서는 새 정보구조를 만들지 않는다. 현재 nav 구조를 더 정돈된 앱 chrome으로 개선하는 데 그친다.
- 빈 상태에서는 “Interview”, “새 스킬 만들기” 같은 설명형 label/title을 노출하지 않는다. 작은 대화형 첫 질문과 composer가 화면의 중심이 된다.

## 피해야 할 것
- gradient, glow, blob, glassmorphism, 과한 그림자, 큰 hero headline.
- 카드 안의 카드, 섹션을 전부 카드로 감싸는 구성.
- 말풍선 채팅 UI. 특히 user/interviewer 모두 둥근 박스가 반복되는 형태.
- 색이 많은 버튼 세트, 뱃지 남발, 마케팅 SaaS 느낌의 과장된 CTA.
- 브라우저 기본 버튼/입력창 느낌이 그대로 남는 상태.
- 좁은 중앙 컨테이너에 테두리를 둘러 “데모 페이지”처럼 보이는 root frame.
- 온보딩 wizard처럼 보이는 label, section heading, form hierarchy.

## 현재 구조 요약
| 파일 | 현재 역할 | 리디자인 관점 |
|---|---|---|
| `frontend/src/App.tsx` | 라우터와 상단 nav 렌더링 | nav를 얇고 정돈된 앱 바 형태로 개선한다. |
| `frontend/src/pages/InterviewPage.tsx` | 인터뷰 메시지, 로딩/생성 상태, 첨부, 입력창, 카드/export 전환 | 핵심 변경 대상. 채팅 흐름, 하단 입력창, 상태 메시지 레이아웃을 재구성한다. |
| `frontend/src/components/SummaryCard.tsx` | 생성 전 요약 확인 카드 | 과한 카드 느낌을 줄이고 검토 패널처럼 정돈한다. |
| `frontend/src/components/SkillExport.tsx` | SKILL.md 다운로드/복사/미리보기 | export 화면을 문서 preview + actions 구조로 개선한다. |
| `frontend/src/index.css` | 색상 토큰, 기본 typography, root layout | reset, Pretendard/Inter import, 디자인 토큰, 공통 class를 둔다. |
| `frontend/src/pages/LibraryPage.tsx` | Phase 4 placeholder | 요청 범위 밖. 전역 스타일 영향만 받는다. |
| `frontend/src/hooks/useInterview.ts` | 인터뷰 상태와 API 흐름 | 기능 로직은 변경하지 않는다. 초기 인사 copy만 제품 톤에 맞춘다. |
| `frontend/src/api.ts` | HTTP client와 타입 | 변경 금지. |

## 디자인 방향
### Theme
- 기본 배경은 아주 약한 warm neutral `#F7F7F5`를 사용한다.
- 주요 surface는 `#FCFCFA`와 `#FFFFFF`, border는 `#E8E7E3`와 `#DAD8D2`를 사용한다.
- Primary text는 `#242424`, secondary text는 `#66645F`, muted text는 읽기 가능한 neutral gray `#72706A`를 사용한다.
- 포인트 컬러는 별도로 두지 않고, primary action과 send/focus/selected 상태는 neutral gray 계열로 처리한다.
- user bubble과 composer는 대화의 interactive surface로 읽힐 만큼만 대비를 준다.
- Composer shadow는 `0 1px 2px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.05)` 수준을 넘지 않는다.
- nav pill, segmented control, secondary button 같은 작은 컨트롤은 얕은 border와 shadow로 한 층 떠 있는 느낌을 주되, 색으로 과하게 강조하지 않는다.

### Typography
- `index.css`에서 Pretendard Variable을 기본 한국어/UI 폰트로 import한다.
- font stack은 `"Pretendard Variable", "Pretendard", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`로 둔다.
- 본문 기본 크기는 16px, line-height는 1.75-1.85, letter-spacing은 약 `-0.01em`으로 둔다.
- 큰 title은 기본 인터뷰 빈 상태에서는 사용하지 않는다. Summary/Export 같은 작업 패널의 heading은 20px 안팎으로 낮게 유지한다.
- 첫 질문은 hero title처럼 키우지 않고, 19px 안팎의 약한 강조로 시선을 잡는다.

### Layout
- 앱 전체는 full-width에 가깝게 두고, 전역 root frame/border는 제거한다.
- 대화 본문은 넓은 화면에서 `max-width: 680px` 전후의 reading column으로 제한한다.
- 상단 nav는 60-64px 안팎의 낮은 sticky 앱 바로 정리한다.
- Interview 화면은 `nav + scrollable conversation + sticky composer` 구조로 둔다.
- 첫 화면 상단에는 거대한 제목 영역을 만들지 않는다. 필요하면 작은 page context만 둔다.
- 대화 시작 화면에서는 page context도 생략하고, 첫 질문과 composer를 가깝게 배치한다.
- nav copy도 workflow label보다 대화 중심의 짧은 표현을 우선한다.
- 첫 질문은 hero title처럼 보이지 않되, 사용자가 시선을 둘 수 있을 만큼만 font-size/weight를 높인다.
- 컴포넌트 경계는 선보다 여백으로 구분한다.

### Messages
- interviewer 메시지는 왼쪽 정렬의 자연스러운 본문 흐름으로 둔다.
- user 메시지는 오른쪽 정렬의 조용한 warm bubble로 구분한다.
- user bubble은 `#F1F0EC`, 20-22px radius, 약한 border를 사용하고 content column 끝에 과하게 붙이지 않는다.
- message row의 수직 간격은 16-24px scale 안에서 대화 리듬이 느껴지게 둔다.
- 각 메시지에 role label은 기본적으로 생략한다. 필요하면 screen reader용 label 또는 아주 작은 muted label만 고려한다.
- 메시지 등장에는 `fade-in` 정도의 subtle animation만 적용한다.

### Conversation Actions
- 생성은 메시지 입력 기능이 아니라 인터뷰 workflow action이다. composer, attachment control, model selector, send button과 같은 위계에 두지 않는다.
- 수동 생성 action은 최신 interviewer 메시지 아래에 배치해 “이 대화를 바탕으로 지금 할 수 있는 일”로 읽히게 한다.
- label은 설명형 문장보다 짧은 action copy를 사용한다. 기본 copy는 `지금 생성`이다.
- 시각 위계는 GitHub/Notion/Claude식 inline action에 가깝게 둔다. 작은 크기, neutral 색, subtle hover만 사용하고 primary CTA처럼 보이게 하지 않는다.
- 기본 상태와 hover 상태는 같은 box model을 공유해야 한다. padding, border width, height, line-height, left edge가 변하지 않아야 하며 hover pill의 배경/테두리는 layout shift를 만들면 안 된다.
- action text의 기본 left edge는 assistant message text와 정렬한다. hover surface가 생기더라도 텍스트가 옆으로 밀려 보이지 않아야 한다.

### Composer
- 입력창은 하단 sticky 영역에 둔다.
- composer 내부는 하나의 둥근 컨테이너로 만들고 `border-radius: 24px`를 적용한다.
- shadow는 부드럽게: `0 1px 2px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.05)` 수준. 그림자가 UI의 주인공이 되면 낮춘다.
- Send 버튼은 입력창 내부 오른쪽의 아이콘 버튼으로 배치한다.
- 첨부 버튼도 composer 내부 왼쪽 또는 입력창 왼쪽에 아이콘 버튼으로 배치한다.
- 선택된 파일명은 composer 위의 작은 pill/metadata row로 노출한다.
- placeholder, disabled, focus 상태가 모두 제품 수준으로 보여야 한다.
- composer 주변에는 아주 작은 muted 예시 문구를 둘 수 있지만, 설명문처럼 보이면 안 된다.
- composer helper 문구는 composer 외곽이 아니라 실제 입력 텍스트 시작점과 정렬한다.
- placeholder는 `업무를 편하게 설명해주세요`처럼 짧고 자연스러운 대화 초대 문장으로 둔다.

### Panels
- Summary와 Export는 채팅 메시지와 달리 낮은 대비의 작업 패널로 보여도 된다.
- Summary는 modal보다 inline review panel을 우선한다. 사용자 흐름을 끊지 않기 위해 대화 column 안에 자연스럽게 놓는다.
- Export preview는 코드 블록이 아니라 렌더링된 문서 미리보기로 보여준다. Markdown 원문은 segmented control의 고급 수정 모드에서만 노출한다.
- Export는 하나의 `currentMarkdown` 값을 기준으로 preview, markdown editor, copy, download가 모두 동작해야 한다.
- frontmatter는 문서 상단의 작고 조용한 metadata 영역으로 렌더링해서, 비개발자에게 파일 문법처럼 보이지 않게 한다.
- 패널 radius는 16px 이하로 유지한다. composer만 24px radius를 사용한다.

## 파일별 구현 기준
### 1. `index.css`
성공 기준:
- Pretendard Variable과 Inter import가 추가된다.
- `box-sizing`, `body`, `button`, `input`, `textarea` reset이 정리된다.
- 색상/간격/그림자 토큰이 밝은 테마 기준으로 재정의된다.
- 메시지 fade-in keyframes와 공통 class를 둔다.
- full-width app shell과 centered reading column을 지원하는 class를 둔다.

주의:
- 다크 모드는 이번 요청에서 필수가 아니므로 제거하거나 비활성화해도 된다.
- 전역 `#root`의 border와 center fixed width는 채팅 앱 느낌을 해치므로 재검토한다.
- 전역 heading 스타일이 과하게 커지지 않게 한다.

### 2. `App.tsx`
성공 기준:
- nav는 `app-shell`, `app-nav`, `nav-brand`, `nav-link` 같은 CSS class 기반으로 변경한다.
- 현재 라우팅과 링크 대상 `/`, `/library`는 그대로 유지한다.
- `새 대화`는 이미 `/`에 있는 상태에서도 인터뷰 상태를 초기화해 새 세션을 시작해야 한다.
- nav는 얇고 프로페셔널한 앱 바로 보인다.
- nav link는 14px 안팎의 조용한 탭/메뉴처럼 보이고, active 상태는 아주 낮은 대비의 pill로만 표현한다.
- nav link와 작은 버튼은 hover/focus/active 상태가 분명하되, ChatGPT/Codex UI처럼 neutral surface와 가벼운 그림자 중심으로 표현한다.

주의:
- `BrowserRouter`, `Routes`, `Route`, `Link` 사용 방식은 변경하지 않는다.
- 새 sidebar나 새 라우팅 구조는 만들지 않는다.

### 3. `InterviewPage.tsx`
성공 기준:
- 메시지 렌더링 순서와 조건은 그대로 유지한다.
- assistant는 text-flow 기반 메시지 레이아웃으로 유지하고, user reply만 조용한 right-aligned bubble로 구분한다.
- 인터뷰 답변 대기 상태는 작은 typing indicator로 표시하고, 생성 단계는 대화 영역 안의 조용한 단계형 progress UI로 표시한다.
- 입력창은 하단 sticky composer가 되고, send 버튼은 내부 오른쪽 아이콘 버튼이 된다.
- composer는 Codex/ChatGPT처럼 텍스트 영역이 위에서 유연하게 늘어나고, 파일 첨부/모델 선택/전송 controls는 하단 toolbar에 고정된다.
- 사용자가 한 번 이상 메시지를 보낸 뒤에는 최신 interviewer 메시지 아래에 조용한 inline action으로 수동 생성 진입을 제공한다.
- composer의 기본 입력 row 안쪽 왼쪽에 `Auto / Haiku / Sonnet` 인터뷰 모델 선택을 조용한 custom dropdown으로 제공한다.
- 파일 첨부 동작과 지원 확장자 검증은 그대로 유지한다.
- 넓은 화면, 일반 노트북 폭, 모바일 폭에서 conversation column과 composer width가 안정적으로 맞는다.
- interviewer 메시지에는 외부 라이브러리 없이 간단한 markdown rendering을 적용한다. `**텍스트**`는 `<strong>`, 줄바꿈은 `<br />`로 렌더링한다.
- 사용자 메시지는 plain text로 유지한다.

주의:
- `handleSubmit`, `handleEdit`, `handleAttachClick`, `handleFileChange`의 로직은 변경하지 않는다.
- `isInputDisabled`, `isReviewing`, `isExportVisible`의 의미를 바꾸지 않는다.
- 필요하면 버튼 텍스트만 시각적으로 아이콘화하되, 접근성 label은 유지한다.
- textarea로 바꾸는 것은 입력 UX 개선일 수 있지만 기능 변경 리스크가 있으므로 별도 판단한다. 이번 구현에서는 기존 input 유지가 기본값이다.

### 4. `SummaryCard.tsx`
성공 기준:
- 검토 카드는 과한 bordered card보다 조용한 review panel 느낌으로 변경한다.
- `dl` 정보 구조와 confirm/edit callback은 유지한다.
- 버튼 hierarchy는 primary/secondary로 명확히 둔다.

주의:
- summary row filtering(`if (!value) return null`)은 그대로 유지한다.

### 5. `SkillExport.tsx`
성공 기준:
- 상단 actions와 preview 영역이 문서 export 화면처럼 정돈된다.
- 다운로드/복사는 primary CTA가 아니라 export workflow에 속한 조용한 액션으로 보인다.
- 기본 모드는 rendered preview이며, heading/list/paragraph/code/frontmatter를 읽기 좋은 workflow artifact로 렌더링한다.
- ordered list preview는 markdown의 시작 번호를 보존해 중간 문단으로 list block이 나뉘어도 번호가 1로 리셋되지 않는다.
- `Preview` / `Markdown` segmented control을 제공하고, preview를 기본값으로 둔다.
- Markdown 모드는 textarea 기반의 고급 수정 모드로 제공하며, helper text로 copy/download에 반영된다는 점을 알려준다.
- `currentMarkdown` 하나를 single source of truth로 사용한다.
- 다운로드/복사는 항상 현재 `currentMarkdown` 값을 그대로 사용하고, copied 상태는 그대로 유지한다.

주의:
- 파일명 timestamp와 브라우저 download/clipboard 사용 방식은 유지한다.
- 외부 markdown renderer 라이브러리는 추가하지 않는다.

## 구현 단위
1. `index.css` 디자인 토큰/reset 정리
   - verify: 기존 페이지가 깨지지 않고 build/lint가 통과한다.
2. `App.tsx` nav class 전환
   - verify: brand identity, persistent navigation, 새 대화 action이 서로 다른 위계로 보이고 `/`, `/library` 이동이 유지된다.
3. `InterviewPage.tsx` 채팅 레이아웃과 composer 개선
   - verify: 메시지 전송, 파일 첨부, loading/generating 상태, summary 전환이 유지된다.
4. `SummaryCard.tsx` 검토 패널 스타일 개선
   - verify: 확인/수정 버튼 동작이 유지된다.
5. `SkillExport.tsx` export preview 스타일 개선
   - verify: 다운로드와 클립보드 복사가 유지된다.

## 변경 금지 목록
- API endpoint, request/response type
- `useInterview`의 상태 관리와 side effect
- 파일 확장자 목록과 검증 메시지
- `generateResult` 기반 화면 전환 조건
- 다운로드 파일명 생성 방식

## 검증 체크리스트
- `npm run build`
- `npm run lint`
- 브라우저 수동 확인:
  - 초기 메시지가 자연스럽게 표시된다.
  - 사용자 메시지 전송 후 인터뷰어 응답 영역이 깨지지 않는다.
  - 파일 첨부 버튼과 선택 파일명이 표시된다.
  - 모델 선택은 composer 기본 입력 row의 왼쪽에 작고 조용한 custom dropdown으로 표시되며 기본값은 Auto다.
  - 사용자 메시지 이후 `지금 생성` action이 최신 interviewer 메시지 아래에 표시되고, composer 안이나 composer 위에는 표시되지 않는다.
  - `지금 생성` action은 default/hover 상태에서 left edge, padding, border width, height가 변하지 않는다.
  - 인터뷰 응답 대기와 스킬 생성 progress가 서로 다른 UI로 표시된다.
  - summary 확인 화면에서 확인/수정 버튼이 보인다.
  - export 화면에서 preview, 다운로드, 복사 버튼이 보인다.
- 시각 확인:
  - assistant 메시지는 말풍선 없이 흐르고, user bubble만 조용하게 구분된다.
  - composer가 하단에 안정적으로 고정된다.
  - 모바일 폭에서 텍스트와 버튼이 겹치지 않는다.
  - root frame, 과한 card stack, hero page 느낌이 없다.
  - send/focus/primary action/selected 상태에 green/sage 계열 accent가 남지 않는다.

## 리스크와 대응
- 인라인 스타일이 많아 class 전환 중 diff가 커질 수 있다.
  - 대응: 파일별로 한 번에 하나씩 적용하고, 로직 블록은 건드리지 않는다.
- send/attach 버튼을 아이콘화하면 접근성이 나빠질 수 있다.
  - 대응: `aria-label` 또는 `title`을 유지한다.
- 전역 `h1`, `h2` 스타일 변경이 Library placeholder에 영향을 줄 수 있다.
  - 대응: 앱 내부 제목에 맞는 보수적인 크기로 조정한다.
