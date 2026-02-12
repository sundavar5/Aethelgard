export class Input {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false, rightDown: false };
        this.handlers = {
            'keydown': [],
            'keyup': [],
            'mousedown': [],
            'mouseup': [],
            'mousemove': [],
            'wheel': []
        };

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent context menu
        window.addEventListener('wheel', (e) => this.onWheel(e));
    }

    onKeyDown(e) {
        this.keys[e.code] = true;
        this.emit('keydown', e);
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
        this.emit('keyup', e);
    }

    onMouseDown(e) {
        if (e.button === 0) this.mouse.down = true;
        if (e.button === 2) this.mouse.rightDown = true;
        this.emit('mousedown', e);
    }

    onMouseUp(e) {
        if (e.button === 0) this.mouse.down = false;
        if (e.button === 2) this.mouse.rightDown = false;
        this.emit('mouseup', e);
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.emit('mousemove', e);
    }

    onWheel(e) {
        this.emit('wheel', e);
    }

    on(event, handler) {
        if (this.handlers[event]) {
            this.handlers[event].push(handler);
        }
    }

    emit(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(handler => handler(data));
        }
    }

    isDown(key) {
        return !!this.keys[key];
    }
}
