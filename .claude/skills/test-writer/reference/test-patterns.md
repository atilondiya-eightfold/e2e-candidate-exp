# Test Patterns Reference

Deep how-to for pytest (unit + integration) and Playwright (E2E). Extracted from `SKILL.md` to keep the skill body lean. Read when generating tests for a new module.

## Pytest — Layout

```
backend/tests/
├── conftest.py                 # session-wide fixtures (db engine, test app, auth)
├── services/                   # unit tests for service-layer functions
│   └── test_<module>.py
├── api/                        # integration tests against FastAPI TestClient
│   └── test_<module>_api.py
└── factories.py                # factory_boy / simple-factory helpers
```

## Core Fixtures (conftest.py)

Reuse existing fixtures. If missing, add:

```python
@pytest.fixture(scope="session")
def db_engine():
    """Session-wide test DB engine with schema created."""
    from sqlmodel import create_engine, SQLModel
    from app.core.config import settings
    engine = create_engine(str(settings.TEST_DATABASE_URL))
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)

@pytest.fixture
def db_session(db_engine):
    """Per-test transactional session; rolls back at teardown."""
    from sqlmodel import Session
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """TestClient with the DB session dependency override."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.deps import get_session
    app.dependency_overrides[get_session] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def ic_user(db_session) -> "User":
    """Plain IC user for RBAC tests."""
    # Build via factory
    ...

@pytest.fixture
def manager_user(db_session) -> "User":
    """Manager with direct reports for RBAC tests."""
    ...

@pytest.fixture
def auth_token(client, ic_user) -> str:
    """Login and return bearer token."""
    resp = client.post("/api/v1/auth/login/", json={...})
    return resp.json()["data"]["token"]
```

## Unit Test Pattern

```python
class TestGoalService:
    def test_create_goal_sets_owner_to_caller(self, db_session, ic_user):
        """AC §4-1: creating a goal sets owner_id to the current user."""
        from app.services.goal import create_goal
        goal = create_goal(db_session, user=ic_user, title="Ship v1")
        assert goal.owner_id == ic_user.id
        assert goal.status == "DRAFT"
```

## Integration Test Pattern

```python
class TestGoalAPI:
    def test_ic_creates_own_goal(self, client, auth_token):
        """AC §4-1: IC can create their own goal (201)."""
        resp = client.post(
            "/api/v1/goals/",
            json={"title": "Ship v1"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["title"] == "Ship v1"
        assert data["canEdit"] is True
        assert data["canDelete"] is True

    def test_ic_cannot_archive_others_goal(self, client, auth_token, other_user_goal):
        """AC §4-3: IC cannot archive a goal they don't own (expects 403)."""
        resp = client.patch(
            f"/api/v1/goals/{other_user_goal.id}/archive",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"
```

## Pagination Cursor Stability Test

```python
def test_cursor_stable_under_concurrent_writes(self, client, auth_token):
    """Cursor pagination remains consistent when new rows are inserted mid-scan."""
    # 1. Page 1 (first 10)
    page1 = client.get("/api/v1/goals/?limit=10", headers=_auth(auth_token)).json()
    cursor = page1["meta"]["cursor"]
    # 2. Insert 5 new goals
    for i in range(5):
        client.post("/api/v1/goals/", json={"title": f"New {i}"}, headers=_auth(auth_token))
    # 3. Page 2 via cursor
    page2 = client.get(f"/api/v1/goals/?cursor={cursor}&limit=10", headers=_auth(auth_token)).json()
    # No duplicates between pages
    ids1 = {g["id"] for g in page1["data"]}
    ids2 = {g["id"] for g in page2["data"]}
    assert ids1.isdisjoint(ids2)
```

## Playwright — Layout

```
frontend/e2e/
├── helpers/
│   ├── login.ts                # loginViaUI
│   └── factories.ts            # build-a-goal helpers
├── pages/
│   └── GoalDetailPage.ts       # Page Object Model
└── <cluster>.spec.ts           # per-cluster tests
```

## `loginViaUI` Helper

```ts
// helpers/login.ts
import { Page, expect } from "@playwright/test";

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for the dashboard route — proves real auth, not localStorage mock
  await expect(page).toHaveURL(/\/dashboard/);
}
```

**Never** inject a token into `localStorage` to skip the login flow. The login flow is itself a high-value test.

## Page Object Model

For any screen with ≥3 interactions:

```ts
// pages/GoalDetailPage.ts
import { Page, Locator, expect } from "@playwright/test";

export class GoalDetailPage {
  readonly title: Locator;
  readonly editButton: Locator;
  readonly archiveButton: Locator;
  readonly toast: Locator;

  constructor(private page: Page) {
    this.title = page.locator("h1[data-testid=goal-title]");
    this.editButton = page.locator('button:has-text("Edit")');
    this.archiveButton = page.locator('button:has-text("Archive")');
    this.toast = page.locator('[role="status"]');
  }

  async goto(id: string) {
    await this.page.goto(`/goals/${id}`);
    await expect(this.title).toBeVisible();
  }

  async archive() {
    await this.archiveButton.click();
    await this.page.locator('button:has-text("Confirm")').click();
    await expect(this.toast).toContainText("Goal archived");
  }
}
```

## Spec Pattern (one describe per story)

```ts
import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/login";
import { GoalDetailPage } from "./pages/GoalDetailPage";

test.describe("S-003: IC creates and archives a goal", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, "ic@example.com", "password123");
  });

  test("happy path — create, view, archive", async ({ page }) => {
    // Workflow-test-plan happy path, step-by-step
    await page.click('button:has-text("Create goal")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('input[name="title"]', "Ship v1");
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Goal created')).toBeVisible();
    // Detail
    await page.click('text=Ship v1');
    const detail = new GoalDetailPage(page);
    await detail.archive();
    await expect(page.locator('text=ARCHIVED')).toBeVisible();
  });

  test("edge case: empty title shows validation error", async ({ page }) => {
    await page.click('button:has-text("Create goal")');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Title is required')).toBeVisible();
  });

  test("error case: server 500 surfaces toast and keeps form state", async ({ page, request }) => {
    // Route intercept for this one test
    await page.route("**/api/v1/goals/", (r) => r.fulfill({ status: 500, body: "{}" }));
    await page.click('button:has-text("Create goal")');
    await page.fill('input[name="title"]', "Ship v1");
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Something went wrong')).toBeVisible();
    // Form keeps the value — user doesn't lose input on error
    await expect(page.locator('input[name="title"]')).toHaveValue("Ship v1");
  });
});
```

## Test Naming

- Backend: `test_<scenario>` — `test_ic_creates_own_goal`, `test_manager_cannot_delete_team_goal`.
- Frontend E2E: `describe` = story; tests phrased as outcomes — `"happy path"`, `"empty title shows validation error"`, `"server 500 preserves input"`.

## Coverage Matrix Template

Top of each test file:

```python
"""
Coverage matrix — S-003 Goal create + archive

| Story AC | Workflow-test step   | Test case                                    |
|----------|----------------------|----------------------------------------------|
| §4-1     | Happy-path step 3    | test_ic_creates_own_goal                      |
| §4-2     | Edge-case 1 step 2   | test_create_goal_empty_title_400              |
| §4-3     | Error-case step 1    | test_create_goal_server_500                   |
| §4-4     | Happy-path step 5    | test_ic_archives_own_goal_success             |
| §4-5     | Edge-case 2 step 1   | test_ic_cannot_archive_others_goal_403        |
"""
```

## Anti-Patterns

- ❌ Token injection into localStorage (skips auth flow).
- ❌ Mocks of the DB layer in integration tests.
- ❌ `assert True` or `@pytest.mark.skip` without issue reference.
- ❌ Testing the same AC with 6 variations — one good test per AC beats many shallow ones.
- ❌ Assertions on HTTP status without also checking the response body.
- ❌ Using `time.sleep()` in Playwright — use `waitFor*` or `expect().toBeVisible()`.
- ❌ Cross-test state pollution — fixtures must isolate.
