import os
import re
from ..models.schemas import Intent

# Islamabad sector coordinates map
SECTOR_COORDS = {
    "G-13": {"lat": 33.6490, "lng": 72.9690},
    "G-11": {"lat": 33.6690, "lng": 72.9890},
    "G-9":  {"lat": 33.6820, "lng": 73.0290},
    "G-10": {"lat": 33.6755, "lng": 73.0090},
    "G-6":  {"lat": 33.7050, "lng": 73.0590},
    "G-7":  {"lat": 33.6990, "lng": 73.0490},
    "G-8":  {"lat": 33.6900, "lng": 73.0390},
    "F-8":  {"lat": 33.7120, "lng": 73.0430},
    "F-7":  {"lat": 33.7200, "lng": 73.0550},
    "F-10": {"lat": 33.6930, "lng": 73.0140},
    "F-11": {"lat": 33.6980, "lng": 73.0000},
    "F-6":  {"lat": 33.7300, "lng": 73.0650},
    "E-11": {"lat": 33.7260, "lng": 73.0060},
    "I-8":  {"lat": 33.6680, "lng": 73.0720},
    "I-9":  {"lat": 33.6640, "lng": 73.0650},
    "I-10": {"lat": 33.6610, "lng": 73.0580},
    "H-9":  {"lat": 33.6750, "lng": 73.0500},
    "H-11": {"lat": 33.6850, "lng": 73.0000},
    "D-12": {"lat": 33.7400, "lng": 73.0200},
    "B-17": {"lat": 33.7500, "lng": 72.9300},
}

# Roman Urdu / Urdu location aliases — checked BEFORE regex so full words win
LOCATION_ALIASES = {
    # ── G-13 ──────────────────────────────────────────────────────────────────
    "g-13": "G-13", "g 13": "G-13", "jee terah": "G-13", "jee-terah": "G-13",
    "g terah": "G-13", "ji terah": "G-13", "jee 13": "G-13",
    "جی تیرہ": "G-13", "جی ۱۳": "G-13", "جی-13": "G-13",

    # ── G-11 ──────────────────────────────────────────────────────────────────
    "g-11": "G-11", "g 11": "G-11", "jee gyarah": "G-11", "g gyarah": "G-11",
    "ji gyarah": "G-11", "jee 11": "G-11",
    "جی گیارہ": "G-11", "جی ۱۱": "G-11", "جی-11": "G-11",

    # ── G-10 ──────────────────────────────────────────────────────────────────
    "g-10": "G-10", "g 10": "G-10", "jee das": "G-10", "g das": "G-10",
    "ji das": "G-10",
    "جی دس": "G-10", "جی ۱۰": "G-10",

    # ── G-9 ───────────────────────────────────────────────────────────────────
    "g-9": "G-9", "g 9": "G-9", "jee nau": "G-9", "g nau": "G-9",
    "ji nau": "G-9", "jee 9": "G-9",
    "جی نو": "G-9", "جی ۹": "G-9",

    # ── G-8 ───────────────────────────────────────────────────────────────────
    "g-8": "G-8", "g 8": "G-8", "jee aath": "G-8", "g aath": "G-8",
    "جی آٹھ": "G-8", "جی ۸": "G-8",

    # ── G-7 ───────────────────────────────────────────────────────────────────
    "g-7": "G-7", "g 7": "G-7", "jee saat": "G-7", "g saat": "G-7",
    "جی سات": "G-7", "جی ۷": "G-7",

    # ── G-6 ───────────────────────────────────────────────────────────────────
    "g-6": "G-6", "g 6": "G-6", "jee chay": "G-6", "g chay": "G-6",
    "جی چھ": "G-6", "جی ۶": "G-6",

    # ── F-10 ──────────────────────────────────────────────────────────────────
    "f-10": "F-10", "f 10": "F-10", "ef das": "F-10", "eff das": "F-10",
    "f das": "F-10", "ef 10": "F-10",
    "ایف دس": "F-10", "ایف ۱۰": "F-10", "ایف-10": "F-10",

    # ── F-11 ──────────────────────────────────────────────────────────────────
    "f-11": "F-11", "f 11": "F-11", "ef gyarah": "F-11", "eff gyarah": "F-11",
    "f gyarah": "F-11",
    "ایف گیارہ": "F-11", "ایف ۱۱": "F-11",

    # ── F-8 ───────────────────────────────────────────────────────────────────
    "f-8": "F-8", "f 8": "F-8", "ef aath": "F-8", "eff aath": "F-8",
    "f aath": "F-8",
    "ایف آٹھ": "F-8", "ایف ۸": "F-8", "ایف-8": "F-8",

    # ── F-7 ───────────────────────────────────────────────────────────────────
    "f-7": "F-7", "f 7": "F-7", "ef saat": "F-7", "eff saat": "F-7",
    "f saat": "F-7", "f7": "F-7",
    "ایف سات": "F-7", "ایف ۷": "F-7",

    # ── F-6 ───────────────────────────────────────────────────────────────────
    "f-6": "F-6", "f 6": "F-6", "ef chay": "F-6",
    "ایف چھ": "F-6", "ایف ۶": "F-6",

    # ── E-11 ──────────────────────────────────────────────────────────────────
    "e-11": "E-11", "e 11": "E-11", "ee gyarah": "E-11", "e gyarah": "E-11",
    "ای گیارہ": "E-11", "ای ۱۱": "E-11",

    # ── I-8 ───────────────────────────────────────────────────────────────────
    "i-8": "I-8", "i 8": "I-8", "eye aath": "I-8", "i aath": "I-8",
    "آئی آٹھ": "I-8", "آئی ۸": "I-8", "آئی-8": "I-8",

    # ── I-9 ───────────────────────────────────────────────────────────────────
    "i-9": "I-9", "i 9": "I-9", "eye nau": "I-9", "i nau": "I-9",
    "آئی نو": "I-9", "آئی ۹": "I-9",

    # ── I-10 ──────────────────────────────────────────────────────────────────
    "i-10": "I-10", "i 10": "I-10", "eye das": "I-10", "i das": "I-10",
    "آئی دس": "I-10", "آئی ۱۰": "I-10",

    # ── H-9 ───────────────────────────────────────────────────────────────────
    "h-9": "H-9", "h 9": "H-9", "aitch nau": "H-9", "h nau": "H-9",
    "ایچ نو": "H-9", "ایچ ۹": "H-9",

    # ── H-11 ──────────────────────────────────────────────────────────────────
    "h-11": "H-11", "h 11": "H-11", "aitch gyarah": "H-11",
    "ایچ گیارہ": "H-11", "ایچ ۱۱": "H-11",

    # ── D-12 ──────────────────────────────────────────────────────────────────
    "d-12": "D-12", "d 12": "D-12", "dee barah": "D-12",
    "ڈی بارہ": "D-12", "ڈی ۱۲": "D-12",

    # ── B-17 ──────────────────────────────────────────────────────────────────
    "b-17": "B-17", "b 17": "B-17", "bee satrah": "B-17",
    "بی سترہ": "B-17", "بی ۱۷": "B-17",

    # ── Well-known Islamabad area names ───────────────────────────────────────
    "blue area": "G-7", "jinnah super": "F-7", "super market": "F-7",
    "f7 markaz": "F-7", "f-7 markaz": "F-7",
    "centaurus": "F-8", "kohsar market": "F-7",
    "Pakistan town": "F-8", "satellite town": "G-13",
    "media town": "G-8", "gulberg": "G-11",
    "golra": "G-13", "tarlai": "G-13",
    "bahria town": "B-17", "bahria": "B-17",
    "cbr town": "B-17",
    "پاکستان ٹاؤن": "F-8", "بحریہ ٹاؤن": "B-17",
    "بلیو ایریا": "G-7", "گلبرگ": "G-11",
}

def extract_intent(query: str) -> Intent:
    lower_query = query.lower()
    # Urdu script is not affected by .lower(), so we search both
    original_query = query

    # --- Service Detection ---
    service = "unknown"

    # AC Technician
    if any(k in lower_query for k in [
        "ac technician", "ac repair", "ac mechanic", "air condition", "ac wala",
        "ac service", "ac install", "ac gas", "airconditioner", "air conditioner",
        "thanda nahi kar raha", "ac thanda", "ac band", "ac kharab",
        "cooling problem", "coolant", "inverter ac",
    ]) or any(k in original_query for k in [
        "اے سی", "ایئر کنڈیشنر", "اے سی مکینک", "اے سی ٹیکنیشن",
        "اے سی خراب", "اے سی کی مرمت", "ٹھنڈا نہیں", "کولنگ",
    ]):
        service = "AC technician"

    # Plumber
    elif any(k in lower_query for k in [
        "plumber", "plumbing", "pipe", "pani ka masla", "nalka", "leakage",
        "water leak", "pipe leak", "tap", "flush", "toilet", "commode",
        "drain", "sewer", "pani nahi aa raha", "pani band", "pani ka pressure",
        "bathroom masla", "kitchen sink", "pani bhar raha", "paani",
        "nalki", "nal", "water tank", "water pump", "pump install",
    ]) or any(k in original_query for k in [
        "پلمبر", "پلمبنگ", "پانی کا مسئلہ", "نلکا", "لیکیج", "پائپ",
        "ٹوٹی", "نالہ", "ٹوائلٹ", "پانی نہیں آ رہا", "پانی بند",
        "واٹر ٹینک", "پانی کا پمپ", "واش روم مسئلہ",
    ]):
        service = "plumber"

    # Electrician
    elif any(k in lower_query for k in [
        "electrician", "bijli", "wiring", "electric", "bijli wala",
        "bijli nahi", "light nahi", "current nahi", "bijli ka masla",
        "short circuit", "trip ho raha", "MCB", "fuse", "socket",
        "switch", "fan install", "light install", "wiring karo",
        "power outage", "voltage", "generator", "UPS", "inverter",
        "electrical", "bijli theek karo", "plug", "board",
    ]) or any(k in original_query for k in [
        "بجلی", "الیکٹریشن", "وائرنگ", "بجلی نہیں", "لائٹ نہیں",
        "کرنٹ نہیں", "شارٹ سرکٹ", "فیوز", "سوئچ", "جنریٹر",
        "یو پی ایس", "بجلی کا مسئلہ", "بجلی ٹھیک", "پلگ",
    ]):
        service = "electrician"

    # Beautician
    elif any(k in lower_query for k in [
        "beautician", "parlour", "parlor", "beauty", "makeup", "salon",
        "mehndi", "facial", "waxing", "threading", "hair cut", "haircut",
        "pedicure", "manicure", "bridal", "dulhan", "nikah makeup",
        "wedding makeup", "hair color", "hair style", "bleach", "massage",
        "spa", "beauty parlor", "girl salon", "ladies salon",
    ]) or any(k in original_query for k in [
        "بیوٹیشن", "بیوٹی پارلر", "پارلر", "میک اپ", "مہندی",
        "فیشل", "ویکسنگ", "تھریڈنگ", "بال کٹوانا", "دلہن میک اپ",
        "شادی میک اپ", "ہیئر کٹ", "پیڈیکیور", "مینیکیور",
    ]):
        service = "beautician"

    # Mechanic
    elif any(k in lower_query for k in [
        "mechanic", "car repair", "gaadi", "auto", "engine", "workshop",
        "car service", "car mechanic", "bike repair", "motorcycle",
        "vehicle", "tyre", "tire", "brake", "oil change", "car band",
        "gaadi kharab", "gaadi nahi chal rahi", "gear", "clutch",
        "radiator", "coolant", "car wala", "petrol", "diesel mechanic",
        "honda", "suzuki", "toyota", "car problem",
    ]) or any(k in original_query for k in [
        "مکینک", "گاڑی", "کار مرمت", "انجن", "ورکشاپ", "گاڑی خراب",
        "گاڑی نہیں چل رہی", "ٹائر", "بریک", "آئل چینج", "گیئر",
        "موٹر سائیکل مکینک", "گاڑی والا",
    ]):
        service = "mechanic"

    # Tutor
    elif any(k in lower_query for k in [
        "tutor", "parhna", "teacher", "ustaz", "ustad", "academy",
        "coaching", "math", "science", "english teacher", "home tutor",
        "private teacher", "padhai", "parhai", "lecture", "online tutor",
        "school", "student", "exam", "syllabus", "physics", "chemistry",
        "biology", "O level", "A level", "matric", "inter",
    ]) or any(k in original_query for k in [
        "ٹیوٹر", "پڑھنا", "استاد", "اکیڈمی", "کوچنگ",
        "گھر پر پڑھانا", "پرائیویٹ ٹیچر", "آن لائن ٹیوٹر",
        "ریاضی", "سائنس", "انگلش ٹیچر", "امتحان",
    ]):
        service = "tutor"

    # Carpenter
    elif any(k in lower_query for k in [
        "carpenter", "wood", "furniture", "darwaza", "door",
        "carpentry", "almirah", "wardrobe", "cabinet", "shelf",
        "wooden", "lakri", "lakri wala", "bed repair", "sofa repair",
        "table repair", "chair repair", "furniture repair",
        "darwaza theek", "khulli darwaza",
    ]) or any(k in original_query for k in [
        "کارپینٹر", "لکڑی", "فرنیچر", "دروازہ", "الماری",
        "وارڈروب", "کیبنٹ", "لکڑی والا", "بیڈ مرمت", "صوفہ مرمت",
        "دروازہ ٹھیک", "لکڑی کا کام",
    ]):
        service = "carpenter"

    # Cleaning
    elif any(k in lower_query for k in [
        "cleaning", "clean", "safai", "maid", "sweep",
        "ghar ki safai", "jharoo", "pocha", "dust", "dirty",
        "ganda", "sofa cleaning", "carpet cleaning", "deep clean",
        "house cleaning", "office cleaning", "sanitize",
        "kaam wali", "kaam wali bai", "home cleaning",
    ]) or any(k in original_query for k in [
        "صفائی", "صاف کرنا", "جھاڑو", "گندا", "گھر کی صفائی",
        "کام والی", "کام والی بائی", "سوفہ صفائی", "گہری صفائی",
    ]):
        service = "cleaning"

    # Pest Control
    elif any(k in lower_query for k in [
        "pest control", "cockroach", "insects", "spray", "keeray",
        "pests", "bugs", "termite", "mice", "rats", "mosquito",
        "dengue spray", "lizard", "ant", "keeray makoray",
        "pest spray", "fumigation", "bed bugs",
    ]) or any(k in original_query for k in [
        "کیڑے", "کاکروچ", "حشرات", "اسپرے", "دیمک", "چوہے",
        "مچھر", "کیڑے مکوڑے", "فیومیگیشن", "بیڈ بگز",
    ]):
        service = "pest control"

    # Home Repair (fallback)
    elif any(k in lower_query for k in [
        "repair", "toota", "fix", "handyman", "kharab", "theek karo",
        "ghar ka kaam", "maintenance", "install", "repairing",
        "broken", "leaking", "damaged", "wall crack", "ceiling",
        "paint", "whitewash", "lippai", "putty",
    ]) or any(k in original_query for k in [
        "مرمت", "ٹوٹا", "ٹھیک کرو", "ہینڈی مین", "خراب",
        "گھر کا کام", "مینٹیننس", "دیوار", "چھت", "رنگ",
    ]):
        service = "home repair workers"

    # --- Location Detection ---
    location = "unknown"

    # Check aliases first (Roman Urdu / Urdu names)
    for alias, sector in LOCATION_ALIASES.items():
        if alias in lower_query:
            location = sector
            break

    # Also check Urdu script sector mentions directly
    if location == "unknown":
        urdu_sector_map = {
            "جی تیرہ": "G-13", "جی ۱۳": "G-13",
            "جی گیارہ": "G-11", "جی ۱۱": "G-11",
            "جی نو": "G-9",   "جی ۹": "G-9",
            "ایف آٹھ": "F-8",  "ایف ۸": "F-8",
            "ایف دس": "F-10",  "ایف ۱۰": "F-10",
            "ایف سات": "F-7",  "ایف ۷": "F-7",
            "ای گیارہ": "E-11","ای ۱۱": "E-11",
            "آئی آٹھ": "I-8",  "آئی ۸": "I-8",
            "آئی دس": "I-10",  "آئی ۱۰": "I-10",
            "ایچ نو": "H-9",   "بی سترہ": "B-17",
        }
        for urdu_name, sector in urdu_sector_map.items():
            if urdu_name in original_query:
                location = sector
                break

    # Fall back to regex pattern like G-13, F-10, I-8, etc.
    if location == "unknown":
        loc_match = re.search(r'\b([a-zA-Z]-\d{1,2})\b', query)
        if loc_match:
            location = loc_match.group(1).upper()

    # --- Time Detection ---
    time = "unknown"
    if any(k in lower_query for k in [
        "kal subah", "tomorrow morning", "kal morning", "agle din subah",
    ]) or any(k in original_query for k in ["کل صبح", "آنے والی صبح"]):
        time = "Tomorrow Morning"
    elif any(k in lower_query for k in [
        "kal", "tomorrow", "agle din", "next day",
    ]) or any(k in original_query for k in ["کل", "اگلے دن"]):
        time = "Tomorrow"
    elif any(k in lower_query for k in [
        "abhi", "now", "immediately", "foran", "urgent", "asap",
        "jaldi", "jald", "right now", "emergency", "turant",
    ]) or any(k in original_query for k in [
        "ابھی", "فوری", "فوراً", "جلدی", "ایمرجنسی", "ابھی چاہیے",
    ]):
        time = "Immediate"
    elif any(k in lower_query for k in [
        "aaj", "today", "aj", "is waqt", "abhi nahi baad mein aaj",
    ]) or any(k in original_query for k in ["آج", "اس وقت"]):
        time = "Today"

    # --- Confidence ---
    confidence = 0.5
    if service != "unknown" and location != "unknown":
        confidence = 0.96
    elif service != "unknown":
        confidence = 0.75

    return Intent(
        service=service,
        location=location,
        time=time,
        confidence=confidence
    )
