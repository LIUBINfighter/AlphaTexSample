class EventBus {
    constructor() {
        this._events = new Map();
    }

    on(event, listener) {
        if (!this._events.has(event)) {
            this._events.set(event, new Set());
        }
        this._events.get(event).add(listener);
        return this;
    }

    once(event, listener) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            listener(...args);
        };
        return this.on(event, onceWrapper);
    }

    off(event, listener) {
        if (this._events.has(event)) {
            const listeners = this._events.get(event);
            listeners.delete(listener);
            if (listeners.size === 0) {
                this._events.delete(event);
            }
        }
        return this;
    }

    emit(event, ...args) {
        if (this._events.has(event)) {
            const listeners = new Set(this._events.get(event));
            listeners.forEach(listener => {
                try {
                    listener(...args);
                } catch (e) {
                    console.error(`EventBus error in ${event} listener:`, e);
                }
            });
        }
    }

    clear() {
        this._events.clear();
        return this;
    }
}

// 导出单例实例
const eventBus = new EventBus();
export default eventBus;