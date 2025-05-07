import * as alphaTab from 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.mjs';

class AlphaTabManager {
    static #instance = null;
    #api = null;
    #config = {
        display: {
            scale: 1.2,
            staveProfile: alphaTab.StaveProfile.ScoreTab,
            layoutMode: alphaTab.LayoutMode.Page
        },
        player: {
            enablePlayer: true,
            soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@alpha/dist/soundfont/sonivox.sf2',
            scrollMode: alphaTab.ScrollMode.Continuous,
            scrollSpeed: 300
        }
    };

    constructor() {
        if (AlphaTabManager.#instance) {
            return AlphaTabManager.#instance;
        }
        AlphaTabManager.#instance = this;
    }

    static getInstance() {
        if (!AlphaTabManager.#instance) {
            AlphaTabManager.#instance = new AlphaTabManager();
        }
        return AlphaTabManager.#instance;
    }

    initialize(element, customConfig = {}) {
        if (this.#api) {
            console.warn('AlphaTab已经初始化');
            return this.#api;
        }

        const mergedConfig = {
            ...this.#config,
            ...customConfig,
            display: {
                ...this.#config.display,
                ...(customConfig.display || {})
            },
            player: {
                ...this.#config.player,
                ...(customConfig.player || {})
            }
        };

        this.#api = new alphaTab.AlphaTabApi(element, mergedConfig);
        return this.#api;
    }

    getApi() {
        if (!this.#api) {
            throw new Error('AlphaTab尚未初始化');
        }
        return this.#api;
    }

    destroy() {
        if (this.#api) {
            this.#api.destroy();
            this.#api = null;
        }
    }
}

export default AlphaTabManager;