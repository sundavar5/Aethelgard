export class AudioSystem {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
    }

    play(soundName) {
        if (!this.enabled) return;
        // console.log(`Playing sound: ${soundName}`);
        // Implementation for actual audio playback
    }
}
