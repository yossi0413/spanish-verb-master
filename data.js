// Data handling module
import { storage } from './storage.js?v=1.5';

export class Verb {
    constructor(infinitive, meaning, mood, tense, conjugation, starred = false) {
        this.infinitive = infinitive || '';
        this.meaning = meaning || '';
        this.mood = mood || '';
        this.tense = tense || '';
        this.conjugation = conjugation || {}; // { yo: '...', tu: '...', ... }
        this.starred = starred;
    }
}

export let verbs = [];

export async function initData() {
    console.log('Data module initializing...');
    await loadData();
}

const DATA_VERSION = '1.1'; // Increment to force reload

export async function loadData() {
    // Check version
    const storedVersion = storage.get('antigravity_data_version');
    const storedData = storage.get('antigravity_verbs_jp');

    if (storedData && storedVersion === DATA_VERSION) {
        try {
            const parsed = JSON.parse(storedData);
            verbs = parsed;
            console.log(`Loaded ${verbs.length} verbs from storage.`);
        } catch (e) {
            console.error('Failed to parse stored data, reloading from CSV.', e);
            await loadFromCSV();
        }
    } else {
        // Load default if no storage or old version
        console.log('No valid stored data found (or version mismatch), reloading verbs.csv.');
        await loadFromCSV();
    }
}

async function loadFromCSV() {
    try {
        const response = await fetch('verbs.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        importCSV(csvText);
    } catch (e) {
        console.error('Failed to load verbs.csv:', e);
        alert('Failed to load verb data. Please check connection.');
    }
}

export function saveData() {
    storage.set('antigravity_verbs_jp', JSON.stringify(verbs));
    storage.set('antigravity_data_version', DATA_VERSION);
    console.log('Data saved to storage.');
}

/**
 * Parses CSV string into Verb objects
 * Expected format: infinitive, meaning, mood, tense, yo, tu, el, nosotros, vosotros, ellos
 */
export function importCSV(csvContent) {
    const lines = csvContent.split('\n');
    const newVerbs = [];

    // Skip header if present
    let startIdx = 0;
    if (lines[0].toLowerCase().includes('infinitive')) {
        startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length < 4) continue; // Min required columns

        const infinitive = parts[0].trim();
        const meaning = parts[1].trim();
        const mood = parts[2].trim();
        const tense = parts[3].trim();

        let conjugation = {};

        // Special handling based on Mood
        // Normalize checking for both Spanish and Japanese terms
        const isParticiple = mood === 'Gerundio' || mood === 'Participio' || mood === '分詞';
        const isImperative = mood === 'Imperativo' || mood === '命令法';

        if (isParticiple) {
            // Participles might be in 'yo' column (index 4) or 'tu' column (index 5) or others
            // scan columns 4 to 9 for a value
            let val = '';
            for (let k = 4; k <= 9; k++) {
                if (parts[k] && parts[k].trim() && parts[k].trim() !== '-') {
                    val = parts[k].trim();
                    break;
                }
            }
            conjugation = { form: val };
        } else if (isImperative) {
            // Imperative usually has no 'yo'. Schema: yo, tu, el, nosotros, vosotros, ellos
            // We map 5-9 to persons. Note: parts[4] ('yo') is usually empty/- for imperative.
            conjugation = {
                tu: parts[5] ? parts[5].trim() : '',
                el: parts[6] ? parts[6].trim() : '',
                nosotros: parts[7] ? parts[7].trim() : '',
                vosotros: parts[8] ? parts[8].trim() : '',
                ellos: parts[9] ? parts[9].trim() : ''
            };
        } else {
            // Standard 6-person
            if (parts.length < 10) continue;
            conjugation = {
                yo: parts[4].trim(),
                tu: parts[5].trim(),
                el: parts[6].trim(),
                nosotros: parts[7].trim(),
                vosotros: parts[8].trim(),
                ellos: parts[9].trim()
            };
        }

        const verb = new Verb(infinitive, meaning, mood, tense, conjugation);
        newVerbs.push(verb);
    }

    if (newVerbs.length > 0) {
        // Preserve stars from existing verbs
        newVerbs.forEach(nv => {
            const existing = verbs.find(v => v.infinitive === nv.infinitive);
            if (existing && existing.starred) {
                nv.starred = true;
            }
        });

        verbs = newVerbs;
        saveData();
        console.log(`Imported ${verbs.length} verbs.`);
        return true;
    } else {
        console.warn('No valid verbs found in CSV.');
        return false;
    }
}

export function toggleVerbStar(infinitive) {
    const verb = verbs.find(v => v.infinitive === infinitive);
    if (verb) {
        verb.starred = !verb.starred;
        saveData();
        return verb.starred;
    }
    return false;
}

export function getStarredVerbs() {
    return verbs.filter(v => v.starred);
}

export function getAvailableTenses() {
    const set = new Set();
    verbs.forEach(v => {
        if (v.mood && v.tense) {
            set.add(`${v.mood}|${v.tense}`);
        }
    });

    return Array.from(set).map(str => {
        const [mood, tense] = str.split('|');
        return { mood, tense };
    }).sort((a, b) => {
        if (a.mood !== b.mood) return a.mood.localeCompare(b.mood);
        return a.tense.localeCompare(b.tense);
    });
}

export function exportCSV() {
    const header = 'infinitive,meaning,mood,tense,yo,tú,él/ella/usted,nosotros/nosotras,vosotros/vosotras,ellos/ellas/ustedes';
    const rows = verbs.map(v => {
        return [
            v.infinitive,
            v.meaning,
            v.mood,
            v.tense,
            v.conjugation.yo,
            v.conjugation.tu,
            v.conjugation.el,
            v.conjugation.nosotros,
            v.conjugation.vosotros,
            v.conjugation.ellos
        ].join(',');
    });

    return [header, ...rows].join('\n');
}
