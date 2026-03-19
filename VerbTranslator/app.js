// Use relative URL so it works both locally and in production
const API_BASE = '/api';

// DOM elements
const sourceLang = document.getElementById('source-lang');
const targetLang = document.getElementById('target-lang');
const swapBtn = document.getElementById('swap-btn');
const verbInput = document.getElementById('verb-input');
const translateBtn = document.getElementById('translate-btn');
const resultsSection = document.getElementById('results');
const errorSection = document.getElementById('error');
const errorText = document.getElementById('error-text');
const resultVerb = document.getElementById('result-verb');
const conjugationTables = document.getElementById('conjugation-tables');
const verbImg = document.getElementById('verb-img');
const exampleText = document.getElementById('example-text');
const exampleSection = document.getElementById('example-section');
const suggestionsEl = document.getElementById('suggestions');

// Verb list cache per language
const verbCache = {};

// --- Language sync ---
function syncLanguages(changed) {
    if (sourceLang.value === targetLang.value) {
        const selects = changed === 'source' ? targetLang : sourceLang;
        for (const opt of selects.options) {
            if (opt.value !== (changed === 'source' ? sourceLang : targetLang).value) {
                selects.value = opt.value;
                break;
            }
        }
    }
    loadVerbList();
}

sourceLang.addEventListener('change', () => syncLanguages('source'));
targetLang.addEventListener('change', () => syncLanguages('target'));

swapBtn.addEventListener('click', () => {
    const temp = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = temp;
    loadVerbList();
});

// --- Autocomplete ---
async function loadVerbList() {
    const lang = sourceLang.value;
    if (verbCache[lang]) return;
    try {
        const res = await fetch(`${API_BASE}/verbs?lang=${lang}`);
        const data = await res.json();
        verbCache[lang] = data.verbs;
    } catch {
        verbCache[lang] = [];
    }
}

function showSuggestions(matches) {
    suggestionsEl.innerHTML = '';
    if (matches.length === 0) {
        suggestionsEl.classList.add('hidden');
        return;
    }
    matches.slice(0, 8).forEach((verb) => {
        const li = document.createElement('li');
        li.textContent = verb;
        li.addEventListener('mousedown', (e) => {
            e.preventDefault();
            verbInput.value = verb;
            suggestionsEl.classList.add('hidden');
            translate();
        });
        suggestionsEl.appendChild(li);
    });
    suggestionsEl.classList.remove('hidden');
}

verbInput.addEventListener('input', () => {
    const val = verbInput.value.trim().toLowerCase();
    if (!val) {
        suggestionsEl.classList.add('hidden');
        return;
    }
    const list = verbCache[sourceLang.value] || [];
    const matches = list.filter(v => v.startsWith(val) && v !== val);
    showSuggestions(matches);
});

verbInput.addEventListener('blur', () => {
    setTimeout(() => suggestionsEl.classList.add('hidden'), 150);
});

// --- Error / results helpers ---
function showError(msg) {
    resultsSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    errorText.textContent = msg;
}

function hideAll() {
    resultsSection.classList.add('hidden');
    errorSection.classList.add('hidden');
}

// --- Build conjugation table ---
function renderConjugation(conjugation) {
    conjugationTables.innerHTML = '';
    if (!conjugation || Object.keys(conjugation).length === 0) return;

    for (const [tense, forms] of Object.entries(conjugation)) {
        const card = document.createElement('div');
        card.className = 'tense-card';

        const h4 = document.createElement('h4');
        h4.textContent = tense;
        card.appendChild(h4);

        const ul = document.createElement('ul');
        forms.forEach(form => {
            const li = document.createElement('li');
            li.textContent = form;
            ul.appendChild(li);
        });
        card.appendChild(ul);

        conjugationTables.appendChild(card);
    }
}

// --- Translate ---
async function translate() {
    const word = verbInput.value.trim();
    if (!word) {
        showError('Please type a verb to translate.');
        return;
    }

    document.body.classList.add('loading');
    hideAll();

    try {
        const src = sourceLang.value;
        const tgt = targetLang.value;
        const res = await fetch(
            `${API_BASE}/translate?word=${encodeURIComponent(word)}&src=${src}&tgt=${tgt}`
        );
        const data = await res.json();

        if (!res.ok) {
            showError(data.error || 'Translation not found.');
            return;
        }

        // Show results
        errorSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        resultVerb.textContent = data.translated_verb;

        // Show example sentence
        if (data.example_sentence) {
            exampleText.textContent = data.example_sentence;
            exampleSection.style.display = '';
        } else {
            exampleSection.style.display = 'none';
        }

        renderConjugation(data.conjugation);

        // Fetch image from Pexels API
        const imgQuery = encodeURIComponent(data.image_keyword + " action");
        try {
            const imgRes = await fetch(`${API_BASE}/image?q=${imgQuery}`);
            const imgData = await imgRes.json();
            if (imgRes.ok && imgData.image_url) {
                verbImg.src = imgData.image_url;
                verbImg.alt = `Image representing the verb: ${data.image_keyword}`;
                // Add photographer credit
                let credit = document.getElementById('photo-credit');
                if (!credit) {
                    credit = document.createElement('p');
                    credit.id = 'photo-credit';
                    credit.className = 'photo-credit';
                    verbImg.parentElement.after(credit);
                }
                credit.innerHTML = `Photo by <a href="${imgData.photo_url}" target="_blank">${imgData.photographer}</a> on <a href="https://www.pexels.com" target="_blank">Pexels</a>`;
            } else {
                verbImg.src = `https://loremflickr.com/600/340/${encodeURIComponent(data.image_keyword)}`;
                verbImg.alt = `Image representing the verb: ${data.image_keyword}`;
            }
        } catch {
            verbImg.src = `https://loremflickr.com/600/340/${encodeURIComponent(data.image_keyword)}`;
            verbImg.alt = `Image representing the verb: ${data.image_keyword}`;
        }
    } catch (err) {
        showError('Could not connect to the server. Make sure the backend is running.');
    } finally {
        document.body.classList.remove('loading');
    }
}

translateBtn.addEventListener('click', translate);
verbInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        suggestionsEl.classList.add('hidden');
        translate();
    }
});

// Load verb list on startup
loadVerbList();
