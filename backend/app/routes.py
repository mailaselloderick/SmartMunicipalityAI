
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from pathlib import Path
import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    File,
    Form,
    UploadFile
)
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from .database import get_db
from .models import Complaint, ComplaintUpdate, Category, AdminUser

from .schemas import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintStatusUpdate,
    ComplaintCategoryUpdate,
    ComplaintPriorityUpdate,
    AIAnalysisRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminOut,
)

from .auth import (
    verify_password,
    create_access_token,
    get_current_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

from .ai.engine import (
    predict_category,
    predict_priority,
    find_possible_duplicate,
)

from .ai.reporting import generate_complaint_report
from .ai.assistant import chat_with_assistant


router = APIRouter(prefix="/api/v1")


# =========================================================
# AI MUNICIPAL ASSISTANT REQUEST MODEL
# =========================================================

class AssistantChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000
    )


# =========================================================
# CONFIGURATION
# =========================================================

ALLOWED_CATEGORIES = {
    "Electricity",
    "Public Facilities",
    "Roads and Transport",
    "Waste Management",
    "Water and Sanitation",
}

ALLOWED_PRIORITIES = {
    "low",
    "medium",
    "high",
    "critical",
}

MAX_PHOTO_SIZE = 5 * 1024 * 1024

ALLOWED_PHOTO_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

UPLOAD_DIR = (
    Path(__file__).resolve().parent.parent
    / "uploads"
    / "complaints"
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# ADMINISTRATOR LOGIN
# =========================================================

@router.post(
    "/auth/login",
    response_model=AdminLoginResponse
)
def admin_login(
    payload: AdminLoginRequest,
    db: Session = Depends(get_db)
):
    admin = (
        db.query(AdminUser)
        .filter(AdminUser.username == payload.username)
        .first()
    )

    if (
        admin is None
        or not admin.is_active
        or not verify_password(
            payload.password,
            admin.hashed_password
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password."
        )

    access_token = create_access_token(
        data={"sub": str(admin.id)},
        expires_delta=timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


# =========================================================
# GET CURRENT ADMINISTRATOR
# =========================================================

@router.get(
    "/auth/me",
    response_model=AdminOut
)
def get_admin_profile(
    current_admin: AdminUser = Depends(get_current_admin)
):
    return current_admin


# =========================================================
# HELPER: FIND EXISTING DUPLICATE COMPLAINT
# =========================================================

def get_duplicate_complaint(description: str, db: Session):
    existing_complaints = (
        db.query(Complaint)
        .order_by(Complaint.id.asc())
        .all()
    )

    existing_descriptions = [
        complaint.description
        for complaint in existing_complaints
    ]

    duplicate = find_possible_duplicate(
        description,
        existing_descriptions
    )

    if duplicate is None:
        return None

    matched_complaint = existing_complaints[
        duplicate["index"]
    ]

    return {
        "complaint_id": matched_complaint.id,
        "reference_number": matched_complaint.reference_number,
        "title": matched_complaint.title,
        "status": matched_complaint.status,
        "similarity": duplicate["similarity"]
    }


# =========================================================
# AI MUNICIPAL ASSISTANT - DATABASE COMPLAINT TRACKING
# =========================================================

@router.post("/ai/assistant/chat")
def municipal_assistant_chat(
    payload: AssistantChatRequest,
    db: Session = Depends(get_db)
):
    message = payload.message.strip()

    # ---------------------------------------------
    # FIND COMPLAINT REFERENCE NUMBER
    # ---------------------------------------------

    reference_match = re.search(
        r"SMA-\d{6}-[A-Z0-9]{6}",
        message,
        re.IGNORECASE
    )

    # If no reference is provided, use the normal
    # municipal assistant knowledge base.
    if not reference_match:
        return chat_with_assistant(message)

    reference_number = reference_match.group(0).upper()

    # ---------------------------------------------
    # FIND EMAIL ADDRESS OR PHONE NUMBER
    # ---------------------------------------------

    email_match = re.search(
        r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}",
        message
    )

    phone_match = re.search(
        r"(?<!\w)(?:\+27|0)\d[\d\s-]{7,13}\d(?!\w)",
        message
    )

    if email_match:
        supplied_contact = email_match.group(0).strip()

    elif phone_match:
        supplied_contact = phone_match.group(0).strip()

    else:
        return {
            "success": True,
            "assistant": "SmartMunicipality Assistant",
            "reply": (
                "I found your complaint reference number.\n\n"
                "For privacy protection, please provide the "
                "contact number or email address you used "
                "when submitting the complaint.\n\n"
                "Please include both details in your next "
                "message so I can verify your complaint."
            ),
            "suggestions": [
                "How do I submit a complaint?",
                "What does In Progress mean?"
            ]
        }

    # ---------------------------------------------
    # LOOK UP COMPLAINT
    # ---------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.reference_number == reference_number
        )
        .first()
    )

    if (
        complaint is None
        or not complaint.reporter_contact
    ):
        return {
            "success": True,
            "assistant": "SmartMunicipality Assistant",
            "reply": (
                "I could not verify those complaint details. "
                "Please check your reference number and "
                "registered contact information."
            ),
            "suggestions": [
                "How do I find my complaint reference number?"
            ]
        }

    # ---------------------------------------------
    # VERIFY REGISTERED CONTACT
    # ---------------------------------------------

    stored_contact = complaint.reporter_contact.strip()

    is_verified = (
        supplied_contact.casefold()
        == stored_contact.casefold()
    )

    # Allow phone numbers with spaces, hyphens,
    # or the South African +27 country prefix.
    if not is_verified:

        supplied_digits = re.sub(
            r"\D",
            "",
            supplied_contact
        )

        stored_digits = re.sub(
            r"\D",
            "",
            stored_contact
        )

        if (
            supplied_digits.startswith("27")
            and len(supplied_digits) == 11
        ):
            supplied_digits = (
                "0" + supplied_digits[2:]
            )

        if (
            stored_digits.startswith("27")
            and len(stored_digits) == 11
        ):
            stored_digits = (
                "0" + stored_digits[2:]
            )

        is_verified = (
            bool(supplied_digits)
            and supplied_digits == stored_digits
        )

    if not is_verified:
        return {
            "success": True,
            "assistant": "SmartMunicipality Assistant",
            "reply": (
                "I could not verify those complaint details. "
                "Please check your reference number and "
                "registered contact information."
            ),
            "suggestions": []
        }

    # ---------------------------------------------
    # GET COMPLAINT STATUS HISTORY
    # ---------------------------------------------

    updates = (
        db.query(ComplaintUpdate)
        .filter(
            ComplaintUpdate.complaint_id == complaint.id
        )
        .order_by(
            ComplaintUpdate.created_at.asc()
        )
        .all()
    )

    history = []

    for update in updates:
        history.append({
            "status": update.new_status,
            "date": (
                update.created_at.isoformat()
                if update.created_at else None
            )
        })

    # ---------------------------------------------
    # FORMAT CURRENT STATUS
    # ---------------------------------------------

    current_status = (
        complaint.status
        .replace("_", " ")
        .title()
    )

    # ---------------------------------------------
    # RETURN VERIFIED COMPLAINT INFORMATION
    # ---------------------------------------------

    return {
        "success": True,
        "assistant": "SmartMunicipality Assistant",
        "reply": (
            "I successfully verified your complaint.\n\n"
            f"Reference number: {complaint.reference_number}\n"
            f"Title: {complaint.title}\n"
            f"Category: {complaint.predicted_category or 'Not assigned'}\n"
            f"Area: {complaint.area or 'Not provided'}\n"
            f"Priority: {complaint.priority}\n"
            f"Current status: {current_status}\n\n"
            "You can use your reference number when "
            "following up on this complaint."
        ),
        "suggestions": [
            "What does this complaint status mean?",
            "How do I report another municipal problem?"
        ],
        "complaint": {
            "reference_number": complaint.reference_number,
            "status": complaint.status,
            "history": history
        }
    }


# =========================================================
# AI COMPLAINT ANALYSIS
# =========================================================

@router.post("/ai/analyse")
def analyse_complaint(
    payload: AIAnalysisRequest,
    db: Session = Depends(get_db)
):
    prediction = predict_category(payload.description)

    priority, explanation = predict_priority(
        payload.description
    )

    duplicate = get_duplicate_complaint(
        payload.description,
        db
    )

    duplicate_complaint = None

    if duplicate is not None:
        duplicate_complaint = {
            "complaint_id": duplicate["complaint_id"],
            "reference_number": duplicate["reference_number"],
            "title": duplicate["title"],
            "status": duplicate["status"]
        }

    return {
        "predicted_category": prediction["category"],
        "category_confidence": prediction["confidence"],
        "manual_classification_required": (
            prediction["manual_classification_required"]
        ),
        "needs_clarification": prediction["needs_clarification"],
        "clarification_message": prediction["clarification_message"],
        "predicted_priority": priority,
        "priority_explanation": explanation,
        "possible_duplicate": duplicate is not None,
        "duplicate_similarity": (
            duplicate["similarity"] if duplicate else None
        ),
        "duplicate_complaint": duplicate_complaint,
        "human_review_required": True
    }


# =========================================================
# CREATE A NEW COMPLAINT WITH OPTIONAL PHOTO
# =========================================================

@router.post(
    "/complaints",
    response_model=ComplaintOut,
    status_code=201
)
async def create_complaint(
    title: str = Form(..., min_length=5, max_length=160),
    description: str = Form(..., min_length=15, max_length=4000),
    reporter_name: str = Form(..., min_length=2, max_length=120),
    reporter_contact: str | None = Form(default=None, max_length=120),
    area: str | None = Form(default=None, max_length=120),
    latitude: float | None = Form(default=None, ge=-90, le=90),
    longitude: float | None = Form(default=None, ge=-180, le=180),
    photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db)
):
    saved_photo_path = None

    try:
        # ---------------------------------------------
        # VALIDATE PHOTO
        # ---------------------------------------------

        photo_url = None

        if photo is not None and photo.filename:
            extension = ALLOWED_PHOTO_TYPES.get(
                photo.content_type
            )

            if extension is None:
                raise HTTPException(
                    status_code=415,
                    detail=(
                        "Unsupported image format. "
                        "Please upload JPG, PNG or WEBP."
                    )
                )

            photo_content = await photo.read(
                MAX_PHOTO_SIZE + 1
            )

            if len(photo_content) > MAX_PHOTO_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="Photo must not exceed 5 MB."
                )

            if not photo_content:
                raise HTTPException(
                    status_code=400,
                    detail="The uploaded photo is empty."
                )

            # Basic file signature verification.
            valid_signatures = {
                "image/jpeg": photo_content.startswith(b"\xff\xd8\xff"),
                "image/png": photo_content.startswith(b"\x89PNG\r\n\x1a\n"),
                "image/webp": (
                    len(photo_content) >= 12
                    and photo_content.startswith(b"RIFF")
                    and photo_content[8:12] == b"WEBP"
                )
            }

            if not valid_signatures.get(
                photo.content_type,
                False
            ):
                raise HTTPException(
                    status_code=415,
                    detail="The uploaded file is not a valid image."
                )

            generated_filename = (
                uuid4().hex + extension
            )

            saved_photo_path = (
                UPLOAD_DIR / generated_filename
            )

            with saved_photo_path.open("wb") as image_file:
                image_file.write(photo_content)

            photo_url = (
                f"/uploads/complaints/{generated_filename}"
            )

        # ---------------------------------------------
        # AI CLASSIFICATION
        # ---------------------------------------------

        prediction = predict_category(description)

        if prediction["needs_clarification"]:
            raise HTTPException(
                status_code=422,
                detail=prediction["clarification_message"]
            )

        # ---------------------------------------------
        # DUPLICATE DETECTION
        # ---------------------------------------------

        duplicate = get_duplicate_complaint(
            description,
            db
        )

        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": (
                        "A similar complaint already exists. "
                        "Please check the existing report before "
                        "submitting another one."
                    ),
                    "existing_complaint": {
                        "complaint_id": duplicate["complaint_id"],
                        "reference_number": duplicate["reference_number"],
                        "title": duplicate["title"],
                        "status": duplicate["status"]
                    },
                    "similarity": duplicate["similarity"]
                }
            )

        # ---------------------------------------------
        # AI PRIORITY PREDICTION
        # ---------------------------------------------

        category_name = prediction["category"]

        priority, _ = predict_priority(description)

        # ---------------------------------------------
        # FIND OR CREATE CATEGORY
        # ---------------------------------------------

        category = (
            db.query(Category)
            .filter(Category.name == category_name)
            .first()
        )

        if category is None:
            category = Category(name=category_name)
            db.add(category)
            db.flush()

        # ---------------------------------------------
        # GENERATE REFERENCE NUMBER
        # ---------------------------------------------

        reference = (
            "SMA-"
            + datetime.now(timezone.utc).strftime("%y%m%d")
            + "-"
            + uuid4().hex[:6].upper()
        )

        # ---------------------------------------------
        # SAVE COMPLAINT
        # ---------------------------------------------

        complaint = Complaint(
            reference_number=reference,
            title=title,
            description=description,
            reporter_name=reporter_name,
            reporter_contact=reporter_contact,
            area=area,
            latitude=latitude,
            longitude=longitude,
            photo_url=photo_url,
            category_id=category.id,
            predicted_category=category_name,
            priority=priority,
            status="submitted"
        )

        db.add(complaint)
        db.flush()

        db.add(
            ComplaintUpdate(
                complaint_id=complaint.id,
                old_status=None,
                new_status="submitted",
                comment=(
                    "Complaint received by the system. "
                    "AI suggestions require human review."
                ),
                updated_by="system"
            )
        )

        db.commit()
        db.refresh(complaint)

        return complaint

    except HTTPException:
        db.rollback()

        if saved_photo_path and saved_photo_path.exists():
            saved_photo_path.unlink()

        raise

    except Exception:
        db.rollback()

        if saved_photo_path and saved_photo_path.exists():
            saved_photo_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Unable to submit complaint. Please try again."
        )

    finally:
        if photo is not None:
            await photo.close()


# =========================================================
# LIST COMPLAINTS
# =========================================================

@router.get(
    "/complaints",
    response_model=list[ComplaintOut]
)
def list_complaints(
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)

    if status:
        query = query.filter(
            Complaint.status == status
        )

    return (
        query
        .order_by(Complaint.created_at.desc())
        .limit(limit)
        .all()
    )


# =========================================================
# GET A SINGLE COMPLAINT
# =========================================================

@router.get(
    "/complaints/{complaint_id}",
    response_model=ComplaintOut
)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db)
):
    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id)
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    return complaint


# =========================================================
# GET COMPLAINT STATUS HISTORY
# =========================================================

@router.get("/complaints/{complaint_id}/history")
def get_complaint_history(
    complaint_id: int,
    db: Session = Depends(get_db)
):
    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id)
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    updates = (
        db.query(ComplaintUpdate)
        .filter(
            ComplaintUpdate.complaint_id == complaint_id
        )
        .order_by(ComplaintUpdate.created_at.asc())
        .all()
    )

    return {
        "complaint_id": complaint.id,
        "reference_number": complaint.reference_number,
        "current_status": complaint.status,
        "history": [
            {
                "id": update.id,
                "old_status": update.old_status,
                "new_status": update.new_status,
                "comment": update.comment,
                "updated_by": update.updated_by,
                "created_at": update.created_at
            }
            for update in updates
        ]
    }


# =========================================================
# MANUALLY CORRECT COMPLAINT CATEGORY
# ADMINISTRATOR ACCESS REQUIRED
# =========================================================

@router.patch(
    "/complaints/{complaint_id}/category",
    response_model=ComplaintOut
)
def update_complaint_category(
    complaint_id: int,
    payload: ComplaintCategoryUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    category_name = payload.category.strip()

    if category_name not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Invalid complaint category.",
                "allowed_categories": sorted(ALLOWED_CATEGORIES)
            }
        )

    old_category = complaint.predicted_category

    if old_category == category_name:
        raise HTTPException(
            status_code=400,
            detail="Complaint already has this category."
        )

    category = (
        db.query(Category)
        .filter(Category.name == category_name)
        .first()
    )

    if category is None:
        category = Category(name=category_name)
        db.add(category)
        db.flush()

    complaint.category_id = category.id
    complaint.predicted_category = category_name
    complaint.updated_at = datetime.now(timezone.utc)

    history_comment = (
        f"Category changed from '{old_category}' "
        f"to '{category_name}'."
    )

    if payload.comment:
        history_comment += f" Reason: {payload.comment}"

    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            old_status=complaint.status,
            new_status=complaint.status,
            comment=history_comment,
            updated_by=current_admin.full_name
        )
    )

    db.commit()
    db.refresh(complaint)

    return complaint


# =========================================================
# MANUALLY CORRECT COMPLAINT PRIORITY
# ADMINISTRATOR ACCESS REQUIRED
# =========================================================

@router.patch(
    "/complaints/{complaint_id}/priority",
    response_model=ComplaintOut
)
def update_complaint_priority(
    complaint_id: int,
    payload: ComplaintPriorityUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    new_priority = payload.priority.lower().strip()

    if new_priority not in ALLOWED_PRIORITIES:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Invalid complaint priority.",
                "allowed_priorities": sorted(ALLOWED_PRIORITIES)
            }
        )

    old_priority = complaint.priority

    if old_priority == new_priority:
        raise HTTPException(
            status_code=400,
            detail="Complaint already has this priority."
        )

    complaint.priority = new_priority
    complaint.updated_at = datetime.now(timezone.utc)

    history_comment = (
        f"Priority changed from '{old_priority}' "
        f"to '{new_priority}'."
    )

    if payload.comment:
        history_comment += f" Reason: {payload.comment}"

    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            old_status=complaint.status,
            new_status=complaint.status,
            comment=history_comment,
            updated_by=current_admin.full_name
        )
    )

    db.commit()
    db.refresh(complaint)

    return complaint


# =========================================================
# UPDATE COMPLAINT STATUS
# ADMINISTRATOR ACCESS REQUIRED
# =========================================================

@router.patch(
    "/complaints/{complaint_id}/status",
    response_model=ComplaintOut
)
def update_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id)
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    old_status = complaint.status

    if old_status == payload.status:
        raise HTTPException(
            status_code=400,
            detail="Complaint already has this status."
        )

    complaint.status = payload.status
    complaint.updated_at = datetime.now(timezone.utc)

    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            old_status=old_status,
            new_status=payload.status,
            comment=payload.comment,
            updated_by=current_admin.full_name
        )
    )

    db.commit()
    db.refresh(complaint)

    return complaint


# =========================================================
# IMPROVED ANALYTICS SUMMARY
# =========================================================

@router.get("/analytics/summary")
def analytics_summary(
    db: Session = Depends(get_db)
):
    total = (
        db.query(func.count(Complaint.id)).scalar() or 0
    )

    by_status = dict(
        db.query(
            Complaint.status,
            func.count(Complaint.id)
        )
        .group_by(Complaint.status)
        .all()
    )

    by_category = dict(
        db.query(
            Complaint.predicted_category,
            func.count(Complaint.id)
        )
        .group_by(Complaint.predicted_category)
        .all()
    )

    by_priority = dict(
        db.query(
            Complaint.priority,
            func.count(Complaint.id)
        )
        .group_by(Complaint.priority)
        .all()
    )

    high_priority = (
        db.query(func.count(Complaint.id))
        .filter(Complaint.priority == "high")
        .scalar() or 0
    )

    critical_priority = (
        db.query(func.count(Complaint.id))
        .filter(Complaint.priority == "critical")
        .scalar() or 0
    )

    urgent_complaints = high_priority + critical_priority

    resolved = (
        db.query(func.count(Complaint.id))
        .filter(Complaint.status.in_(["resolved", "closed"]))
        .scalar() or 0
    )

    unresolved = total - resolved

    resolution_rate = (
        round((resolved / total) * 100, 2)
        if total > 0 else 0
    )

    return {
        "total_complaints": total,
        "by_status": by_status,
        "by_category": by_category,
        "by_priority": by_priority,
        "priority_summary": {
            "high_priority": high_priority,
            "critical_priority": critical_priority,
            "urgent_complaints": urgent_complaints
        },
        "resolution_summary": {
            "resolved": resolved,
            "unresolved": unresolved,
            "resolution_rate": resolution_rate
        }
    }


# =========================================================
# AI-ASSISTED MUNICIPAL REPORTING
# ADMINISTRATOR ACCESS REQUIRED
# =========================================================

@router.get("/analytics/ai-report")
def ai_complaint_report(
    days: int = Query(default=30, ge=1, le=365),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        report = generate_complaint_report(
            db=db,
            days=days
        )

        return {
            "success": True,
            "generated_by": current_admin.full_name,
            "report": report
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc)
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate the AI-assisted report."
        )

