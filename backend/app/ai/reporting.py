
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..models import Complaint, ComplaintUpdate


def generate_complaint_report(
    db: Session,
    days: int = 30
) -> dict:
    """
    Generate an AI-assisted municipal complaint report.

    Uses existing complaint records and produces:
    - Complaint statistics
    - Category analysis
    - Priority analysis
    - Area analysis
    - Resolution performance
    - Recurring problem identification
    - Administrative recommendations
    """

    if not isinstance(days, int) or not 1 <= days <= 365:
        raise ValueError("Days must be between 1 and 365.")

    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    complaints = (
        db.query(Complaint)
        .filter(
            Complaint.created_at >= start_date,
            Complaint.created_at <= end_date
        )
        .order_by(Complaint.created_at.desc())
        .all()
    )

    total = len(complaints)

    if total == 0:
        return {
            "period_days": days,
            "generated_at": end_date.isoformat(),
            "total_complaints": 0,
            "summary": (
                f"No complaints were recorded during the last {days} days."
            ),
            "category_analysis": [],
            "priority_analysis": {},
            "status_analysis": {},
            "area_analysis": [],
            "recurring_problems": [],
            "resolution_performance": {
                "resolved": 0,
                "unresolved": 0,
                "resolution_rate": 0
            },
            "recommendations": [
                "Continue monitoring incoming municipal complaints."
            ]
        }

    categories = Counter(
        (c.predicted_category or "Unclassified")
        for c in complaints
    )

    priorities = Counter(
        (c.priority or "medium").lower()
        for c in complaints
    )

    statuses = Counter(
        (c.status or "unknown").lower()
        for c in complaints
    )

    areas = Counter(
        (c.area or "Area not specified").strip()
        for c in complaints
    )

    resolved_statuses = {"resolved", "closed"}

    resolved = sum(
        1 for c in complaints
        if (c.status or "").lower() in resolved_statuses
    )

    unresolved = total - resolved

    resolution_rate = round(
        (resolved / total) * 100, 2
    )

    category_analysis = [
        {
            "category": name,
            "count": count,
            "percentage": round(count / total * 100, 2)
        }
        for name, count in categories.most_common()
    ]

    area_analysis = [
        {
            "area": name,
            "complaint_count": count
        }
        for name, count in areas.most_common(10)
    ]

    recurring_problems = []

    for category, count in categories.most_common():
        if count >= 3:
            recurring_problems.append({
                "category": category,
                "complaint_count": count,
                "message": (
                    f"{category} has received {count} complaints "
                    f"during the reporting period."
                )
            })

    recommendations = []

    if priorities.get("critical", 0) > 0:
        recommendations.append(
            "Review critical-priority complaints immediately "
            "and confirm appropriate municipal action."
        )

    if priorities.get("high", 0) > 0:
        recommendations.append(
            "Prioritise outstanding high-priority complaints."
        )

    if unresolved > 0:
        recommendations.append(
            f"Review the {unresolved} unresolved complaints "
            "and assign appropriate municipal teams."
        )

    if resolution_rate < 50:
        recommendations.append(
            "Investigate the low resolution rate and identify "
            "operational bottlenecks."
        )

    if area_analysis and area_analysis[0]["complaint_count"] >= 3:
        recommendations.append(
            f"Investigate recurring complaints in "
            f"{area_analysis[0]['area']}."
        )

    if recurring_problems:
        recommendations.append(
            "Review recurring complaint categories and consider "
            "preventative maintenance or service improvements."
        )

    if not recommendations:
        recommendations.append(
            "Continue monitoring complaint volumes and "
            "municipal service performance."
        )

    summary = (
        f"During the last {days} days, the municipality recorded "
        f"{total} complaints. The most reported category was "
        f"{categories.most_common(1)[0][0]}. "
        f"{resolved} complaints were resolved, representing a "
        f"{resolution_rate}% resolution rate. "
        f"{unresolved} complaints remain unresolved."
    )

    return {
        "period_days": days,
        "generated_at": end_date.isoformat(),
        "total_complaints": total,
        "summary": summary,
        "category_analysis": category_analysis,
        "priority_analysis": dict(priorities),
        "status_analysis": dict(statuses),
        "area_analysis": area_analysis,
        "recurring_problems": recurring_problems,
        "resolution_performance": {
            "resolved": resolved,
            "unresolved": unresolved,
            "resolution_rate": resolution_rate
        },
        "recommendations": recommendations
    }
