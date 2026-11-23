
import re

# =========================================================
# SMARTMUNICIPALITY AI - ENHANCED MUNICIPAL ASSISTANT
# =========================================================

ASSISTANT_NAME = "SmartMunicipality Assistant"

WELCOME_MESSAGE = (
    "Hello! I'm your SmartMunicipality Assistant. "
    "I can help you report municipal problems, understand "
    "complaint categories, provide reporting guidance and "
    "understand complaint statuses. How can I help you?"
)


# =========================================================
# MUNICIPAL CATEGORY KNOWLEDGE BASE
# =========================================================

KNOWLEDGE_BASE = {
    "Water and Sanitation": {
        "keywords": [
            "water", "water leak", "leaking tap",
            "burst pipe", "broken pipe", "no water",
            "water outage", "water interruption",
            "water supply", "low water pressure",
            "dry tap", "water shortage", "water meter",
            "water pipe", "pipe leaking"
        ],
        "response": (
            "I can help you report a water problem.\n\n"
            "1. Open the complaint reporting form.\n"
            "2. Select 'Water and Sanitation'.\n"
            "3. Describe the issue, such as a leaking pipe, "
            "burst pipe or water interruption.\n"
            "4. Enter the affected street, suburb or area.\n"
            "5. Attach a photograph if it is safe.\n"
            "6. Submit your complaint.\n\n"
            "Keep your complaint reference number for future "
            "follow-up."
        ),
        "suggestions": [
            "How do I report a burst pipe?",
            "What information must I provide?",
            "Can I upload a photograph?"
        ]
    },

    "Electricity": {
        "keywords": [
            "electricity", "electric", "power outage",
            "no power", "no electricity", "blackout",
            "load shedding", "electrical fault",
            "streetlight", "street lights",
            "broken streetlight", "power failure",
            "electricity interruption", "power cut"
        ],
        "response": (
            "I can help you report an electricity problem.\n\n"
            "1. Select 'Electricity' on the complaint form.\n"
            "2. Describe the electrical problem.\n"
            "3. Explain whether it affects one property "
            "or an entire area.\n"
            "4. Provide the affected location.\n"
            "5. Attach a photograph only if it is safe.\n"
            "6. Submit your complaint.\n\n"
            "Safety: Stay away from exposed wires, damaged "
            "electrical equipment and fallen power lines. "
            "Never attempt electrical repairs yourself."
        ),
        "suggestions": [
            "How do I report a power outage?",
            "How do I report a broken streetlight?",
            "What information must I provide?"
        ]
    },

    "Roads and Transport": {
        "keywords": [
            "road", "roads", "pothole", "potholes",
            "traffic light", "traffic lights",
            "traffic signal", "damaged road",
            "road damage", "broken road",
            "damaged street", "road maintenance",
            "broken traffic light", "road sign",
            "missing road sign"
        ],
        "response": (
            "I can help you report a road or transport problem.\n\n"
            "1. Select 'Roads and Transport'.\n"
            "2. Describe the problem, such as a pothole, "
            "damaged road or faulty traffic light.\n"
            "3. Include the street name and nearby landmarks.\n"
            "4. Provide the affected area.\n"
            "5. Attach a photograph if safe.\n"
            "6. Submit your complaint."
        ),
        "suggestions": [
            "How do I report a pothole?",
            "How do I report a broken traffic light?",
            "Can I provide a location on the map?"
        ]
    },

    "Waste Management": {
        "keywords": [
            "waste", "rubbish", "garbage", "refuse",
            "trash", "bin collection", "missed collection",
            "waste collection", "illegal dumping",
            "dumping", "overflowing bin", "dirty streets",
            "uncollected rubbish", "refuse collection"
        ],
        "response": (
            "I can help you report a waste management problem.\n\n"
            "1. Select 'Waste Management'.\n"
            "2. Describe the issue, such as missed refuse "
            "collection, illegal dumping or overflowing bins.\n"
            "3. Provide the affected street or area.\n"
            "4. Attach a photograph if available and safe.\n"
            "5. Submit your complaint."
        ),
        "suggestions": [
            "How do I report missed rubbish collection?",
            "How do I report illegal dumping?",
            "What information must I provide?"
        ]
    },

    "Water and Sanitation - Drainage": {
        "keywords": [
            "sanitation", "sewage", "sewer",
            "drainage", "blocked drain",
            "overflowing sewage", "sewage leak",
            "sewer blockage", "sewer overflow",
            "blocked sewer", "wastewater"
        ],
        "response": (
            "I can help you report a sanitation or drainage problem.\n\n"
            "1. Select 'Water and Sanitation'.\n"
            "2. Describe the issue, such as blocked drainage "
            "or overflowing sewage.\n"
            "3. Provide the exact location.\n"
            "4. Attach a photograph only if it is safe.\n"
            "5. Submit your complaint.\n\n"
            "Avoid contact with sewage or contaminated water. "
            "Keep children and pets away from affected areas."
        ),
        "suggestions": [
            "How do I report overflowing sewage?",
            "How do I report a blocked drain?",
            "What information must I provide?"
        ]
    },

    "Public Facilities": {
        "keywords": [
            "public facility", "public facilities",
            "community hall", "public toilet",
            "public park", "municipal building",
            "broken facility", "damaged park",
            "recreational facility", "community centre",
            "public playground"
        ],
        "response": (
            "I can help you report a public facilities problem.\n\n"
            "1. Select 'Public Facilities'.\n"
            "2. Identify the affected facility.\n"
            "3. Explain the damage or problem.\n"
            "4. Include its location.\n"
            "5. Attach photographs if available and safe.\n"
            "6. Submit your complaint."
        ),
        "suggestions": [
            "How do I report a damaged public park?",
            "How do I report a broken public toilet?",
            "What information must I provide?"
        ]
    }
}


# =========================================================
# GENERAL QUESTIONS
# =========================================================

GENERAL_RESPONSES = [
    {
        "keywords": [
            "how to report", "submit complaint",
            "report a problem", "make a complaint",
            "report complaint", "how do i complain"
        ],
        "response": (
            "You can report a municipal problem using the "
            "complaint submission form on SmartMunicipality AI.\n\n"
            "Provide:\n"
            "1. A short complaint title.\n"
            "2. A clear description of the problem.\n"
            "3. The appropriate complaint category.\n"
            "4. The affected street or area.\n"
            "5. A photograph if available.\n\n"
            "Review your information before submitting."
        ),
        "suggestions": [
            "What information must I provide?",
            "How do I choose a category?",
            "Can I upload a photograph?"
        ]
    },

    {
        "keywords": [
            "photo", "photograph", "picture",
            "image", "upload evidence", "attach evidence"
        ],
        "response": (
            "Yes. You can attach a photograph when submitting "
            "a complaint.\n\n"
            "The current platform supports:\n"
            "• JPG\n"
            "• PNG\n"
            "• WEBP\n\n"
            "Maximum file size: 5 MB.\n\n"
            "Only take photographs when it is safe to do so."
        ),
        "suggestions": [
            "How do I submit a complaint?",
            "What information must I provide?",
            "How do I provide my location?"
        ]
    },

    {
        "keywords": [
            "location", "gps", "map", "address",
            "street name", "affected area",
            "where do i report"
        ],
        "response": (
            "Providing an accurate location helps identify "
            "where a municipal problem occurred.\n\n"
            "Include the street name, suburb or area and "
            "nearby landmarks. You can also use the map "
            "or device location feature when available "
            "and permission is granted."
        ),
        "suggestions": [
            "Can I upload a photograph?",
            "What information must I provide?",
            "How do I submit a complaint?"
        ]
    },

    {
        "keywords": [
            "track", "tracking", "reference number",
            "check complaint", "complaint status",
            "follow up", "where is my complaint"
        ],
        "response": (
            "After submitting a complaint, keep the "
            "reference number provided by the platform.\n\n"
            "It can help identify your report when following "
            "up with the relevant service provider.\n\n"
            "The availability of automatic reference-number "
            "lookup depends on the tracking features currently "
            "implemented in the platform."
        ),
        "suggestions": [
            "What does In Progress mean?",
            "What does Resolved mean?",
            "How do I submit a complaint?"
        ]
    },

    {
        "keywords": [
            "submitted", "under review", "in progress",
            "resolved", "closed", "status",
            "pending", "complaint progress"
        ],
        "response": (
            "Complaint statuses describe the progress "
            "of a reported issue.\n\n"
            "• Submitted: The complaint has been received.\n"
            "• Under Review: The complaint is being assessed.\n"
            "• In Progress: Investigation or work is underway.\n"
            "• Resolved: The complaint has been marked as resolved.\n"
            "• Closed: The complaint has been closed.\n\n"
            "The exact status names depend on the platform's "
            "configured workflow."
        ),
        "suggestions": [
            "How do I track my complaint?",
            "How do I report a problem?",
            "What information must I provide?"
        ]
    },

    {
        "keywords": [
            "what information", "details needed",
            "what must i provide", "what do i need",
            "required information", "information required"
        ],
        "response": (
            "When reporting a municipal problem, provide:\n\n"
            "1. A short complaint title.\n"
            "2. A clear description of what happened.\n"
            "3. The correct complaint category.\n"
            "4. The affected street or area.\n"
            "5. Contact details, if requested by the form.\n"
            "6. A photograph, if available.\n\n"
            "Accurate information helps administrators "
            "understand and assess your report."
        ),
        "suggestions": [
            "How do I choose a category?",
            "Can I upload a photograph?",
            "How do I report a water problem?"
        ]
    },

    {
        "keywords": [
            "priority", "urgent", "critical",
            "high priority", "low priority",
            "medium priority"
        ],
        "response": (
            "Complaint priority helps indicate the potential "
            "urgency of a reported problem.\n\n"
            "• Low: An issue with limited immediate impact.\n"
            "• Medium: An issue requiring attention.\n"
            "• High: A serious disruption or significant concern.\n"
            "• Critical: A potentially severe safety or service risk.\n\n"
            "The platform may suggest a priority, but this "
            "does not replace an assessment by municipal staff."
        ),
        "suggestions": [
            "How does the assistant identify urgent problems?",
            "How do I report an electricity problem?",
            "How do I report a water problem?"
        ]
    },

    {
        "keywords": [
            "categories", "complaint category",
            "types of complaints", "which category",
            "choose category"
        ],
        "response": (
            "SmartMunicipality AI supports these complaint categories:\n\n"
            "• Electricity\n"
            "• Public Facilities\n"
            "• Roads and Transport\n"
            "• Waste Management\n"
            "• Water and Sanitation\n\n"
            "Choose the category that best describes "
            "the reported problem."
        ),
        "suggestions": [
            "How do I report a pothole?",
            "How do I report a water leak?",
            "How do I report electricity problems?"
        ]
    }
]


# =========================================================
# SAFETY AND URGENT SITUATIONS
# =========================================================

EMERGENCY_KEYWORDS = [
    "live wire",
    "exposed wire",
    "fallen power line",
    "fallen electric wire",
    "electric shock",
    "electrocuted",
    "electrocution",
    "electrical fire",
    "electrical sparks",
    "sparking electricity",
    "person trapped",
    "building collapse",
    "major fire",
    "severe flooding",
    "flood water entering my house",
    "sewage flooding into my house"
]

EMERGENCY_RESPONSE = (
    "This sounds like a potentially dangerous situation.\n\n"
    "Please prioritise your safety:\n\n"
    "1. Move away from the dangerous area.\n"
    "2. Do not touch exposed wires, damaged equipment "
    "or contaminated water.\n"
    "3. Warn other people to keep their distance if safe.\n"
    "4. Contact the appropriate local emergency service "
    "or responsible utility immediately.\n\n"
    "Do not wait for a response from SmartMunicipality AI. "
    "This prototype is not an emergency response service."
)


# =========================================================
# MESSAGE NORMALISATION
# =========================================================

def normalise_message(message: str) -> str:
    """Clean and normalise a user's message."""

    message = message.lower().strip()
    message = re.sub(r"[^\w\s']", " ", message)
    message = re.sub(r"\s+", " ", message)

    return message


# =========================================================
# KEYWORD MATCHING
# =========================================================

def keyword_score(text: str, keywords: list) -> int:
    """Calculate a relevance score using phrase matching."""

    score = 0

    for keyword in keywords:
        phrase = normalise_message(keyword)

        pattern = r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"

        if re.search(pattern, text):
            # Longer phrases provide stronger evidence.
            score += len(phrase.split()) * 2

    return score


# =========================================================
# EMERGENCY DETECTION
# =========================================================

def detect_emergency(text: str) -> bool:
    """Identify selected high-risk situations."""

    for keyword in EMERGENCY_KEYWORDS:
        pattern = (
            r"(?<!\w)"
            + re.escape(normalise_message(keyword))
            + r"(?!\w)"
        )

        if re.search(pattern, text):
            return True

    return False


# =========================================================
# CATEGORY RECOMMENDATION
# =========================================================

def recommend_category(message: str):
    """Recommend the most relevant complaint category."""

    text = normalise_message(message)

    scores = {}

    for category, data in KNOWLEDGE_BASE.items():
        scores[category] = keyword_score(
            text,
            data["keywords"]
        )

    if not scores or max(scores.values()) == 0:
        return None

    return max(scores, key=scores.get)


# =========================================================
# BEST RESPONSE MATCHING
# =========================================================

def find_best_response(message: str):
    """Find the most relevant municipal response."""

    text = normalise_message(message)

    best_score = 0
    best_response = None
    suggestions = []

    # Check municipal categories.
    for category, data in KNOWLEDGE_BASE.items():

        score = keyword_score(text, data["keywords"])

        if score > best_score:
            best_score = score
            best_response = data["response"]
            suggestions = data["suggestions"]

    # Check general questions.
    for item in GENERAL_RESPONSES:

        score = keyword_score(text, item["keywords"])

        if score > best_score:
            best_score = score
            best_response = item["response"]
            suggestions = item["suggestions"]

    if best_response:
        return best_response, suggestions

    return None, []


# =========================================================
# MAIN CHAT FUNCTION
# =========================================================

def chat_with_assistant(message: str):
    """Generate an enhanced municipal assistant response."""

    if not message or not message.strip():

        return {
            "success": False,
            "assistant": ASSISTANT_NAME,
            "reply": "Please enter a question so I can assist you.",
            "suggestions": []
        }

    if len(message) > 1000:

        return {
            "success": False,
            "assistant": ASSISTANT_NAME,
            "reply": (
                "Your message is too long. "
                "Please shorten it and try again."
            ),
            "suggestions": []
        }

    text = normalise_message(message)

    # Emergency and safety detection comes first.
    if detect_emergency(text):

        return {
            "success": True,
            "assistant": ASSISTANT_NAME,
            "reply": EMERGENCY_RESPONSE,
            "suggestions": [
                "How do I report a municipal problem?",
                "How do I provide the location?"
            ],
            "urgency": "critical"
        }

    # Greetings.
    greeting_words = [
        "hello",
        "hi",
        "hey",
        "good morning",
        "good afternoon",
        "good evening"
    ]

    if text in greeting_words:

        return {
            "success": True,
            "assistant": ASSISTANT_NAME,
            "reply": WELCOME_MESSAGE,
            "suggestions": [
                "How do I report a water leak?",
                "How do I report an electricity outage?",
                "How do I report a pothole?",
                "What information must I provide?"
            ]
        }

    # Identify category.
    category = recommend_category(text)

    # Find the most relevant response.
    response, suggestions = find_best_response(text)

    if response:

        return {
            "success": True,
            "assistant": ASSISTANT_NAME,
            "reply": response,
            "suggestions": suggestions,
            "recommended_category": category
        }

    # Fallback response.
    return {
        "success": True,
        "assistant": ASSISTANT_NAME,
        "reply": (
            "I'm not completely sure how to answer that question.\n\n"
            "I can help you with:\n\n"
            "• Water and sanitation problems\n"
            "• Electricity problems\n"
            "• Roads and transport\n"
            "• Waste management\n"
            "• Public facilities\n"
            "• Complaint submission\n"
            "• Photographic evidence\n"
            "• Complaint statuses and priority\n\n"
            "Please describe the problem in a little more detail."
        ),
        "suggestions": [
            "How do I report a water leak?",
            "How do I report a pothole?",
            "How do I report electricity problems?",
            "How do I submit a complaint?"
        ]
    }
