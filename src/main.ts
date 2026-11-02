import './style.css';
import { formatVersion } from './app/version';

// 組み立て。ゲームの骨組み（ループ・描画・入力）は LLM-TASK-0004 で足す。
const versionText = formatVersion(__APP_VERSION__, __APP_CHANNEL__);

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = versionText;

document.body.dataset.version = versionText;
document.body.dataset.channel = __APP_CHANNEL__;
document.body.dataset.screen = 'boot';
