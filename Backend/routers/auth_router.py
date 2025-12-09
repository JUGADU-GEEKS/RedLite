import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from core.config import get_access_token_expires
from deps.auth_deps import get_current_user, get_db
from models.user import UserIn, UserPublic
from services.auth_service import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup", response_model=UserPublic)
async def signup(payload: UserIn, db=Depends(get_db)):
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    now = datetime.utcnow()
    user_doc = {
        "userId": f"USER-{uuid.uuid4().hex[:8].upper()}",
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "mobile": payload.mobile,
        "role": payload.role or "user",
        "assignedIntersections": [],
        "createdAt": now,
        "updatedAt": now,
    }
    
    if payload.role == "ambulance_driver" and payload.ambulanceInfo:
        user_doc["ambulanceInfo"] = payload.ambulanceInfo.dict()
        # Auto-authorize for demo purposes if not specified
        if "authorized" not in user_doc["ambulanceInfo"]:
             user_doc["ambulanceInfo"]["authorized"] = True

    await db.users.insert_one(user_doc)
    return UserPublic(**{
        "userId": user_doc["userId"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "mobile": user_doc.get("mobile"),
        "role": user_doc["role"],
        "assignedIntersections": user_doc["assignedIntersections"],
        "ambulanceInfo": user_doc.get("ambulanceInfo")
    })


@router.post("/login")
async def login(payload: LoginIn, db=Depends(get_db)):
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("suspended", False):
        raise HTTPException(status_code=403, detail="Account suspended due to repeated fake requests.")
    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={
            "sub": user["userId"],
            "userId": user["userId"],
            "email": user["email"],
            "role": user.get("role", "user"),
        },
        expires_delta=get_access_token_expires(),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "userId": user["userId"],
            "email": user["email"],
            "name": user["name"],
            "mobile": user.get("mobile"),
            "role": user.get("role", "user"),
            "assignedIntersections": user.get("assignedIntersections", []),
            "ambulanceInfo": user.get("ambulanceInfo"),
            "fault_count": user.get("fault_count", 0),
            "suspended": user.get("suspended", False),
        },
    }



@router.get('/profile')
async def profile(current_user=Depends(get_current_user)):
    # If userId is provided as a query param, fetch that user's profile (for admin dashboard phone lookup)
    from fastapi import Request
    def get_query_user_id(request: Request):
        try:
            return request.query_params.get('userId')
        except Exception:
            return None

    import inspect
    frame = inspect.currentframe()
    request = None
    while frame:
        if 'request' in frame.f_locals:
            request = frame.f_locals['request']
            break
        frame = frame.f_back

    query_user_id = get_query_user_id(request) if request else None
    if query_user_id:
        # Only allow admin/employee to fetch other users' profiles
        allowed_roles = ['admin', 'employee']
        if current_user.get('role') not in allowed_roles:
            from fastapi import Response
            return Response(status_code=403, content='Forbidden')
        from deps.auth_deps import get_db
        db = await get_db()
        user_doc = await db.users.find_one({'userId': query_user_id})
        if not user_doc:
            return {'status': 'error', 'message': 'User not found', 'user': None}
        return {
            'status': 'success',
            'user': {
                'userId': user_doc.get('userId'),
                'email': user_doc.get('email'),
                'name': user_doc.get('name'),
                'mobile': user_doc.get('mobile'),
                'role': user_doc.get('role'),
                'ambulanceInfo': user_doc.get('ambulanceInfo'),
                'fault_count': user_doc.get('fault_count', 0),
                'suspended': user_doc.get('suspended', False)
            }
        }
    # Default: Return authenticated user's profile
    return {
        'status': 'success',
        'user': {
            'userId': current_user.get('userId'),
            'email': current_user.get('email'),
            'name': current_user.get('name'),
            'mobile': current_user.get('mobile'),
            'role': current_user.get('role'),
            'ambulanceInfo': current_user.get('ambulanceInfo'),
            'fault_count': current_user.get('fault_count', 0),
            'suspended': current_user.get('suspended', False)
        }
    }


@router.get('/echallans')
async def get_echallans(current_user=Depends(get_current_user)):
    # Placeholder implementation: return empty list and structure for future implementation
    return {
        'status': 'success',
        'items': []
    }


@router.post("/signup_employee", response_model=UserPublic)
async def signup_employee(
    payload: UserIn,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    now = datetime.utcnow()
    user_doc = {
        "userId": f"EMP-{uuid.uuid4().hex[:8].upper()}",
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": "employee",
        "assignedIntersections": [],
        "createdAt": now,
        "updatedAt": now,
    }
    await db.users.insert_one(user_doc)
    return UserPublic(**{
        "userId": user_doc["userId"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "role": user_doc["role"],
        "assignedIntersections": user_doc["assignedIntersections"],
    })
