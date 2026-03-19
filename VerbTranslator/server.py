import os
import requests as http_requests

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from mlconjug3 import Conjugator
from translations import VERB_TRANSLATIONS, ES_TO_EN, FR_TO_EN

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)


@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

# Initialize conjugators for each language
conjugators = {
    "en": Conjugator(language="en"),
    "es": Conjugator(language="es"),
    "fr": Conjugator(language="fr"),
}

LANG_NAMES = {"en": "English", "es": "Spanish", "fr": "French"}

# --- Example sentence templates per language ---
# Each uses {verb} placeholder for the infinitive and {conj} for a conjugated form
EXAMPLE_TEMPLATES = {
    "en": [
        "I like to {verb} every day.",
        "She wants to {verb} with her friends.",
        "They need to {verb} before the deadline.",
        "We should {verb} more often.",
        "He decided to {verb} after dinner.",
        "It is important to {verb} carefully.",
        "You can {verb} whenever you want.",
        "Learning to {verb} takes practice.",
    ],
    "es": [
        "Me gusta {verb} todos los días.",
        "Ella quiere {verb} con sus amigos.",
        "Ellos necesitan {verb} antes de la fecha límite.",
        "Deberíamos {verb} más a menudo.",
        "Él decidió {verb} después de cenar.",
        "Es importante {verb} con cuidado.",
        "Puedes {verb} cuando quieras.",
        "Aprender a {verb} requiere práctica.",
    ],
    "fr": [
        "J'aime {verb} tous les jours.",
        "Elle veut {verb} avec ses amis.",
        "Ils doivent {verb} avant la date limite.",
        "Nous devrions {verb} plus souvent.",
        "Il a décidé de {verb} après le dîner.",
        "Il est important de {verb} avec soin.",
        "Tu peux {verb} quand tu veux.",
        "Apprendre à {verb} demande de la pratique.",
    ],
}


def get_example_sentence(verb_str, lang):
    """Generate an example sentence using the verb."""
    import hashlib
    templates = EXAMPLE_TEMPLATES.get(lang, EXAMPLE_TEMPLATES["en"])
    # Use a hash of the verb to pick a consistent template
    idx = int(hashlib.md5(verb_str.encode()).hexdigest(), 16) % len(templates)
    return templates[idx].format(verb=verb_str)

# Key tenses to display per language: (mood, tense) → display name
# mood=None means match any mood
TENSES_TO_SHOW = {
    "en": [
        (None, "indicative present", "Present"),
        (None, "indicative past tense", "Past (Preterite)"),
        (None, "indicative present continuous", "Present Continuous"),
        (None, "indicative present perfect", "Present Perfect"),
    ],
    "es": [
        (None, "Indicativo presente", "Presente"),
        (None, "Indicativo pretérito perfecto simple", "Pretérito"),
        (None, "Indicativo pretérito imperfecto", "Imperfecto"),
        (None, "Indicativo futuro", "Futuro"),
    ],
    "fr": [
        ("Indicatif", "Présent", "Présent"),
        ("Indicatif", "Imparfait", "Imparfait"),
        ("Indicatif", "Passé Simple", "Passé Simple"),
        ("Indicatif", "Futur", "Futur"),
    ],
}


def get_conjugation_table(verb_str, lang):
    """Get conjugation table for a verb using mlconjug3."""
    try:
        conjugator = conjugators[lang]
        verb = conjugator.conjugate(verb_str, subject="pronoun")
        if verb is None:
            return None

        tense_rules = TENSES_TO_SHOW.get(lang, [])
        result = {}

        for item in verb.iterate():
            if len(item) == 4:
                mood, tense, pronoun, form = item
            elif len(item) == 3:
                tense, pronoun, form = item
                mood = None
            else:
                continue

            if form is None:
                continue

            for rule_mood, rule_tense, display_name in tense_rules:
                if rule_tense == tense and (rule_mood is None or rule_mood == mood):
                    if display_name not in result:
                        result[display_name] = []
                    entry = f"{pronoun} {form}"
                    # Avoid duplicates from mlconjug3's double tense entries
                    if entry not in result[display_name]:
                        result[display_name].append(entry)
                    break

        return result if result else None
    except Exception as e:
        print(f"Conjugation error for '{verb_str}' ({lang}): {e}")
        return None


def translate_verb(word, src_lang, tgt_lang):
    """Translate a verb between languages. Returns (english_key, translated_verb) or (None, None)."""
    normalized = word.strip().lower()

    if src_lang == "en":
        en_key = normalized
    elif src_lang == "es":
        en_key = ES_TO_EN.get(normalized)
    elif src_lang == "fr":
        en_key = FR_TO_EN.get(normalized)
    else:
        return None, None

    if en_key is None or en_key not in VERB_TRANSLATIONS:
        return None, None

    es, fr = VERB_TRANSLATIONS[en_key]
    translations = {"en": en_key, "es": es, "fr": fr}
    return en_key, translations.get(tgt_lang)


@app.route("/api/translate", methods=["GET"])
def api_translate():
    word = request.args.get("word", "").strip()
    src = request.args.get("src", "en")
    tgt = request.args.get("tgt", "es")

    if not word:
        return jsonify({"error": "Please type a verb to translate."}), 400

    if src == tgt:
        return jsonify({"error": "Source and target languages must be different."}), 400

    en_key, translated = translate_verb(word, src, tgt)

    if translated is None:
        return jsonify({
            "error": f'"{word}" was not found. Make sure you typed a valid verb in its infinitive form.'
        }), 404

    conjugation = get_conjugation_table(translated, tgt)
    image_keyword = en_key.replace(" ", "+")
    example = get_example_sentence(translated, tgt)

    return jsonify({
        "source_verb": word.strip().lower(),
        "translated_verb": translated,
        "source_lang": LANG_NAMES[src],
        "target_lang": LANG_NAMES[tgt],
        "conjugation": conjugation,
        "image_keyword": image_keyword,
        "example_sentence": example,
    })


@app.route("/api/verbs", methods=["GET"])
def api_verbs():
    """Return list of all available verbs for autocomplete."""
    lang = request.args.get("lang", "en")

    if lang == "en":
        verbs = sorted(VERB_TRANSLATIONS.keys())
    elif lang == "es":
        verbs = sorted(ES_TO_EN.keys())
    elif lang == "fr":
        verbs = sorted(FR_TO_EN.keys())
    else:
        verbs = []

    return jsonify({"verbs": verbs})


def search_pexels_image(query):
    """Search Pexels for a relevant image. Returns (url, photographer, photo_url) or Nones."""
    try:
        resp = http_requests.get(
            "https://api.pexels.com/v1/search",
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("photos"):
                photo = data["photos"][0]
                return (
                    photo["src"]["large"],
                    photo["photographer"],
                    photo["url"],
                )
    except Exception as e:
        print(f"Pexels API error: {e}")
    return None, None, None


@app.route("/api/image", methods=["GET"])
def api_image():
    """Search Pexels for a verb-related image."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Missing query"}), 400

    img_url, photographer, photo_url = search_pexels_image(query)
    if img_url:
        return jsonify({
            "image_url": img_url,
            "photographer": photographer,
            "photo_url": photo_url,
        })
    return jsonify({"error": "No image found"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=(port == 5001))
