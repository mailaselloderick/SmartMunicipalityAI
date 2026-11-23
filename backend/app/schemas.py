

from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


# =========================================================
# ADMINISTRATOR LOGIN
# =========================================================

class AdminLoginRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=80
    )

    password: str = Field(
        min_length=8,
        max_length=128
    )


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    is_active: bool


# =========================================================
# CREATE COMPLAINT
# =========================================================

class ComplaintCreate(BaseModel):
    title: str = Field(min_length=5, max_length=160)
    description: str = Field(min_length=15, max_length=4000)

    reporter_name: str = Field(
        min_length=2,
        max_length=120
    )

    reporter_contact: str | None = Field(
        default=None,
        max_length=120
    )

    area: str | None = Field(
        default=None,
        max_length=120
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180
    )


# =========================================================
# UPDATE COMPLAINT STATUS
# =========================================================

class ComplaintStatusUpdate(BaseModel):
    status: str = Field(
        pattern="^(submitted|under_review|assigned|in_progress|resolved|rejected)$"
    )

    comment: str | None = Field(
        default=None,
        max_length=2000
    )

    updated_by: str = Field(
        default="municipal_official",
        max_length=120
    )


# =========================================================
# MANUAL CATEGORY CORRECTION
# =========================================================

class ComplaintCategoryUpdate(BaseModel):
    category: str = Field(
        min_length=3,
        max_length=80
    )

    comment: str | None = Field(
        default=None,
        max_length=2000
    )

    updated_by: str = Field(
        default="municipal_official",
        max_length=120
    )


# =========================================================
# MANUAL PRIORITY CORRECTION
# =========================================================

class ComplaintPriorityUpdate(BaseModel):
    priority: str = Field(
        pattern="^(low|medium|high|critical)$"
    )

    comment: str | None = Field(
        default=None,
        max_length=2000
    )

    updated_by: str = Field(
        default="municipal_official",
        max_length=120
    )


# =========================================================
# COMPLAINT RESPONSE
# =========================================================

class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_number: str
    title: str
    description: str
    predicted_category: str | None
    priority: str
    status: str
    area: str | None
    latitude: float | None
    longitude: float | None
    photo_url: str | None = None
    reporter_name: str
    created_at: datetime


# =========================================================
# AI ANALYSIS REQUEST
# =========================================================

class AIAnalysisRequest(BaseModel):
    description: str = Field(
        min_length=10,
        max_length=4000
    )

    area: str | None = None
