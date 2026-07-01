import pytest


# ── helpers ──────────────────────────────────────────────────────────────────

def register(client, email="test@example.com", password="password123", name="Test User"):
    return client.post("/api/v1/auth/register", json={"email": email, "password": password, "display_name": name})


def auth_headers(client, email="test@example.com", password="password123"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── auth ──────────────────────────────────────────────────────────────────────

def test_register(client):
    r = register(client)
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert "password" not in data["user"]
    assert data["user"]["email"] == "test@example.com"


def test_register_duplicate_email(client):
    register(client)
    r = register(client)
    assert r.status_code == 409


def test_login(client):
    register(client)
    r = client.post("/api/v1/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client):
    register(client)
    r = client.post("/api/v1/auth/login", json={"email": "test@example.com", "password": "wrongpass"})
    assert r.status_code == 401


def test_me(client):
    register(client)
    headers = auth_headers(client)
    r = client.get("/api/v1/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "test@example.com"


# ── unauthorized ──────────────────────────────────────────────────────────────

def test_unauthorized_me(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 403  # HTTPBearer returns 403 on missing header


def test_unauthorized_workspaces(client):
    r = client.get("/api/v1/workspaces/")
    assert r.status_code == 403


# ── workspaces ────────────────────────────────────────────────────────────────

def test_create_workspace(client):
    register(client)
    headers = auth_headers(client)
    r = client.post("/api/v1/workspaces/", json={"name": "My Workspace"}, headers=headers)
    assert r.status_code == 201
    assert r.json()["name"] == "My Workspace"


def test_workspace_creator_is_owner(client):
    register(client)
    headers = auth_headers(client)
    r = client.post("/api/v1/workspaces/", json={"name": "WS"}, headers=headers)
    ws_id = r.json()["id"]
    detail = client.get(f"/api/v1/workspaces/{ws_id}", headers=headers)
    members = detail.json()["members"]
    assert any(m["role"] == "owner" for m in members)


def test_non_member_forbidden(client):
    # User A creates workspace
    register(client, email="a@example.com")
    headers_a = auth_headers(client, email="a@example.com")
    ws_r = client.post("/api/v1/workspaces/", json={"name": "WS"}, headers=headers_a)
    ws_id = ws_r.json()["id"]

    # User B tries to access it
    register(client, email="b@example.com")
    headers_b = auth_headers(client, email="b@example.com")
    r = client.get(f"/api/v1/workspaces/{ws_id}", headers=headers_b)
    assert r.status_code == 403


# ── tasks ─────────────────────────────────────────────────────────────────────

def _setup_project(client):
    register(client)
    headers = auth_headers(client)
    ws = client.post("/api/v1/workspaces/", json={"name": "WS"}, headers=headers).json()
    proj = client.post(f"/api/v1/workspaces/{ws['id']}/projects/", json={"name": "Proj"}, headers=headers).json()
    return proj["id"], headers


def test_create_task(client):
    project_id, headers = _setup_project(client)
    r = client.post(f"/api/v1/projects/{project_id}/tasks/", json={"title": "Fix bug", "priority": "high"}, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Fix bug"
    assert data["priority"] == "high"
    assert data["status"] == "todo"
    assert data["project_id"] == project_id


def test_update_task_status(client):
    project_id, headers = _setup_project(client)
    task = client.post(f"/api/v1/projects/{project_id}/tasks/", json={"title": "T"}, headers=headers).json()
    r = client.patch(f"/api/v1/projects/{project_id}/tasks/{task['id']}", json={"status": "in_progress"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"
