import './style.css';
import { TitleScreen }      from './ui/TitleScreen.js';
import { ModeSelect }       from './ui/ModeSelect.js';
import { DifficultySelect } from './ui/DifficultySelect.js';
import { CharSelect }       from './ui/CharSelect.js';
import { GameScreen }       from './ui/GameScreen.js';
import { CpuGameScreen }    from './ui/CpuGameScreen.js';
import { NetLobbyScreen }   from './ui/NetLobbyScreen.js';
import { NetGameScreen }    from './ui/NetGameScreen.js';
import { GameOver }         from './ui/GameOver.js';
import { SoundManager }     from './audio/SoundManager.js';
import { NetClient }        from './net/NetClient.js';

const app = document.getElementById('app');
const soundManager = new SoundManager();
const net = new NetClient();

let currentScreen   = null;
let currentMode     = 'solo';
let currentDiff     = null;
let netOpponentChar = null;

function swap(screen) {
  currentScreen?.hide?.();
  currentScreen = screen;
}

function showTitle() {
  const s = new TitleScreen(app, soundManager, showModeSelect);
  swap(s); s.show();
}

function showModeSelect() {
  const s = new ModeSelect(app, (mode) => {
    currentMode = mode;
    if (mode === 'cpu') showDiffSelect();
    else if (mode === 'net') showNetLobby();
    else showCharSelect();
  }, showTitle);
  swap(s); s.show();
}

function showDiffSelect() {
  const s = new DifficultySelect(app, (diff) => {
    currentDiff = diff;
    showCharSelect();
  }, showModeSelect);
  swap(s); s.show();
}

function showCharSelect() {
  const backFn = currentMode === 'cpu' ? showDiffSelect : showModeSelect;
  const s = new CharSelect(app, (char) => {
    if (currentMode === 'cpu') showCpuGame(char, currentDiff);
    else if (currentMode === 'net') showNetGame(char);
    else showGame(char);
  }, backFn, currentMode, currentDiff);
  swap(s); s.show();
}

function showNetLobby() {
  const s = new NetLobbyScreen(app, net, () => {
    // 両者マッチ済み → キャラ選択へ（相手のキャラ交換は showNetGame 内で）
    showCharSelect();
  }, showModeSelect);
  swap(s); s.show();
}

function showNetGame(myChar) {
  net.send({ type: 'char_selected', charId: myChar.id });

  app.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#E8ECEF;font-size:18px">
      ⏳ 相手の準備を待っています...
    </div>`;

  import('./characters/characters.js').then(({ CHARACTERS }) => {
    const unsub = net.on('char_selected', ({ charId }) => {
      unsub();
      const opponentChar = CHARACTERS.find(c => c.id === charId);
      if (!opponentChar) return;
      const s = new NetGameScreen(app, myChar, opponentChar, net, soundManager,
        showModeSelect, showTitle);
      swap(s); s.show();
    });

    net.on('_disconnect', () => {
      unsub();
      app.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px">
          <p style="color:#E8ECEF;font-size:18px">接続が切れました</p>
          <button class="btn btn-primary" id="dc-back">戻る</button>
        </div>`;
      document.getElementById('dc-back')?.addEventListener('click', showModeSelect);
    });
  });
}

function showGame(character) {
  const s = new GameScreen(app, character, soundManager,
    (score, level, lines, char) => showGameOver(score, level, lines, char),
    showTitle
  );
  swap(s); s.show();
}

function showCpuGame(character, difficulty) {
  const s = new CpuGameScreen(app, character, difficulty, soundManager,
    (action, char, diff) => {
      if (action === 'retry') showCpuGame(char, diff);
      else showModeSelect();
    },
    showTitle
  );
  swap(s); s.show();
}

function showGameOver(score, level, lines, character) {
  const s = new GameOver(app,
    (char) => showGame(char),
    showTitle
  );
  swap(s); s.show(score, level, lines, character);
}

showTitle();
