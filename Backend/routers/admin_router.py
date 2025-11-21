from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from deps.auth_deps import get_db, require_role


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(["admin"]))])


@router.post("/assign_employee")
async def assign_employee(body: dict, db=Depends(get_db)):
    intersection_id = body.get("intersectionId")
    employee_id = body.get("employeeId")
    if not intersection_id or not employee_id:
        raise HTTPException(status_code=400, detail="intersectionId and employeeId are required")

    inter = await db.intersections.find_one({"intersectionId": intersection_id})
    now = datetime.utcnow()
    if not inter:
        inter = {
            "intersectionId": intersection_id,
            "assignedEmployees": [],
            "createdAt": now,
            "updatedAt": now,
        }
        await db.intersections.insert_one(inter)

    await db.intersections.update_one(
        {"intersectionId": intersection_id},
        {
            "$set": {"updatedAt": now},
            "$addToSet": {"assignedEmployees": employee_id},
        },
        upsert=True,
    )

    # Also push intersection into employee's assignedIntersections
    await db.users.update_one(
        {"userId": employee_id},
        {"$addToSet": {"assignedIntersections": intersection_id}, "$set": {"updatedAt": now}},
    )

    return {"status": "ok"}


@router.post("/unassign_employee")
async def unassign_employee(body: dict, db=Depends(get_db)):
    intersection_id = body.get("intersectionId")
    employee_id = body.get("employeeId")
    if not intersection_id or not employee_id:
        raise HTTPException(status_code=400, detail="intersectionId and employeeId are required")

    now = datetime.utcnow()
    await db.intersections.update_one(
        {"intersectionId": intersection_id},
        {"$pull": {"assignedEmployees": employee_id}, "$set": {"updatedAt": now}},
    )
    await db.users.update_one(
        {"userId": employee_id},
        {"$pull": {"assignedIntersections": intersection_id}, "$set": {"updatedAt": now}},
    )
    return {"status": "ok"}


@router.get("/employees")
async def employees(intersectionId: Optional[str] = Query(default=None), db=Depends(get_db)):
    if not intersectionId:
        # return all employees
        cur = db.users.find({"role": "employee"})
        out = []
        async for u in cur:
            out.append({
                "userId": u.get("userId"),
                "email": u.get("email"),
                "name": u.get("name"),
                "role": u.get("role"),
                "assignedIntersections": u.get("assignedIntersections", []),
            })
        return out

    inter = await db.intersections.find_one({"intersectionId": intersectionId})
    if not inter:
        return []
    ids = inter.get("assignedEmployees", [])
    cur = db.users.find({"userId": {"$in": ids}})
    out = []
    async for u in cur:
        out.append({
            "userId": u.get("userId"),
            "email": u.get("email"),
            "name": u.get("name"),
            "role": u.get("role"),
            "assignedIntersections": u.get("assignedIntersections", []),
        })
    return out
