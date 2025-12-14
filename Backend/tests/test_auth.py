import asyncio
from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from routers.auth_router import router as auth_router
from routers.admin_router import router as admin_router
from routers.protected_examples import router as protected_router
from deps.auth_deps import get_db
from services.auth_service import hash_password, create_access_token
from core.config import ALGORITHM, SECRET_KEY


class FakeInsertOneResult:
    def __init__(self, inserted_id=None):
        self.inserted_id = inserted_id


class FakeUpdateResult:
    def __init__(self, modified_count=1):
        self.modified_count = modified_count


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._iter = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class FakeCollection:
    def __init__(self):
        self.docs = []

    async def find_one(self, filt):
        for d in self.docs:
            ok = True
            for k, v in filt.items():
                if isinstance(v, dict) and "$in" in v:
                    if d.get(k) not in v["$in"]:
                        ok = False
                        break
                elif d.get(k) != v:
                    ok = False
                    break
            if ok:
                return d
        return None

    async def insert_one(self, doc):
        self.docs.append(doc)
        return FakeInsertOneResult()

    async def update_one(self, filt, update, upsert=False):
        d = await self.find_one(filt)
        if not d and upsert:
            d = {}
            self.docs.append(d)
        if not d:
            return FakeUpdateResult(0)
        if "$set" in update:
            for k, v in update["$set"].items():
                d[k] = v
        if "$addToSet" in update:
            for k, v in update["$addToSet"].items():
                arr = d.get(k, [])
                if v not in arr:
                    arr.append(v)
                d[k] = arr
        if "$pull" in update:
            for k, v in update["$pull"].items():
                arr = d.get(k, [])
                d[k] = [x for x in arr if x != v]
        return FakeUpdateResult(1)

    def find(self, filt):
        # very simple filter impl
        out = []
        for d in self.docs:
            ok = True
            for k, v in filt.items():
                if isinstance(v, dict) and "$in" in v:
                    if d.get(k) not in v["$in"]:
                        ok = False
                        break
                elif d.get(k) != v:
                    ok = False
                    break
            if ok:
                out.append(d)
        return FakeCursor(out)


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.intersections = FakeCollection()


def build_app(db: FakeDB) -> TestClient:
    app = FastAPI()

    async def get_test_db():
        return db

    app.dependency_overrides[get_db] = get_test_db
    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(protected_router)
    return TestClient(app)


def test_signup_login_me_and_assignment_flow():
    db = FakeDB()
    client = build_app(db)

    # Signup normal user
    r = client.post("/auth/signup", json={
        "email": "user@example.com",
        "password": "secret123",
        "name": "User One"
    })
    assert r.status_code == 200
    user_pub = r.json()
    assert user_pub["role"] == "user"

    # Login
    r = client.post("/auth/login", json={
        "email": "user@example.com",
        "password": "secret123"
    })
    assert r.status_code == 200
    token = r.json()["access_token"]

    # /me
    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == "user@example.com"

    # Create an admin directly in DB
    now = datetime.utcnow()
    admin_doc = {
        "userId": "ADMIN-1",
        "email": "admin@example.com",
        "password_hash": hash_password("adminpass"),
        "name": "Admin",
        "role": "admin",
        "assignedIntersections": [],
        "createdAt": now,
        "updatedAt": now,
    }
    asyncio.get_event_loop().run_until_complete(db.users.insert_one(admin_doc))

    # Login admin via token creation (bypass route)
    admin_token = create_access_token(
        data={"sub": admin_doc["userId"], "userId": admin_doc["userId"], "email": admin_doc["email"], "role": "admin"},
        expires_delta=timedelta(minutes=60)
    )

    # Admin creates employee
    r = client.post("/auth/signup_employee", json={
        "email": "emp@example.com",
        "password": "emp12345",
        "name": "Emp One"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    emp_user = r.json()
    emp_id = emp_user["userId"]

    # Assign employee to an intersection
    r = client.post("/admin/assign_employee", json={
        "intersectionId": "INT-001",
        "employeeId": emp_id
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

    # List employees for intersection
    r = client.get("/admin/employees", params={"intersectionId": "INT-001"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    emps = r.json()
    assert any(e["userId"] == emp_id for e in emps)
