from fastapi import APIRouter, Depends

from deps.auth_deps import get_current_user, require_role


router = APIRouter(prefix="", tags=["protected-examples"])


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    # Remove sensitive fields
    return {
        "userId": current_user.get("userId"),
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "role": current_user.get("role"),
        "assignedIntersections": current_user.get("assignedIntersections", []),
    }


@router.get("/employee/dashboard", dependencies=[Depends(require_role(["employee", "admin"]))])
async def employee_dashboard(current_user=Depends(get_current_user)):
    return {"message": "Welcome to employee dashboard", "userId": current_user.get("userId")}
