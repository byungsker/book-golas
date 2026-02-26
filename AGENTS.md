# AGENTS.md

Guidelines for AI coding agents working in the Bookgolas repository.

## Project Structure

- `app/` - Flutter mobile app (primary)
- `web/` - Next.js admin dashboard  
- `supabase/functions/` - Deno Edge Functions

## Build & Test Commands

### Flutter App (app/)
```bash
cd app && flutter pub get          # Setup
cd app && flutter run              # Run app
cd app && flutter test             # Run all tests
cd app && flutter test test/widget_test.dart  # Single test file
cd app && flutter test --name "description"   # Filter by name
cd app && flutter analyze          # Linting
cd app && flutter build ios        # Build iOS
cd app && flutter build apk        # Build Android
```

### Web Admin (web/)
```bash
cd web && npm install && npm run dev    # Development
cd web && npm run build                 # Production build
cd web && npm run lint                  # ESLint
```

### Supabase Functions
```bash
supabase functions deploy <name>   # Deploy
supabase functions serve <name>    # Local test
```

## Code Style - Dart/Flutter

### Import Order (group with blank lines)
1. Dart SDK (`dart:`)
2. Flutter (`package:flutter/`)
3. External packages (`package:provider/`)
4. Project imports (`package:book_golas/`)
5. Relative imports (`./`, `../`)

### Naming Conventions
- Classes: `PascalCase` (BookService, HomeViewModel)
- Files: `snake_case` (book_service.dart)
- Variables/Functions: `camelCase` (fetchBooks, _isLoading)
- Private members: prefix `_` (_books)

### File Structure
- Screens: `feature/feature_screen.dart`
- ViewModels: `feature/view_model/feature_view_model.dart`
- Widgets: `feature/widgets/` (subfolder only for 2+ related widgets)

### Error Handling
```dart
try {
  await someAsyncOperation();
} catch (e) {
  print('Failed: $e');
  return null;  // Return null/empty on failure, don't throw
}
```

### ViewModel Pattern
```dart
class FeatureViewModel extends ChangeNotifier {
  bool _isLoading = false;
  bool get isLoading => _isLoading;
  
  Future<void> loadData() async {
    _isLoading = true;
    notifyListeners();
    try {
      // fetch data
    } finally {
      _isLoading = false;
      notifyListeners();  // ALWAYS call after state changes
    }
  }
}
```

### Model Classes
- Include `fromJson` factory and `toJson` method
- Use `copyWith` for immutable updates
- Nullable fields use `?` suffix

## Code Style - TypeScript/Deno

### Imports (URL-based)
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

### Interfaces & Error Responses
```typescript
interface RequestBody { userId?: string; title: string; }

return new Response(
  JSON.stringify({ error: "Message" }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);
```

## Code Style - Next.js (web/)
- TypeScript strict mode
- Radix UI components from `src/components/ui/`
- Tailwind CSS for styling
- Server components default, `"use client"` only when needed

## Architecture

### Layer Structure
```
UI (lib/ui/) → ViewModel → Repository → Service
```

### Dependency Injection (main.dart MultiProvider)
1. Services (pure)
2. Repositories (depend on services)
3. ViewModels (depend on repositories)

### Database Access
- Client: `Supabase.instance.client`
- Always filter by `user_id`
- Pattern: `select().eq().order()`

## Git Workflow

### Branch Strategy

```
main (Production)
 │
 └── dev (TestFlight)
      │
      └── daily/YYYY-MM-DD (일별 작업 그룹화 - 직접 커밋 금지!)
           │
           ├── feature/BYU-XXX-task-name (실제 작업 브랜치)
           ├── feature/BYU-YYY-another-task
           └── fix/BYU-ZZZ-bug-fix
```

**브랜치 역할:**

| 브랜치 | 용도 | 직접 커밋 |
|--------|------|----------|
| `main` | Production 릴리즈 | ❌ 금지 |
| `dev` | 개발 통합 브랜치 | ❌ 금지 |
| `daily/YYYY-MM-DD` | 일별 작업 그룹화 (머지 타겟) | ❌ 금지 |
| `feature/BYU-XXX-*` | **실제 코드 작업** | ✅ 허용 |

### Daily Workflow

⚠️ **중요: `daily` 브랜치에 직접 커밋하지 마라. 반드시 `feature/BYU-XXX` 브랜치를 만들어서 작업해라.**

```
1. 작업 시작
   ├── daily/YYYY-MM-DD 브랜치가 없으면 dev에서 생성
   └── daily 브랜치에서 feature/BYU-XXX 브랜치 생성 ← 여기서 작업!

2. 이슈별 작업 (각 이슈마다 반복)
   ├── feature/BYU-XXX 브랜치에서 코드 작성 및 커밋
   ├── 작업 완료 시 feature/BYU-XXX → daily PR 생성 및 머지
   └── 다음 이슈는 daily에서 새로운 feature/BYU-YYY 브랜치 생성

3. 일일 작업 완료
   └── daily → dev PR 생성 → 머지 → TestFlight 자동 배포

4. 버전 릴리즈
   └── dev → main PR 생성 (버전 태그: v1.x.x) → 머지 → App Store 배포
```

### PR 생성 규칙 (CRITICAL - BLOCKING)

**허용되는 PR 방향:**

| From | To | 허용 |
|------|-----|------|
| `feature/BYU-XXX` | `daily/YYYY-MM-DD` | ✅ 허용 |
| `daily/YYYY-MM-DD` | `dev` | ✅ 허용 |
| `dev` | `main` | ✅ 허용 (릴리즈 시) |
| `feature/BYU-XXX` | `dev` | ❌ **절대 금지** |
| `feature/BYU-XXX` | `main` | ❌ **절대 금지** |
| `daily/YYYY-MM-DD` | `main` | ❌ **절대 금지** |

**daily 브랜치가 remote에 없을 때:**

```bash
# ❌ 잘못된 대응: dev에 직접 PR 생성
gh pr create --base dev  # 절대 금지!

# ✅ 올바른 대응: daily 브랜치 생성 후 push
git checkout dev
git pull origin dev
git checkout -b daily/$(date +%Y-%m-%d)
git push -u origin daily/$(date +%Y-%m-%d)
# 그 후 feature → daily PR 생성
```

**PR 생성 전 필수 체크리스트:**

1. [ ] `--base`가 `daily/YYYY-MM-DD` 형식인가? (feature PR의 경우)
2. [ ] daily 브랜치가 remote에 존재하는가? 없으면 생성 먼저!
3. [ ] `--base dev` 또는 `--base main`을 사용하고 있지 않은가?

**위반 시 = BLOCKED. 작업 중단하고 올바른 절차로 재진행.**

### 브랜치 생성 예시

```bash
# 1. daily 브랜치 생성 (없으면)
git checkout dev
git pull origin dev
git checkout -b daily/2025-01-07

# 2. 이슈 작업용 feature 브랜치 생성
git checkout daily/2025-01-07
git checkout -b feature/BYU-225-fix-network-error

# 3. 작업 및 커밋 (feature 브랜치에서!)
# ... 코드 작성 ...
git add .
git commit -m "fix: 네트워크 오류 수정 (BYU-225)"

# 4. feature → daily PR 생성 및 머지
git push origin feature/BYU-225-fix-network-error
gh pr create --base daily/2025-01-07 --head feature/BYU-225-fix-network-error

# 5. 다음 이슈는 daily에서 새 브랜치
git checkout daily/2025-01-07
git pull origin daily/2025-01-07
git checkout -b feature/BYU-248-tab-cycling
```

### Commit Rules

- 반드시 gh를 **byungsker** 계정으로 커밋, 푸시, PR을 진행해야해.
- 커밋 메세지는 영문 컨벤셔널 커밋으로 해야해. (단, description은 한글 불릿 포인트로 작성.)
- 맥락 별로 커밋을 만들며 진행해야해.

### Merge Rules

- PR 머지 시 반드시 **"Create a merge commit"** 방식으로 머지해라.
- ❌ "Squash and merge" 사용 금지
- ❌ "Rebase and merge" 사용 금지
- `gh pr merge` 사용 시: `gh pr merge --merge` (기본값이 merge commit)

### PR Template

PR 생성 시 아래 템플릿을 사용해. (인용문은 지우고 해당 내용을 작성)

```markdown
> 이번 PR의 목적을 한 문장으로 요약해주세요.
>
> - 예: 사용자가 프로필 정보를 수정할 수 있는 기능을 추가했습니다.

## 📋 Changes

> 주요 변경사항을 bullet로 정리해주세요.
>
> - 예:
>   - `UserProfileEdit.tsx` 컴포넌트 추가
>   - `/api/user/profile` PUT 엔드포인트 연결
>   - Validation 로직 추가

## 🧠 Context & Background

> 이 변경이 필요한 이유를 설명해주세요.
> 관련된 이슈나 문서 링크를 첨부해도 좋아요.
>
> - 예: 유저 피드백에 따라 프로필 수정 기능이 필요했습니다. (#45)

## ✅ How to Test

> 테스트 방법을 단계별로 작성해주세요.
>
> - 예:
>   1. `/profile/edit` 페이지로 이동
>   2. 이름 수정 후 저장 클릭
>   3. 수정 내용이 DB에 반영되는지 확인

## 🧾 Screenshots or Videos (Optional)

> UI 변경이 있을 경우, Before / After 이미지를 첨부해주세요.
> 또는 Loom, GitHub Video를 추가해도 좋아요.

## 🔗 Related Issues

> 연관된 이슈를 연결해주세요.
>
> - 예:
>   - Closes: #123
>   - Related: #456

## 🙌 Additional Notes (Optional)

> 기타 참고사항, TODO, 리뷰어에게 요청사항 등을 작성해주세요. - 예: 스타일 관련 부분은 별도 PR로 분리 예정입니다.
```

## Critical Rules

1. **Remove comments before commit** - No comments in committed code
2. **Use debugPrint()** - Not print() in production
3. **Always notifyListeners()** - After ViewModel state changes
4. **Return null/empty on errors** - Don't throw from services
5. **Use const constructors** - For widgets where possible
6. **Multilingual UX Writing (다국어 적용)** - Always apply multilingual support for user-facing text

### Multilingual UX Writing Guidelines

When adding any UX writing or user-facing text to the app, **you MUST add translations to both Korean and English ARB files**.

#### ARB Files Location
- Korean: `app/lib/l10n/app_ko.arb`
- English: `app/lib/l10n/app_en.arb`

#### How to Add Multilingual Strings

**Step 1: Add to ARB files**

```json
// app/lib/l10n/app_ko.arb
{
  "commonCancel": "취소",
  "@commonCancel": {
    "description": "Cancel button text"
  }
}

// app/lib/l10n/app_en.arb
{
  "commonCancel": "Cancel",
  "@commonCancel": {
    "description": "Cancel button text"
  }
}
```

**Step 2: Use in Dart code**

```dart
import 'package:book_golas/l10n/app_localizations.dart';

// In your widget
Text(AppLocalizations.of(context)!.commonCancel)

// Or in ViewModel (pass context from UI)
String cancelText = AppLocalizations.of(context)!.commonCancel;
```

#### Naming Convention for String Keys
- Use `camelCase` for key names
- Prefix with feature/context: `commonCancel`, `homeTitle`, `profileEditName`
- Keep keys descriptive but concise

#### CRITICAL: Never Hardcode User-Facing Text
- ❌ `Text("Cancel")` - Hardcoded, not translatable
- ✅ `Text(AppLocalizations.of(context)!.commonCancel)` - Translatable

#### Workflow
1. Write the English text first in `app_en.arb`
2. Add Korean translation in `app_ko.arb` with same key
3. Add `@key` description for context
4. Use `AppLocalizations.of(context)!.keyName` in code
5. Run `flutter pub get` to regenerate localization files
6. Commit both ARB files together with code changes

## Environment Variables (app/.env)
- `ALADIN_TTB_KEY` - Book search API
- `SUPABASE_URL` - Supabase URL
- `SUPABASE_ANON_KEY` - Supabase key
- `ENVIRONMENT` - development/production

## Key Files
- `app/lib/main.dart` - Entry, providers
- `app/lib/config/app_config.dart` - Config
- `app/lib/data/services/` - API services
- `app/lib/data/repositories/` - Data layer
- `app/lib/ui/*/view_model/` - State management

## Supabase Environment Rules (CRITICAL)

### Two Supabase Projects

| Project | Project Ref | Purpose | When to Use |
|---------|-------------|---------|-------------|
| **supabase-dev** | `reoiqefoymdsqzpbouxi` | Development & Testing | 로컬 개발, TestFlight |
| **supabase** (prod) | `enyxrgxixrnoazzgqyyd` | Production | main 브랜치 배포 CI만 |

### MCP Configuration (`.opencode.json`)

```json
{
  "mcp": {
    "supabase": {
      "enabled": false  // Production - OFF by default
    },
    "supabase-dev": {
      "enabled": true   // Development - ON by default
    }
  }
}
```

**CRITICAL**: 개발 중에는 반드시 `supabase-dev` MCP만 사용해라. Production MCP는 절대 활성화하지 마라.

### Environment Variables (`app/.env`)

```bash
# Development (default) - supabase-dev project
SUPABASE_URL=https://reoiqefoymdsqzpbouxi.supabase.co
SUPABASE_ANON_KEY=<dev-anon-key>

# Production - ONLY used in main branch CI deployment
# SUPABASE_URL=https://enyxrgxixrnoazzgqyyd.supabase.co
# SUPABASE_ANON_KEY=<prod-anon-key>
```

**Rules:**
1. `.env` 파일에는 항상 **dev 환경변수**가 기본값으로 설정되어야 함
2. Production 환경변수는 **GitHub Actions CI에서만** 주입됨 (main 브랜치 배포 시)
3. 로컬에서 prod 환경변수 사용 금지

### Supabase CLI Usage

```bash
# Dev project에 연결 (기본)
supabase link --project-ref reoiqefoymdsqzpbouxi

# Migration 실행 (dev)
supabase db push

# Edge Function 배포 (dev)
supabase functions deploy <function-name>

# Secret 설정 (dev)
supabase secrets set OPENAI_API_KEY=sk-...
```

### Deployment Flow

```
1. 로컬 개발 → supabase-dev 프로젝트
2. feature → daily → dev 머지 → TestFlight (supabase-dev)
3. dev → main 머지 → Production (supabase prod) ← CI가 prod 환경변수 주입
```

**WARNING**: Production Supabase에 직접 migration이나 function 배포하지 마라. main 브랜치 CI를 통해서만 배포해라.

### Database Migration Guidelines (CRITICAL)

#### ⚠️ MCP apply_migration 사용 금지

**절대 MCP `apply_migration`을 사용하지 마라.**

| 방법 | 타임스탬프 | CI 호환성 |
|------|-----------|-----------|
| MCP `apply_migration` | 자동 생성 (서버 시간) | ❌ 로컬 파일과 불일치 |
| `supabase migration new` | 자동 생성 (로컬 시간) | ✅ 일치 |

MCP로 마이그레이션 적용 시 타임스탬프가 `20260124150149` 형식으로 생성되지만,
로컬 파일은 다른 이름이므로 CI에서 "Remote migration versions not found" 에러 발생.

#### Migration File Creation (MANDATORY)

**반드시 Supabase CLI로 마이그레이션 파일 생성:**

```bash
# 1. 프로젝트 루트에서 실행
supabase migration new <description>

# 예시
supabase migration new add_user_preferences
# 결과: supabase/migrations/20260125123456_add_user_preferences.sql (타임스탬프 자동)
```

- 파일명 형식: `YYYYMMDDHHMMSS_description.sql` (CLI가 자동 생성)
- description: `snake_case`, 소문자 (예: `create_users_table`, `add_email_to_profiles`)

#### Migration Workflow

```
1. 마이그레이션 파일 생성 (CLI 필수!)
   └── supabase migration new add_new_column
   └── 생성된 파일: supabase/migrations/20260125123456_add_new_column.sql

2. SQL 작성
   └── 생성된 파일에 SQL 작성

3. Dev DB에 적용 (로컬에서)
   └── supabase link --project-ref reoiqefoymdsqzpbouxi
   └── supabase db push

4. 코드 작성 및 테스트

5. feature → daily → dev 머지
   └── CI가 자동으로 Dev DB에 마이그레이션 적용 (이미 적용된 경우 스킵)

6. dev → main 머지 (Production 배포)
   └── CI가 자동으로 Prod DB에 마이그레이션 적용
```

#### MCP 대안: 읽기 전용 사용

MCP Supabase 도구는 **읽기 전용**으로만 사용:

| MCP 도구 | 허용 여부 |
|----------|----------|
| `list_tables` | ✅ 허용 |
| `list_migrations` | ✅ 허용 |
| `execute_sql` (SELECT) | ✅ 허용 |
| `execute_sql` (INSERT/UPDATE/DELETE) | ⚠️ 주의 |
| `apply_migration` | ❌ **금지** |
| `deploy_edge_function` | ✅ 허용 |

#### CI/CD Migration Automation

| Branch | Target DB | Action |
|--------|-----------|--------|
| `dev` | supabase-dev (`reoiqefoymdsqzpbouxi`) | `supabase db push` 자동 실행 |
| `main` | supabase-prod (`enyxrgxixrnoazzgqyyd`) | `supabase db push` 자동 실행 |

**Required GitHub Secrets:**
- `SUPABASE_ACCESS_TOKEN` - Supabase Personal Access Token
- `SUPABASE_PROJECT_REF_DEV` - Dev project ref (`reoiqefoymdsqzpbouxi`)
- `SUPABASE_PROJECT_REF_PROD` - Prod project ref (`enyxrgxixrnoazzgqyyd`)

#### Dangerous Operations Warning

다음 SQL 명령어는 CI에서 경고 또는 차단됩니다:

| Command | Level | 설명 |
|---------|-------|------|
| `DROP TABLE` | ⚠️ Warning | 테이블 삭제 - 의도 확인 필요 |
| `DROP COLUMN` | ⚠️ Warning | 컬럼 삭제 - 데이터 마이그레이션 확인 필요 |
| `ALTER...TYPE` | ⚠️ Warning | 타입 변경 - 데이터 호환성 확인 필요 |
| `TRUNCATE` | ❌ Error | 데이터 전체 삭제 - CI 차단 |

#### Rollback Strategy

마이그레이션 롤백이 필요한 경우:

```sql
-- 롤백 SQL 예시 (별도 파일로 보관 권장)
-- rollback/20260122_add_new_column.sql

ALTER TABLE books DROP COLUMN IF EXISTS new_column;
```

**주의**: Supabase는 자동 롤백을 지원하지 않음. 문제 발생 시 수동으로 롤백 SQL 실행 필요.

## BLab Design System Usage (MANDATORY)

### 규칙
- 모든 Material 3 UI는 BLab 컴포넌트 사용
- 색상: BLabColors.* 사용 (AppColors 금지)
- 테마: BLabTheme.light/dark 사용 (AppTheme 금지)
- 타이포그래피: BLabTypography.* 사용 (AppTypography 금지)
- 버튼: BLabButton 사용 (ElevatedButton, TextButton 금지)
- 카드: BLabCard 사용 (Card 금지)
- 입력: BLabTextField 사용 (TextField 금지)
- 스낵바: BLabSnackbar.show() 사용 (ScaffoldMessenger 금지)

### 예외
- 플랫폼 네이티브 위젯 (AppBar, Scaffold 등)은 BLab 색상/테마 적용
- 써드파티 라이브러리 위젯은 BLab 색상으로 커스터마이징

### 새 컴포넌트 추가 프로세스
1. BLab에 추가할 가치 평가
2. YES → blab_design_system 리포에 PR
3. 머지 후 이 프로젝트에서 사용

### Import 방식
```dart
import 'package:blab_design_system/blab_design_system.dart';

// 사용 예시
BLabButton(text: 'Submit', onPressed: () {})
BLabCard(child: Text('Content'))
BLabSnackbar.show(context, message: 'Success', type: BLabSnackbarType.success)
```
