// UI handling module
import { QuizSession } from './quiz.js?v=1.5';
import { verbs, importCSV, exportCSV, toggleVerbStar, getStarredVerbs } from './data.js?v=1.5';
import { storage } from './storage.js?v=1.5';

export const UI = {
    screens: {},
    // ...
    currentSession: null,
    settings: {
    },

    init() {
        // Load settings
        const storedSettings = storage.get('antigravity_settings');
        if (storedSettings) {
            this.settings = JSON.parse(storedSettings);
        }

        // Cache screens
        this.screens = {
            start: document.getElementById('start-screen'),
            quiz: document.getElementById('quiz-screen'),
            dictionary: document.getElementById('dictionary-screen'),
            data: document.getElementById('data-screen'),
            result: document.getElementById('result-screen'),
            detail: document.getElementById('detail-screen'),
            category: document.getElementById('category-screen')
        };

        // Bind global actions
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            this.handleAction(action);
        });

        // Search listener
        const searchInput = document.getElementById('verb-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.renderDictionary(e.target.value);
            });
        }

        // Settings listeners
        this.initSettingsListeners();

        console.log('UI module initialized');
    },

    initSettingsListeners() {
        const exportBtn = document.getElementById('export-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const csv = exportCSV();
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'spanish_verbs.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            });
        }

        const importBtn = document.getElementById('import-csv');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                // Simple prompt for now
                const content = prompt("Paste your CSV content here:");
                if (content) {
                    const success = importCSV(content);
                    if (success) {
                        alert('Verbs imported successfully!');
                    } else {
                        alert('Failed to import. Check format.');
                    }
                }
            });
        }
    },

    saveSettings() {
        storage.set('antigravity_settings', JSON.stringify(this.settings));
    },

    showScreen(screenId) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.add('hidden');
                screen.classList.remove('active-screen');
            }
        });

        // Show target screen
        const target = this.screens[screenId];
        if (target) {
            target.classList.remove('hidden');
            void target.offsetWidth;
            target.classList.add('active-screen');

            // Screen specific init
            if (screenId === 'dictionary') {
                this.renderDictionary();
            }
        }
    },

    handleAction(action) {
        switch (action) {
            case 'start-random':
                this.startQuiz('input', false);
                break;
            case 'start-weak':
                this.startQuiz('input', true);
                break;
            case 'show-category-selection':
                this.showScreen('category');
                this.renderCategorySelection();
                break;
            case 'start-category-quiz':
                this.startCategoryQuiz();
                break;
            case 'show-dictionary':
                this.showScreen('dictionary');
                break;
            case 'show-data':
                this.showScreen('data');
                break;
            case 'back-home':
                this.showScreen('start');
                break;
            case 'retry':
                // Check if we can retry with same filter
                if (this.currentSession && this.currentSession.filter) {
                    this.startQuiz('input', false, this.currentSession.filter);
                } else {
                    this.startQuiz('input', false);
                }
                break;
            case 'submit-answer':
                this.handleAnswerSubmit();
                break;
            case 'back-dictionary':
                this.showScreen('dictionary');
                break;
            case 'toggle-star':
                // Toggle star state
                if (this.currentSession && this.currentSession.getCurrentQuestion()) {
                    const v = this.currentSession.getCurrentQuestion().verb;
                    const newState = toggleVerbStar(v.infinitive);
                    this.updateStarButton(newState);
                }
                break;
        }
    },

    renderCategorySelection() {
        const list = document.getElementById('category-list');
        list.innerHTML = '';
        import('./data.js?v=1.5').then(module => {
            const available = module.getAvailableTenses();
            const groups = {};

            available.forEach(item => {
                if (!groups[item.mood]) groups[item.mood] = [];
                groups[item.mood].push(item);
            });

            for (const mood in groups) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'category-group';
                groupDiv.style.marginBottom = '24px';

                const title = document.createElement('h3');
                title.textContent = mood;
                title.style.marginBottom = '12px';
                title.style.color = 'var(--primary-dark)';
                groupDiv.appendChild(title);

                const grid = document.createElement('div');
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
                grid.style.gap = '12px';

                groups[mood].forEach(item => {
                    const label = document.createElement('label');
                    label.className = 'category-checkbox';
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.gap = '8px';
                    label.style.background = 'var(--surface-color)';
                    label.style.padding = '12px';
                    label.style.borderRadius = '12px';
                    label.style.border = '2px solid #EEE';
                    label.style.cursor = 'pointer';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = `${item.mood}|${item.tense}`;
                    checkbox.dataset.mood = item.mood;
                    checkbox.dataset.tense = item.tense;
                    checkbox.style.width = '20px';
                    checkbox.style.height = '20px';
                    checkbox.style.accentColor = 'var(--primary-color)';

                    const span = document.createElement('span');
                    span.textContent = item.tense;
                    span.style.fontWeight = '600';

                    label.appendChild(checkbox);
                    label.appendChild(span);
                    grid.appendChild(label);
                });

                groupDiv.appendChild(grid);
                list.appendChild(groupDiv);
            }
        });
    },

    startCategoryQuiz() {
        const checkboxes = document.querySelectorAll('#category-list input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            alert('少なくとも1つの分野を選択してください。');
            return;
        }

        const filter = [];
        checkboxes.forEach(cb => {
            filter.push({ mood: cb.dataset.mood, tense: cb.dataset.tense });
        });

        this.startQuiz('input', false, filter);
    },

    startQuiz(mode, onlyStarred, filter = null) {
        if (onlyStarred) {
            const starred = getStarredVerbs();
            if (starred.length === 0) {
                alert('苦手な動詞（星付き）がまだありません。辞書やクイズで星をつけてください！');
                return;
            }
        }

        this.currentSession = new QuizSession(mode, onlyStarred, filter);
        this.showScreen('quiz');
        this.nextQuestion();
    },

    nextQuestion() {
        const q = this.currentSession.nextQuestion();
        if (!q) {
            // Should not happen unless filtered list is empty mid-game
            alert('出題できる動詞がなくなりました！');
            this.showScreen('start');
            return;
        }
        this.renderCurrentQuestion();
        this.updateProgress();
    },

    renderCurrentQuestion() {
        const container = document.getElementById('quiz-container');
        const question = this.currentSession.getCurrentQuestion();

        const feedback = document.getElementById('feedback-area');
        feedback.classList.add('hidden');
        feedback.innerHTML = '';

        const starClass = question.verb.starred ? 'starred' : '';
        const starIcon = question.verb.starred ? '★' : '☆';

        // Person label handling
        let personLabel = question.person;
        // If key is 'form' (Participle/Gerund), maybe show nothing or fixed text?
        // Actually, if it's 'form', it means there's no person var.
        let personDisplay = `<span class="person-label">${personLabel}</span>`;

        if (question.person === 'form') {
            personDisplay = `<span class="person-label" style="display:none"></span>`; // Hide person label
        }

        container.innerHTML = `
            <div class="question-card">
                <div style="position:relative;">
                    <button class="btn-icon star-btn ${starClass}" data-action="toggle-star" style="position:absolute; right:0; top:0; background:transparent; box-shadow:none; font-size:1.5rem; color:#FFD93D;">${starIcon}</button>
                    <h3 class="verb-infinitive">${question.verb.infinitive}</h3>
                    <p class="verb-meaning">${question.verb.meaning}</p>
                </div>
                <div class="test-badges" style="display:flex; justify-content:center; gap:16px; margin-bottom:24px;">
                    <span class="badge badge-mood">${question.verb.mood}</span>
                    <span class="badge badge-tense">${question.verb.tense}</span>
                </div>
                <div class="conjugation-target">
                    ${personDisplay}
                </div>
                <input type="text" id="answer-input" placeholder="活用を入力" autocomplete="off">
                <button class="btn btn-primary btn-full" data-action="submit-answer" style="margin-top: 20px;">答え合わせ</button>
            </div>
        `;

        setTimeout(() => {
            const input = document.getElementById('answer-input');
            if (input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleAnswerSubmit();
                });
            }
        }, 100);
    },

    updateStarButton(isStarred) {
        const btn = document.querySelector('.star-btn');
        if (btn) {
            btn.textContent = isStarred ? '★' : '☆';
            if (isStarred) btn.classList.add('starred');
            else btn.classList.remove('starred');
        }
    },

    handleAnswerSubmit() {
        const input = document.getElementById('answer-input');
        if (!input) return;

        const val = input.value;
        const result = this.currentSession.submitAnswer(val);
        this.showFeedback(result);
        this.updateProgress();
    },

    showFeedback(result) {
        const feedback = document.getElementById('feedback-area');
        feedback.classList.remove('hidden');

        // Scroll to feedback
        feedback.scrollIntoView({ behavior: 'smooth', block: 'end' });

        if (result.correct) {
            feedback.innerHTML = `
                <div class="feedback success">
                    <span class="icon">✨</span> 正解！
                    <button class="btn btn-primary btn-sm" id="next-btn" style="background:#fff; color:var(--success-color); border:none;">次へ</button>
                </div>
            `;

        } else {
            feedback.innerHTML = `
                <div class="feedback error">
                    <span class="icon">😢</span> 残念...
                    <p>正解は: <strong>${result.question.answer}</strong></p>
                    <button class="btn btn-primary btn-sm" id="next-btn" style="background:#fff; color:var(--error-color); border:none;">次へ</button>
                </div>
            `;

        }

        document.getElementById('next-btn').onclick = () => {
            this.nextQuestion();
        };
    },

    updateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        const scoreDisplay = document.querySelector('.score-display');
        const stats = this.currentSession.getStats();

        // Accuracy bar instead of progress
        progressFill.style.width = `${stats.accuracy}%`;
        // Color based on accuracy?
        if (stats.accuracy >= 80) progressFill.style.backgroundColor = 'var(--success-color)';
        else if (stats.accuracy >= 50) progressFill.style.backgroundColor = 'var(--accent-color)';
        else progressFill.style.backgroundColor = 'var(--error-color)';

        scoreDisplay.textContent = `正答率: ${stats.accuracy}% (${stats.correct}/${stats.total})`;
    },

    showResult() {
        // Deprecated in Endless Mode, but kept for compatibility
        this.showScreen('start');
    },

    // --- Dictionary Logic ---

    renderDictionary(filter = '') {
        const list = document.getElementById('verb-list');
        list.innerHTML = '';

        const normalizedFilter = filter.toLowerCase();

        // Group verbs by infinitive
        const verbGroups = new Map();
        verbs.forEach(v => {
            if (!verbGroups.has(v.infinitive)) {
                verbGroups.set(v.infinitive, []);
            }
            verbGroups.get(v.infinitive).push(v);
        });

        // Filter groups based on search
        const visibleGroups = [];
        for (const [infinitive, variants] of verbGroups) {
            // Check if infinitive or meaning matches
            const primary = variants[0];
            if (infinitive.toLowerCase().includes(normalizedFilter) ||
                primary.meaning.toLowerCase().includes(normalizedFilter)) {
                visibleGroups.push({ infinitive, variants, primary });
            }
        }

        if (visibleGroups.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:20px; text-align:center; color:#999;">見つかりませんでした</div>';
            return;
        }

        visibleGroups.forEach(group => {
            const el = document.createElement('div');
            el.className = 'verb-item';

            // Collect all available tenses for display
            const tenses = group.variants.map(v => `${v.mood} ${v.tense}`).join(', ');

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${group.infinitive}</strong>
                    <span style="color:var(--text-secondary); font-size:0.9em;">${group.primary.meaning}</span>
                </div>
                <div style="margin-top:4px; font-size:0.8em; color:var(--text-secondary);">
                    収録: ${group.variants.length}パターン
                </div>
            `;
            el.onclick = () => this.showVerbDetail(group.infinitive);
            list.appendChild(el);
        });
    },

    showVerbDetail(infinitive) {
        // Find all variants for this infinitive
        const variants = verbs.filter(v => v.infinitive === infinitive);
        if (variants.length === 0) return;

        const primary = variants[0];

        // Populate Header
        document.getElementById('detail-infinitive').textContent = primary.infinitive;
        document.getElementById('detail-meaning').textContent = primary.meaning;

        // Hide badges in header since they are specific to tenses now
        const badgesContainer = document.querySelector('.verb-header-card .badges');
        if (badgesContainer) badgesContainer.style.display = 'none';

        const gridContainer = document.querySelector('.detail-content');

        // Remove existing dynamic tables (keep header)
        const oldTables = gridContainer.querySelectorAll('.dynamic-table-section');
        oldTables.forEach(t => t.remove());

        // Create a table for each variant
        variants.forEach(variant => {
            const section = document.createElement('div');
            section.className = 'dynamic-table-section';
            section.innerHTML = `
                <div style="margin-top:24px; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                    <span class="badge badge-mood" style="font-size:0.9rem;">${variant.mood}</span>
                    <span class="badge badge-tense" style="font-size:0.9rem;">${variant.tense}</span>
                </div>
                <div class="conjugation-grid"></div>
            `;

            const grid = section.querySelector('.conjugation-grid');

            // Determine rows based on content
            let rows = [];

            if (variant.conjugation.form) {
                // Single form (Participle/Gerund)
                rows = [{ label: '活用', value: variant.conjugation.form }];
            } else {
                // Standard or Partial Person list
                const standardOrder = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];
                const labels = {
                    yo: 'yo', tu: 'tú', el: 'él/ella',
                    nosotros: 'nosotros', vosotros: 'vosotros', ellos: 'ellos'
                };

                standardOrder.forEach(key => {
                    const val = variant.conjugation[key];
                    if (val && val !== '-') {
                        rows.push({ label: labels[key], value: val });
                    }
                });
            }

            rows.forEach(r => {
                const row = document.createElement('div');
                row.className = 'conjugation-row';
                row.innerHTML = `
                    <span class="person-tag">${r.label}</span>
                    <span class="conjugation-value">${r.value}</span>
                `;
                grid.appendChild(row);
            });

            gridContainer.appendChild(section);
        });

        this.showScreen('detail');
    }
};

export function initUI() {
    UI.init();
}
