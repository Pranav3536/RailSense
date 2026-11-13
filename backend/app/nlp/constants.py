"""
RailSense — NLP Constants and Mappings (backend/app/nlp/constants.py)
Defines deterministic entity vocabularies, time buckets, confidence thresholds,
and standard definitions adhering to Task A and Task C requirements.
"""

# Scheduled Arrival Hour (IST) Buckets
TIME_OF_DAY_BUCKETS = {
    "morning": {
        "label": "Morning (06:00 - 11:59 IST)",
        "hours": [6, 7, 8, 9, 10, 11],
        "keywords": ["morning", "subah", "early morning", "am", "dawn"]
    },
    "afternoon": {
        "label": "Afternoon (12:00 - 16:59 IST)",
        "hours": [12, 13, 14, 15, 16],
        "keywords": ["afternoon", "dopahar", "noon", "midday"]
    },
    "evening": {
        "label": "Evening (17:00 - 21:59 IST)",
        "hours": [17, 18, 19, 20, 21],
        "keywords": ["evening", "shaam", "sunset", "dusk"]
    },
    "night": {
        "label": "Night (22:00 - 05:59 IST)",
        "hours": [22, 23, 0, 1, 2, 3, 4, 5],
        "keywords": ["night", "raat", "late night", "midnight", "overnight", "pm"]
    }
}

# Day of Week Mappings
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAY_KEYWORDS = {
    "monday": "Monday", "somwar": "Monday",
    "tuesday": "Tuesday", "mangalwar": "Tuesday",
    "wednesday": "Wednesday", "budhwar": "Wednesday",
    "thursday": "Thursday", "guruwar": "Thursday", "veervar": "Thursday",
    "friday": "Friday", "shukrawar": "Friday",
    "saturday": "Saturday", "shaniwar": "Saturday",
    "sunday": "Sunday", "ravivar": "Sunday"
}

# Recognized Train Category Mappings
CATEGORY_MAP = {
    "sub": "SUB", "suburban": "SUB", "local": "SUB", "local train": "SUB",
    "mex": "MEX", "express": "MEX", "mail": "MEX", "mail express": "MEX",
    "suf": "SUF", "superfast": "SUF", "sf": "SUF",
    "pas": "PAS", "passenger": "PAS",
    "memu": "MEMU",
    "dmu": "DMU", "demu": "DMU",
    "vndb": "VNDB", "vande bharat": "VNDB", "vande": "VNDB",
    "sht": "SHT", "shatabdi": "SHT",
    "raj": "RAJ", "rajdhani": "RAJ",
    "tod": "TOD", "special": "TOD", "holiday special": "TOD",
    "drnt": "DRNT", "duronto": "DRNT",
    "jsh": "JSH", "jan shatabdi": "JSH",
    "gbr": "GBR", "garib rath": "GBR",
    "tej": "TEJ", "tejas": "TEJ"
}

# Intent Classification Confidence Thresholds
CONFIDENCE_HIGH = 0.60
CONFIDENCE_MED = 0.40
MARGIN_MIN = 0.08

# Rate Limit for NLP Endpoint
INSIGHTS_RATE_LIMIT = "30/minute"
