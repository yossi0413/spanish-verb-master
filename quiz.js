// Quiz logic module
import { verbs, getStarredVerbs } from './data.js?v=1.5';

export class QuizSession {
    constructor(mode = 'input', onlyStarred = false, filter = null) {
        this.mode = mode; // 'input'
        this.onlyStarred = onlyStarred;
        this.filter = filter; // Array of { mood, tense } objects or null

        // Endless mode stats
        this.totalAnswered = 0;
        this.correctCount = 0;
        this.history = [];
        this.currentQuestion = null;

        // Initialize source pool
        this.updateSourceVerbs();
    }

    hasValidConjugation(verb) {
        if (!verb || !verb.conjugation) return false;
        return Object.keys(verb.conjugation).some(k => {
            const val = verb.conjugation[k];
            return val && val !== '-' && val.trim() !== '';
        });
    }

    updateSourceVerbs() {
        let candidates = this.onlyStarred ? getStarredVerbs() : verbs;

        if (this.filter && this.filter.length > 0) {
            candidates = candidates.filter(v => {
                return this.filter.some(f => f.mood === v.mood && f.tense === v.tense);
            });
        }

        this.sourceVerbs = candidates.filter(v => this.hasValidConjugation(v));
    }

    nextQuestion() {
        // Refresh source pool if dynamic changes happen (though usually static during session)
        if (this.onlyStarred) {
            this.updateSourceVerbs();
        }

        if (this.sourceVerbs.length === 0) {
            return null; // No verbs available
        }

        // Try to pick a valid question
        // Since we filtered sourceVerbs, any verb here SHOULD have at least one valid key.
        // However, to be absolutely safe against runtime mutations or edge cases, we avoid unchecked recursion.

        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const randomVerb = this.sourceVerbs[Math.floor(Math.random() * this.sourceVerbs.length)];



            // Dynamic person selection based on available conjugation keys
            const availableKeys = Object.keys(randomVerb.conjugation).filter(k => {
                const val = randomVerb.conjugation[k];
                return val && val !== '-' && val.trim() !== '';
            });

            if (availableKeys.length > 0) {
                const randomPerson = availableKeys[Math.floor(Math.random() * availableKeys.length)];
                const correctAnswerStr = randomVerb.conjugation[randomPerson];

                this.currentQuestion = {
                    type: 'input',
                    verb: randomVerb,
                    person: randomPerson,
                    answer: correctAnswerStr
                };

                return this.currentQuestion;
            }

            attempts++;
        }

        // If we failed after max attempts (should be impossible with pre-filtering), return null to avoid hang
        console.warn('Failed to generate valid question after multiple attempts.');
        return null;
    }

    getCurrentQuestion() {
        return this.currentQuestion;
    }

    submitAnswer(userAnswer) {
        if (!this.currentQuestion) return null;

        const currentQ = this.currentQuestion;
        const isCorrect = this.checkInputAnswer(userAnswer, currentQ.answer);

        this.totalAnswered++;
        if (isCorrect) this.correctCount++;

        const result = {
            question: currentQ,
            userAnswer: userAnswer,
            correct: isCorrect
        };

        this.history.push(result);
        return result;
    }

    checkInputAnswer(input, correct) {
        if (!input) return false;
        return input.trim().toLowerCase() === correct.trim().toLowerCase();
    }

    getStats() {
        return {
            total: this.totalAnswered,
            correct: this.correctCount,
            accuracy: this.totalAnswered === 0 ? 0 : Math.round((this.correctCount / this.totalAnswered) * 100)
        };
    }
}
