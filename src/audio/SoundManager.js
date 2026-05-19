export class SoundManager {
  constructor() {
    this.bgmVolume = parseFloat(localStorage.getItem('bgmVolume') ?? '0.5');
    this.seVolume = parseFloat(localStorage.getItem('seVolume') ?? '0.7');
    this.muted = localStorage.getItem('muted') === 'true';

    this.bgm = null;
    this.sounds = {};
    this._loadSounds();
  }

  _loadSounds() {
    const seFiles = ['drop', 'rotate', 'line-clear', 'gameover'];
    seFiles.forEach(name => {
      try {
        const audio = new Audio(`./sounds/${name}.mp3`);
        audio.volume = this.muted ? 0 : this.seVolume;
        this.sounds[name] = audio;
      } catch (e) {}
    });

    try {
      this.bgm = new Audio('./sounds/bgm.mp3');
      this.bgm.loop = true;
      this.bgm.volume = this.muted ? 0 : this.bgmVolume;
    } catch (e) {}
  }

  playBGM() {
    if (!this.bgm) return;
    try {
      this.bgm.currentTime = 0;
      this.bgm.play().catch(() => {});
    } catch (e) {}
  }

  stopBGM() {
    if (!this.bgm) return;
    try {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    } catch (e) {}
  }

  pauseBGM() {
    if (!this.bgm) return;
    try { this.bgm.pause(); } catch (e) {}
  }

  resumeBGM() {
    if (!this.bgm) return;
    try { this.bgm.play().catch(() => {}); } catch (e) {}
  }

  playSE(name) {
    const src = this.sounds[name];
    if (!src) return;
    try {
      const clone = src.cloneNode();
      clone.volume = this.muted ? 0 : this.seVolume;
      clone.play().catch(() => {});
    } catch (e) {}
  }

  setBGMVolume(v) {
    this.bgmVolume = v;
    localStorage.setItem('bgmVolume', v);
    if (this.bgm) this.bgm.volume = this.muted ? 0 : v;
  }

  setSEVolume(v) {
    this.seVolume = v;
    localStorage.setItem('seVolume', v);
    Object.values(this.sounds).forEach(a => { a.volume = this.muted ? 0 : v; });
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('muted', this.muted);
    if (this.bgm) this.bgm.volume = this.muted ? 0 : this.bgmVolume;
    Object.values(this.sounds).forEach(a => { a.volume = this.muted ? 0 : this.seVolume; });
    return this.muted;
  }
}
