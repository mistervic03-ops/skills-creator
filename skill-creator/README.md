# Skill Creator

반복 업무를 대화형 인터뷰로 정리해 재사용 가능한 `SKILL.md`로 생성하는 웹 도구입니다.

## 개요

Skill Creator는 비개발자가 자신의 업무 방식과 판단 기준을 설명하면 이를 재사용 가능한 워크플로 문서로 구조화하기 위해 만들었습니다. 인터뷰 내용을 바탕으로 `SKILL.md`를 생성하고, 사용자가 결과를 검토한 뒤 파일로 내보내거나 로컬 스킬 라이브러리에 보관할 수 있습니다. 인터뷰 세션과 저장된 스킬은 현재 서버 내부에서 관리하며 외부 데이터베이스는 사용하지 않습니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 백엔드 | Python 3.12, FastAPI >= 0.115.0, Uvicorn >= 0.30.0 |
| AI 연동 | Anthropic Python SDK >= 0.40.0, Claude Haiku 4.5, Claude Sonnet 4 |
| 파일 처리 | python-docx >= 1.1.0, openpyxl >= 3.1.0 |
| 프론트엔드 | React 19.2.6, React Router 7.15.1, Axios 1.16.1 |
| 프론트엔드 빌드 | TypeScript 6.0.3, Vite 8.0.14, Node.js 24 |
| 배포 | Docker Compose, Nginx 1.29 |
| 검사 | Pytest >= 8.0.0, Black >= 24.10.0, ESLint 10.4.0 |

프론트엔드 버전은 `frontend/package-lock.json`, Python 패키지의 최소 버전은 `backend/requirements.txt`, 런타임 버전은 Dockerfile을 기준으로 작성했습니다.

## 구조

```text
skill-creator/
├── backend/
│   ├── main.py          # FastAPI 앱 진입점
│   ├── api/             # HTTP 엔드포인트와 요청/응답 모델
│   ├── services/        # 인터뷰, 생성, 첨부 파일 처리, 스킬 저장
│   ├── prompts/         # 인터뷰어와 생성기 시스템 프롬프트
│   └── tests/           # 백엔드 단위 및 흐름 테스트
├── frontend/
│   ├── src/
│   │   ├── pages/       # 인터뷰와 스킬 라이브러리 화면
│   │   ├── components/  # 생성 진행, 검토, 내보내기 UI
│   │   ├── hooks/       # 인터뷰 상태와 API 흐름
│   │   └── api.ts       # 백엔드 API 클라이언트
│   ├── nginx.conf       # 배포 환경의 정적 파일 및 API 프록시 설정
│   └── package.json
├── docs/                # 설계, API, 프롬프트, 배포 문서
└── docker-compose.yml   # 프론트엔드, 백엔드, 저장 볼륨 구성
```

데이터는 `React UI → /api → FastAPI 라우터 → 인터뷰·생성 서비스 → Anthropic API` 순서로 흐릅니다. 생성된 문서는 프론트엔드에서 검토·내보내기하며, 라이브러리에 저장하면 백엔드 파일시스템의 `skill.md`와 `metadata.json`으로 기록됩니다. 인터뷰 세션은 백엔드 프로세스 메모리에 유지됩니다.

## 실행 방법

### 로컬 실행

백엔드 실행 전에 `backend/.env`를 만들고 아래 환경변수 표에 따라 설정합니다.

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

별도 터미널에서 프론트엔드를 실행합니다.

```sh
cd frontend
npm ci
npm run dev
```

### 배포 실행

저장소 루트에서 `.env.example`을 복사한 뒤 필요한 환경변수를 설정하고 Compose 스택을 시작합니다.

```sh
cp .env.example .env
docker compose up -d --build
docker compose ps
```

스택을 중지할 때는 다음 명령을 사용합니다.

```sh
docker compose down
```

저장된 스킬은 Compose의 `skill-library-data` 볼륨에 유지됩니다.

## 환경변수

| 변수명 | 용도 | 필수 여부 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 인터뷰와 `SKILL.md` 생성 요청을 Anthropic API에 인증 | 필수 |
| `SKILL_LIBRARY_DIR` | 저장된 스킬의 Markdown과 메타데이터를 기록할 디렉토리 지정 | 선택, Docker Compose에서는 자동 설정 |
| `VITE_API_BASE_URL` | 프론트엔드가 요청할 백엔드 API 기본 경로 지정 | 선택, 미설정 시 기본 프록시 경로 사용 |

## 참고

- [AGENTS.md](AGENTS.md): 코드 위치, 문서 유지 규칙, 테스트와 서버 확인 기준을 설명합니다.
- [docs/architecture.md](docs/architecture.md): 전체 흐름, 디렉토리 구조, 컴포넌트 간 의존성을 설명합니다.
- [docs/principles.md](docs/principles.md): 인터뷰와 워크플로 생성에서 지켜야 할 제품 원칙을 설명합니다.
- [docs/decisions.md](docs/decisions.md): 주요 설계 결정과 그 이유를 기록합니다.
- [docs/api-contracts.md](docs/api-contracts.md): 백엔드 엔드포인트의 요청, 응답, 동작 계약을 정의합니다.
- [docs/prompt-design.md](docs/prompt-design.md): 시스템 프롬프트의 설계 원칙, 출력 형식, 검증 규칙을 설명합니다.
- [docs/frontend-ui-redesign.md](docs/frontend-ui-redesign.md): 프론트엔드 화면 구조와 UI 변경 기준을 설명합니다.
- [docs/deployment.md](docs/deployment.md): Docker Compose 배포, 볼륨, 운영 명령을 설명합니다.
