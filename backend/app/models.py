
from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Text,
    DateTime,
    Float,
    ForeignKey,
    Boolean
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    complaints: Mapped[list["Complaint"]] = relationship(
        back_populates="category"
    )


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_number: Mapped[str] = mapped_column(
        String(24), unique=True, index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )

    predicted_category: Mapped[str | None] = mapped_column(
        String(80), nullable=True
    )

    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(30), default="submitted")

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    area: Mapped[str | None] = mapped_column(String(120), nullable=True)

    reporter_name: Mapped[str] = mapped_column(String(120))
    reporter_contact: Mapped[str | None] = mapped_column(
        String(120), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    category: Mapped[Category | None] = relationship(
        back_populates="complaints"
    )

    updates: Mapped[list["ComplaintUpdate"]] = relationship(
        back_populates="complaint",
        cascade="all, delete-orphan"
    )


class ComplaintUpdate(Base):
    __tablename__ = "complaint_updates"

    id: Mapped[int] = mapped_column(primary_key=True)

    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id")
    )

    old_status: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )

    new_status: Mapped[str] = mapped_column(String(30))
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_by: Mapped[str] = mapped_column(
        String(120), default="system"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    complaint: Mapped[Complaint] = relationship(
        back_populates="updates"
    )


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)

    username: Mapped[str] = mapped_column(
        String(80), unique=True, index=True, nullable=False
    )

    full_name: Mapped[str] = mapped_column(
        String(120), nullable=False
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


