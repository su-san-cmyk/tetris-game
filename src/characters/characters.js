// SVG face for each character — unique gradient IDs to avoid conflicts in shared DOM
const FACE_EMERA = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="em-g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#7FBFCC"/>
      <stop offset="100%" stop-color="#0A3545"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#em-g)" stroke="#5F9EA0" stroke-width="2"/>
  <!-- 左眉：まっすぐ穏やか -->
  <path d="M 29 36 Q 37 32 44 35" stroke="#0d3040" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <!-- 右眉 -->
  <path d="M 56 35 Q 63 32 71 36" stroke="#0d3040" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <!-- 左目 -->
  <ellipse cx="37" cy="47" rx="7" ry="7.5" fill="white"/>
  <ellipse cx="37" cy="47.5" rx="4.8" ry="5" fill="#0d5566"/>
  <ellipse cx="37" cy="47.5" rx="2.8" ry="3" fill="#071e26"/>
  <circle cx="34.5" cy="45" r="2" fill="white" opacity="0.85"/>
  <!-- 右目 -->
  <ellipse cx="63" cy="47" rx="7" ry="7.5" fill="white"/>
  <ellipse cx="63" cy="47.5" rx="4.8" ry="5" fill="#0d5566"/>
  <ellipse cx="63" cy="47.5" rx="2.8" ry="3" fill="#071e26"/>
  <circle cx="60.5" cy="45" r="2" fill="white" opacity="0.85"/>
  <!-- 口：ほんのり微笑み -->
  <path d="M 40 64 Q 50 70 60 64" stroke="#0d3040" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;

const FACE_AQUA = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="aq-g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#F0FAFF"/>
      <stop offset="100%" stop-color="#6BBCD4"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#aq-g)" stroke="#A8D8EA" stroke-width="2"/>
  <!-- ほっぺ（丸くやわらか） -->
  <ellipse cx="19" cy="61" rx="11" ry="8" fill="#FFB3C6" opacity="0.38"/>
  <ellipse cx="81" cy="61" rx="11" ry="8" fill="#FFB3C6" opacity="0.38"/>
  <!-- 左眉：やさしくアーチ -->
  <path d="M 26 36 Q 36 29 44 34" stroke="#5B9AB5" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <!-- 右眉 -->
  <path d="M 56 34 Q 64 29 74 36" stroke="#5B9AB5" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <!-- 左目（大きくまん丸） -->
  <ellipse cx="37" cy="48" rx="9" ry="9.5" fill="white"/>
  <ellipse cx="37" cy="48.5" rx="6" ry="6.5" fill="#3A8FB5"/>
  <ellipse cx="37" cy="48.5" rx="3.2" ry="3.5" fill="#1a2a45"/>
  <circle cx="34" cy="45.5" r="2.2" fill="white" opacity="0.9"/>
  <!-- 右目 -->
  <ellipse cx="63" cy="48" rx="9" ry="9.5" fill="white"/>
  <ellipse cx="63" cy="48.5" rx="6" ry="6.5" fill="#3A8FB5"/>
  <ellipse cx="63" cy="48.5" rx="3.2" ry="3.5" fill="#1a2a45"/>
  <circle cx="60" cy="45.5" r="2.2" fill="white" opacity="0.9"/>
  <!-- 口：おおきな笑顔 -->
  <path d="M 33 64 Q 50 78 67 64" stroke="#5B9AB5" stroke-width="2.8" fill="none" stroke-linecap="round"/>
</svg>`;

const FACE_FLAME = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fl-g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FF9B6A"/>
      <stop offset="100%" stop-color="#8B1A0A"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#fl-g)" stroke="#C0392B" stroke-width="2"/>
  <!-- 左眉：内側に向かってつり上がる（強い表情） -->
  <path d="M 24 34 L 43 42" stroke="#4A0A00" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <!-- 右眉 -->
  <path d="M 76 34 L 57 42" stroke="#4A0A00" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <!-- 左目（細くするどい） -->
  <ellipse cx="37" cy="50" rx="8" ry="5.5" fill="#1a0500"/>
  <ellipse cx="37" cy="50" rx="5" ry="3.2" fill="#FF3300"/>
  <circle cx="34.5" cy="48" r="1.8" fill="white" opacity="0.65"/>
  <!-- 右目 -->
  <ellipse cx="63" cy="50" rx="8" ry="5.5" fill="#1a0500"/>
  <ellipse cx="63" cy="50" rx="5" ry="3.2" fill="#FF3300"/>
  <circle cx="60.5" cy="48" r="1.8" fill="white" opacity="0.65"/>
  <!-- 口：グッとこらえた強い表情（への字気味） -->
  <path d="M 37 66 Q 50 62 63 66" stroke="#4A0A00" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <!-- こめかみの線（力入ってる） -->
  <path d="M 18 42 Q 22 38 20 34" stroke="#C0392B" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.6"/>
  <path d="M 82 42 Q 78 38 80 34" stroke="#C0392B" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.6"/>
</svg>`;

const FACE_SHADOW = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sh-g" cx="38%" cy="33%" r="65%">
      <stop offset="0%" stop-color="#5D7A8A"/>
      <stop offset="100%" stop-color="#111E28"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#sh-g)" stroke="#2C3E50" stroke-width="2"/>
  <!-- 左眉：ちょっと上がってる（インテリ感） -->
  <path d="M 20 33 Q 31 27 42 32" stroke="#BDC3C7" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- 右眉：フラット -->
  <path d="M 58 32 Q 68 28 78 32" stroke="#BDC3C7" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- 眼鏡レンズ左 -->
  <rect x="17" y="40" width="29" height="19" rx="5" ry="5"
        fill="rgba(255,255,255,0.06)" stroke="#ECF0F1" stroke-width="2.5"/>
  <!-- 眼鏡レンズ右 -->
  <rect x="54" y="40" width="29" height="19" rx="5" ry="5"
        fill="rgba(255,255,255,0.06)" stroke="#ECF0F1" stroke-width="2.5"/>
  <!-- 眼鏡ブリッジ -->
  <line x1="46" y1="49.5" x2="54" y2="49.5" stroke="#ECF0F1" stroke-width="2.5"/>
  <!-- 眼鏡アーム -->
  <line x1="17" y1="49.5" x2="6" y2="47" stroke="#ECF0F1" stroke-width="2"/>
  <line x1="83" y1="49.5" x2="94" y2="47" stroke="#ECF0F1" stroke-width="2"/>
  <!-- 目（レンズ越し） -->
  <ellipse cx="31.5" cy="49.5" rx="5.5" ry="5.5" fill="#0d1a22"/>
  <ellipse cx="31.5" cy="49.5" rx="3.2" ry="3.2" fill="#1C4060"/>
  <circle cx="29.5" cy="47.5" r="1.6" fill="white" opacity="0.7"/>
  <ellipse cx="68.5" cy="49.5" rx="5.5" ry="5.5" fill="#0d1a22"/>
  <ellipse cx="68.5" cy="49.5" rx="3.2" ry="3.2" fill="#1C4060"/>
  <circle cx="66.5" cy="47.5" r="1.6" fill="white" opacity="0.7"/>
  <!-- 口：おだやかな知的な微笑み -->
  <path d="M 39 67 Q 50 74 61 67" stroke="#BDC3C7" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;

export const CHARACTERS = [
  {
    id: 'emera',
    name: 'エメラ',
    subtitle: '穏やかな頼れる存在',
    description: 'どんな状況も冷静にこなす、バランスのとれた性格。みんなの安心感。',
    emoji: '💎',
    svgFace: FACE_EMERA,
    color: '#0F4C5C',
    accentColor: '#5F9EA0',
    bgGradient: 'linear-gradient(135deg, #0F4C5C 0%, #5F9EA0 100%)',
    clearEffect: 'flash',
  },
  {
    id: 'aqua',
    name: 'アクア',
    subtitle: '明るくマイペース',
    description: 'のんびりしているけど笑顔が絶えない。周りをほっこりさせる存在。',
    emoji: '🌊',
    svgFace: FACE_AQUA,
    color: '#A8D8EA',
    accentColor: '#E8ECEF',
    bgGradient: 'linear-gradient(135deg, #A8D8EA 0%, #E8ECEF 100%)',
    clearEffect: 'ripple',
  },
  {
    id: 'flame',
    name: 'フレイム',
    subtitle: '熱血・負けず嫌い',
    description: '勝つためなら全力を出し惜しまない。その情熱が周りを巻き込む。',
    emoji: '🔥',
    svgFace: FACE_FLAME,
    color: '#E74C3C',
    accentColor: '#E67E22',
    bgGradient: 'linear-gradient(135deg, #E74C3C 0%, #E67E22 100%)',
    clearEffect: 'burn',
  },
  {
    id: 'shadow',
    name: 'シャドウ',
    subtitle: '冷静沈着な戦略家',
    description: '言葉は少ないが、一手一手に深い意図がある。読めない存在。',
    emoji: '🌑',
    svgFace: FACE_SHADOW,
    color: '#2C3E50',
    accentColor: '#7F8C8D',
    bgGradient: 'linear-gradient(135deg, #2C3E50 0%, #7F8C8D 100%)',
    clearEffect: 'glitch',
  },
];
