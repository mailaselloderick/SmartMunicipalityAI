

import csv
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline


# =========================================================
# FILE PATHS
# =========================================================

DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "complaints_training.csv"
)

MODEL_PATH = (
    Path(__file__).parent
    / "models"
    / "category_model.joblib"
)


# =========================================================
# AI CONFIGURATION
# =========================================================

CONFIDENCE_THRESHOLD = 0.70

MIN_DESCRIPTION_LENGTH = 15

VAGUE_PHRASES = [
    "something strange",
    "something wrong",
    "something is happening",
    "needs attention",
    "please help",
    "not working properly",
    "there is a problem",
    "there is an issue",
    "bad situation",
    "i don't know",
    "i do not know",
]


# =========================================================
# LOAD TRAINING DATASET
# =========================================================

def load_training_examples():
    """Load labelled complaint examples from CSV."""

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Training dataset not found: {DATASET_PATH}"
        )

    examples = []

    with DATASET_PATH.open(
        mode="r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        required_columns = {"description", "category"}

        if not reader.fieldnames or not required_columns.issubset(
            set(reader.fieldnames)
        ):
            raise ValueError(
                "CSV must contain description and category columns."
            )

        for row_number, row in enumerate(reader, start=2):

            description = (
                row.get("description") or ""
            ).strip()

            category = (
                row.get("category") or ""
            ).strip()

            if not description or not category:
                raise ValueError(
                    f"Missing description or category "
                    f"on CSV row {row_number}."
                )

            examples.append((description, category))

    if len(examples) < 10:
        raise ValueError(
            "The training dataset must contain "
            "at least 10 examples."
        )

    return examples


# =========================================================
# BUILD CALIBRATED LINEAR SVM
# =========================================================

def build_model():
    """Create a calibrated Linear SVM pipeline."""

    from sklearn.svm import LinearSVC
    from sklearn.calibration import CalibratedClassifierCV

    svm_classifier = LinearSVC(
        class_weight="balanced",
        random_state=42
    )

    calibrated_svm = CalibratedClassifierCV(
        estimator=svm_classifier,
        method="sigmoid",
        cv=3
    )

    return Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                ngram_range=(1, 2),
                lowercase=True,
                strip_accents="unicode"
            )
        ),
        ("classifier", calibrated_svm)
    ])


# =========================================================
# LOAD SAVED MODEL
# =========================================================

def get_model():
    """Load saved model or train a temporary model."""

    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)

    examples = load_training_examples()

    texts, labels = zip(*examples)

    model = build_model()

    model.fit(texts, labels)

    return model


# =========================================================
# CHECK COMPLAINT DESCRIPTION
# =========================================================

def validate_description(description: str):
    """Check whether a complaint description is useful."""

    if not description or not description.strip():
        return {
            "valid": False,
            "reason": "Complaint description cannot be empty.",
            "needs_clarification": True
        }

    text = description.strip().lower()

    if len(text) < MIN_DESCRIPTION_LENGTH:
        return {
            "valid": False,
            "reason": (
                "Please provide more details about "
                "the municipal problem."
            ),
            "needs_clarification": True
        }

    if any(phrase in text for phrase in VAGUE_PHRASES):
        return {
            "valid": False,
            "reason": (
                "Your complaint is too vague. "
                "Please describe what happened, "
                "where it happened and when possible."
            ),
            "needs_clarification": True
        }

    return {
        "valid": True,
        "reason": None,
        "needs_clarification": False
    }


# =========================================================
# PREDICT MUNICIPAL COMPLAINT CATEGORY
# =========================================================

def predict_category(description: str):

    validation = validate_description(description)

    if not validation["valid"]:
        return {
            "category": None,
            "confidence": 0.0,
            "manual_classification_required": True,
            "needs_clarification": True,
            "clarification_message": validation["reason"]
        }

    model = get_model()

    prediction = model.predict([description])[0]

    probabilities = model.predict_proba([description])[0]

    confidence = float(max(probabilities))

    manual_classification_required = (
        confidence < CONFIDENCE_THRESHOLD
    )

    return {
        "category": prediction,
        "confidence": round(confidence, 3),
        "manual_classification_required": (
            manual_classification_required
        ),
        "needs_clarification": False,
        "clarification_message": (
            "Please provide more information."
            if manual_classification_required
            else None
        )
    }


# =========================================================
# PREDICT COMPLAINT PRIORITY
# =========================================================

def predict_priority(description: str):
    """Apply transparent prototype priority rules."""

    text = description.lower()

    critical_terms = [
        "burst pipe",
        "live wire",
        "electrical wire",
        "sewage overflowing",
        "road collapsed"
    ]

    high_terms = [
    "no water",
    "without water",
    "dont have water",
    "don't have water",
    "do not have water",
    "no running water",
    "water supply disrupted",
    "no electricity",
    "large pothole",
    "flood",
    "overflowing"
]

    if any(term in text for term in critical_terms):
        return (
            "critical",
            "Potential immediate public-safety or infrastructure "
            "risk; human review required."
        )

    if any(term in text for term in high_terms):
        return (
            "high",
            "Potential significant service disruption; "
            "human review recommended."
        )

    return (
        "medium",
        "Default preliminary priority; municipal staff should review."
    )


# =========================================================
# FIND POSSIBLE DUPLICATE COMPLAINTS
# =========================================================

def find_possible_duplicate(
    description: str,
    existing_descriptions: list[str],
    threshold: float = 0.72
):
    """Find a potentially similar existing complaint."""

    if not existing_descriptions:
        return None

    from sklearn.metrics.pairwise import cosine_similarity

    corpus = [description] + existing_descriptions

    matrix = TfidfVectorizer().fit_transform(corpus)

    scores = cosine_similarity(
        matrix[0:1],
        matrix[1:]
    ).flatten()

    best_index = int(scores.argmax())

    score = float(scores[best_index])

    if score >= threshold:
        return {
            "index": best_index,
            "similarity": round(score, 3)
        }

    return None


# =========================================================
# LOAD TRAINING EXAMPLES
# =========================================================

TRAINING_EXAMPLES = load_training_examples()
