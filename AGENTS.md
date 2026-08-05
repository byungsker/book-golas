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

브랜치 생성, PR, release/hotfix, 역반영과 브랜치 정리는 전역
`engineering-team` 하네스의 `references/branch-strategy.md`를 따른다.
이 문서에서는 Bookgolas의 배포 프로필과 저장소 고유 규칙만 정의한다.

### Delivery Profiles

| Surface | Profile |
| --- | --- |
| `app/` iOS/Android 앱 | `mobile-store` |
| `web/` Next.js Admin | `web-release-train` |
| `supabase/` Functions 및 DB | 모바일 결합 시 `mobile-store`, 독립 배포 시 `backend-service` |

### Repository-Specific Rules

- 모든 브랜치와 PR은 `.byungskerlab/branch-policy.json`,
  `.byungskerlab/release-lines.json`과 전역 Target Delivery Contract를
  따른다.
- 기계 검증 가능한 활성 버전 원본은 `release-lines.json`이며, 현재
  승인된 모바일 타깃 `1.0.2`의 근거는 `docs/product-roadmap.md`이다.
  현재 앱 매니페스트 버전은 후속 모바일 작업에서 타깃 버전에 맞춘다.
  독립 Web admin의 승인된 parallel release train은 `1.0.2`이며,
  `AGENTS.md`와 `docs/product-roadmap.md`가 그 evidence를 함께 기록한다.
- active version을 여는 정책 변경은 byungsker 검토가 필요한
  `chore/governance/1.0.0/<scope>` PR로만 수행한다.
- `daily/*`는 사용하지 않는다.
- 모바일 작업과 모바일에 결합된 backend 작업은 승인된 `dev`에서 연
  `version/mobile/x.y.z`에서 분기하고 같은 version line으로 PR한다.
- `web/`은 승인된 버전마다 운영 `main`에서
  `version/web/x.y.z`를 열고 같은 버전 작업만 받은 뒤
  `release/web/x.y.z` QA를 거쳐 `main`으로 승격한다.
- 현재 `ios-testflight.yml`과 `ios-production.yml`이 Supabase migration과
  Functions 배포를 함께 수행한다. 이 결합을 제거하기 전까지 자동
  Supabase 배포는 `mobile-store` 흐름을 따른다.
- Functions만 독립 배포할 때는 검증된 커밋과 명시적 배포 권한을
  확인하고 수동 `deploy-edge-functions.yml`을 사용한다.
- `integration/<unit>/x.y.z/<purpose>`는 같은 버전의 여러 검토 완료
  작업 조합 검증에만 사용하며 직접 커밋, 새 작업의 기반, promotion
  source로 사용하지 않는다.
- 작업 브랜치는
  `[codex/]<type>/<delivery-unit>/<x.y.z>/<issue-or-scope>` 형식이다.
- PR 본문에는 `Target-Delivery-Unit`, `Target-Version`,
  `Delivery-Profile`을 정확히 한 번씩 기록한다.
- release 또는 hotfix 승격 PR은 governance 변경으로
  `.byungskerlab/release-lines.json`에 승인된 source branch와 정확한
  40자리 source SHA를 먼저 등록한다. PR의 `Promotion-Source-SHA`가
  registry 및 실제 commit ancestry와 일치하지 않으면 반려한다.
- 브랜치·worktree·commit·push·PR 생성/수정/리뷰/승인/merge를 수행하는
  모든 Engineering Team 에이전트가 타깃 버전을 독립 확인한다.
- branch, base, PR metadata, issue, roadmap, policy config 중 하나라도
  빠지거나 다르면 `REQUEST_CHANGES`로 반려하고 Git 작업을 진행하지 않는다.
- release 또는 hotfix source branch/SHA나 ancestry를 검증할 수 없어도
  `REQUEST_CHANGES`로 반려한다.
- `.github/workflows/target-version-gate.yml`은 이 규칙을 fail-closed로
  검사한다. required check가 없거나 skipped/neutral/failing이면 merge
  승인으로 간주하지 않는다.
- 기존 비준수 활성 브랜치는 그대로 PR하지 않는다. 올바른 version
  line에서 새 브랜치를 만들고 필요한 커밋만 안전하게 옮긴다.
- 커밋 제목은 영문 Conventional Commit을 사용하고, 본문 설명은 한글
  불릿으로 작성한다.
- 이 저장소의 PR은 전역 기본값을 강화해 항상 merge commit으로
  병합한다. squash와 rebase merge는 사용하지 않는다.
- PR 설명에는 목적, 주요 변경, 배경, 검증 방법과 관련 이슈를 포함한다.
- 브랜치 생성, 커밋, push, PR, merge, tag, 출시와 배포는 각각 사용자
  권한 범위 안에서만 수행한다.

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

### Environment Promotion

- 로컬 개발은 `supabase-dev`만 사용한다.
- `dev`의 iOS TestFlight 워크플로는 Dev migration과 Functions 배포를
  함께 수행한다.
- `main`의 iOS Production 워크플로는 Production migration과 Functions
  배포를 App Store 빌드와 함께 수행한다.
- Functions 단독 배포는 수동 워크플로를 사용하며 Production 대상은
  별도 명시적 권한이 필요하다.
- Production Supabase에 로컬에서 직접 migration이나 Functions를
  배포하지 않는다.

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

1. Supabase CLI로 migration 파일을 생성한다.
2. SQL을 작성하고 Dev DB에서 적용·검증한다.
3. 코드와 migration 검사를 함께 통과시킨다.
4. 위 Git Workflow와 현재 CI 결합 규칙에 따라 동일한 검증 변경을
   승격한다.
5. Production 적용은 CI와 사용자 승인 경계를 거친다.

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
