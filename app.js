// Main application entry point
import { initData } from './data.js?v=1.5';
import { initUI } from './ui.js?v=1.5';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initializing...');

    try {
        await initData();
        initUI();

        // Prevent double-tap zoom on mobile
        document.addEventListener('dblclick', (e) => {
            e.preventDefault();
        }, { passive: false });

    } catch (error) {
        console.error('Initialization failed:', error);
    }
});
