// 文書の読み取りと整合性チェック（TEAM 4.5）。check-docs.mjs・bump-version.mjs・単体テストが使う。
// プロセスの文書の `doc/` は、このリポジトリでは `docs/` と読み替える（LLM-IDK-0001）。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

export const PREFIX = 'LLM';

/** 種類 → 略・置き場所・PO の承認（OPTION 5.1・TEAM 2.1） */
export const TYPES = {
  'inception-deck': { abbr: 'IDK', dir: '00-product', approval: true },
  'product-goal': { abbr: 'PG', dir: '00-product', approval: true },
  'product-backlog-item': { abbr: 'PBI', dir: '01-pbi', approval: true },
  'system-architecture': { abbr: 'SA', dir: '02-architecture', approval: false },
  'technology-stack': { abbr: 'TS', dir: '02-architecture', approval: false },
  'architecture-decision': { abbr: 'ADR', dir: '02-architecture', approval: false },
  'gui-design': { abbr: 'GUI', dir: '03-gui', approval: true },
  'technical-design': { abbr: 'TD', dir: '04-design', approval: false },
  'test-strategy': { abbr: 'TST', dir: '05-test', approval: false },
  'test-case': { abbr: 'TC', dir: '05-test', approval: false },
  'attested-computation': { abbr: 'AC', dir: '07-increments', approval: true },
};
const ABBR_TO_TYPE = Object.fromEntries(Object.entries(TYPES).map(([t, v]) => [v.abbr, t]));
const DOC_DIRS = [...new Set(Object.values(TYPES).map((t) => t.dir))];
const REQUIRED = ['id', 'type', 'title', 'status', 'version', 'updated', 'sources', 'verified'];
const STATUSES = ['draft', 'review', 'stable'];
const BACKLOG_STATES = ['未整理', '準備 OK', 'スプリント中', '完成', 'リリース済み', '取り下げ'];

const ID_RE = new RegExp(`\\b${PREFIX}-(${Object.keys(ABBR_TO_TYPE).join('|')})-(\\d{4})\\b(?!-\\d)`, 'g');
const CONF_ID_RE = new RegExp(`\\b${PREFIX}-TC-\\d{4}-\\d{2}\\b`, 'g');

const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
}) : []);

/** frontmatter（このチームの形だけ）を読む */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return null;
  const fm = {};
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      fm[listKey].push(item[1].trim());
      continue;
    }
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      fm[key] = [];
      listKey = key;
    } else {
      fm[key] = value.trim();
      listKey = null;
    }
  }
  return { fm, body: text.slice(m[0].length) };
}

/** sources の 1 行から、参照先と版を取り出す（版の書き方は「（v1.0）」「(v1.1)」） */
export function parseSource(entry) {
  const ver = /[（(]v(\d+\.\d+)[）)]/.exec(entry)?.[1] ?? null;
  const id = new RegExp(`^${PREFIX}-[A-Z]+-\\d{4}`).exec(entry)?.[0] ?? null;
  const path = /^(docs\/[^\s（(]+)/.exec(entry)?.[1] ?? null;
  return { id, path, version: ver };
}

/** docs/ の中の ID を持つ文書を読む */
export function loadDocs(root) {
  const docs = [];
  for (const d of DOC_DIRS) {
    for (const file of walk(join(root, 'docs', d))) {
      // ID を持つ文書だけ（product-backlog.md などの ID のない文書は除く）
      if (!file.endsWith('.md') || !basename(file).startsWith(`${PREFIX}-`)) continue;
      const text = readFileSync(file, 'utf8');
      const parsed = parseFrontmatter(text);
      docs.push({ file, rel: relative(root, file).split(sep).join('/'), dir: d, text, fm: parsed?.fm ?? null, body: parsed?.body ?? text });
    }
  }
  return docs;
}

/** ID のない文書（仕様書・完成の定義）の版：本文の「版：v1.1」 */
function plainVersion(root, path) {
  const file = join(root, path);
  if (!existsSync(file)) return undefined;
  return /版：v(\d+\.\d+)/.exec(readFileSync(file, 'utf8'))?.[1] ?? null;
}

/** プロダクトバックログの表の行 */
export function parseBacklog(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 8 || !/^\d+$/.test(cells[1] ?? '')) continue;
    rows.push({ order: Number(cells[1]), id: cells[2], title: cells[3], theme: cells[4], size: cells[5], state: cells[6] });
  }
  return rows;
}

/** test-case の表の確認 ID と方法 */
function parseTestCaseRows(body) {
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    const id = cells[1];
    if (!id || !/^LLM-TC-\d{4}-\d{2}$/.test(id)) continue;
    rows.push({ id, method: cells[3] ?? '' });
  }
  return rows;
}

/**
 * 整合性チェック。エラーの文の配列を返す。
 * @param {string} root リポジトリの根
 * @param {{ strict?: boolean }} [opts] strict：未実装・未記録も 0 に（プロダクトゴールを確かめるリリース）
 */
export function checkDocs(root, opts = {}) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const docs = loadDocs(root);
  const byId = new Map();

  // 1. ID・ファイル名・フォルダ・frontmatter
  for (const doc of docs) {
    if (!doc.fm) { err(doc.rel, 'frontmatter がない'); continue; }
    for (const k of REQUIRED) if (!(k in doc.fm)) err(doc.rel, `frontmatter に ${k} がない`);
    const { id, type, status, version } = doc.fm;
    const t = TYPES[type];
    if (!t) { err(doc.rel, `知らない type: ${type}`); continue; }
    const idRe = new RegExp(`^${PREFIX}-${t.abbr}-\\d{4}$`);
    if (!idRe.test(id ?? '')) err(doc.rel, `id が ${PREFIX}-${t.abbr}-<4 桁> でない: ${id}`);
    if (basename(doc.file) !== `${id}-${type}-ja.md`) err(doc.rel, `ファイル名が ${id}-${type}-ja.md でない`);
    if (doc.dir !== t.dir) err(doc.rel, `置き場所が docs/${t.dir} でない`);
    if (!STATUSES.includes(status)) err(doc.rel, `status が ${STATUSES.join('|')} でない: ${status}`);
    if (!/^\d+\.\d+$/.test(version ?? '')) err(doc.rel, `version が「数.数」でない: ${version}`);
    if (!Array.isArray(doc.fm.sources)) err(doc.rel, 'sources が一覧でない');
    if (type === 'product-backlog-item' && !doc.fm.theme) err(doc.rel, 'PBI に theme がない');
    if (byId.has(id)) err(doc.rel, `id が重なっている: ${id}（${byId.get(id).rel}）`);
    else byId.set(id, doc);
    // 承認のある種類の stable には verified が要る（AC は review のままでよい）
    if (t.approval && status === 'stable' && (!doc.fm.verified || doc.fm.verified === 'null')) err(doc.rel, '承認のある種類が stable なのに verified がない');
  }

  // 2. sources と本文の参照
  for (const doc of docs) {
    if (!doc.fm || !Array.isArray(doc.fm.sources)) continue;
    for (const entry of doc.fm.sources) {
      const s = parseSource(entry);
      // TASK はファイルを作らない（OPTION 5.1）。スプリントバックログの表にあるので、ここでは確かめない
      if (s.id?.startsWith(`${PREFIX}-TASK-`)) continue;
      if (s.id) {
        const src = byId.get(s.id);
        if (!src) { err(doc.rel, `sources の ${s.id} がない`); continue; }
        if (s.version === null) err(doc.rel, `sources の ${s.id} に版がない`);
        else if (s.version !== src.fm.version) err(doc.rel, `sources の ${s.id} の版 v${s.version} が今の版 v${src.fm.version} でない`);
        if (doc.fm.status === 'stable' && src.fm.status !== 'stable') err(doc.rel, `stable なのに sources の ${s.id} が ${src.fm.status}`);
      } else if (s.path) {
        const v = plainVersion(root, s.path);
        if (v === undefined) err(doc.rel, `sources のファイルがない: ${s.path}`);
        else if (s.version !== null && v !== null && v !== s.version) err(doc.rel, `sources の ${s.path} の版 v${s.version} が今の版 v${v} でない`);
      }
    }
    for (const m of doc.body.matchAll(ID_RE)) {
      if (!byId.has(m[0])) err(doc.rel, `本文の ${m[0]} がない`);
    }
  }

  // 3. 確認 ID：テストのコード ⇔ test-case
  const tcRows = new Map(); // 確認 ID → { method, tc }
  for (const doc of docs.filter((d) => d.fm?.type === 'test-case')) {
    for (const r of parseTestCaseRows(doc.body)) {
      if (!r.id.startsWith(`${doc.fm.id}-`)) err(doc.rel, `確認 ID ${r.id} が ${doc.fm.id} の番号でない`);
      tcRows.set(r.id, { method: r.method, tc: doc.fm.id });
    }
  }
  const codeIds = new Map(); // 確認 ID → ファイル
  for (const dir of ['tests', 'e2e', 'scripts']) {
    for (const file of walk(join(root, dir))) {
      if (!/\.(ts|mjs|js)$/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(CONF_ID_RE)) {
        if (!codeIds.has(m[0])) codeIds.set(m[0], relative(root, file).split(sep).join('/'));
      }
    }
  }
  for (const [id, file] of codeIds) if (!tcRows.has(id)) err(file, `確認 ID ${id} が test-case にない`);

  // 4. プロダクトバックログ ⇔ PBI ⇔ AC
  const backlogPath = join(root, 'docs', '00-product', 'product-backlog.md');
  const backlog = existsSync(backlogPath) ? parseBacklog(readFileSync(backlogPath, 'utf8')) : [];
  if (!existsSync(backlogPath)) err('docs/00-product/product-backlog.md', 'ない');
  const pbis = docs.filter((d) => d.fm?.type === 'product-backlog-item');
  const rowIds = new Set(backlog.map((r) => r.id));
  for (const p of pbis) if (!rowIds.has(p.fm.id)) err(p.rel, 'プロダクトバックログに行がない');
  const doneStates = ['完成', 'リリース済み'];
  for (const row of backlog) {
    const pbi = byId.get(row.id);
    if (!pbi) { err('product-backlog.md', `${row.id} の PBI のファイルがない`); continue; }
    if (!BACKLOG_STATES.includes(row.state)) err('product-backlog.md', `${row.id} の状態が ${BACKLOG_STATES.join('|')} でない: ${row.state}`);
    if (['準備 OK', 'スプリント中', ...doneStates].includes(row.state) && pbi.fm.status !== 'stable') err('product-backlog.md', `${row.id} は「${row.state}」なのに PBI が ${pbi.fm.status}`);
    const num = row.id.slice(-4);
    if (doneStates.includes(row.state)) {
      const ac = byId.get(`${PREFIX}-AC-${num}`);
      if (!ac) err('product-backlog.md', `${row.id} は「${row.state}」なのに ${PREFIX}-AC-${num} がない`);
      else if (row.state === 'リリース済み' && ac.fm.status !== 'stable') err('product-backlog.md', `${row.id} はリリース済みなのに AC が ${ac.fm.status}`);
    }
    // 完成した PBI の確認 ID は、自動ならテストのコードに、手動なら AC にある
    if (doneStates.includes(row.state) || opts.strict) {
      const ac = byId.get(`${PREFIX}-AC-${num}`);
      for (const [id, r] of tcRows) {
        if (r.tc !== `${PREFIX}-TC-${num}`) continue;
        const inCode = codeIds.has(id);
        const inAc = ac ? ac.body.includes(id) : false;
        if (!inCode && !inAc) err(`${PREFIX}-TC-${num}`, `確認 ID ${id} がテストのコードにも AC にもない`);
      }
    }
  }

  // 5. 非機能（9000 番台）の自動の確認 ID はいつもコードにある。strict では手動も AC かどこかにある
  for (const [id, r] of tcRows) {
    if (!/^LLM-TC-9\d{3}-/.test(id)) continue;
    const auto = r.method.includes('自動');
    if (auto && !codeIds.has(id)) err(r.tc, `自動の確認 ID ${id} がテストのコードにない`);
    if (!auto && opts.strict && !docs.some((d) => d.fm?.type === 'attested-computation' && d.body.includes(id))) {
      err(r.tc, `手動の確認 ID ${id} の結果が AC にない（strict）`);
    }
  }

  return errors;
}

/** 版を上げる（TEAM 2.4）。返り値：書き換えたファイルの一覧 */
export function bumpVersion(root, id, { today }) {
  const docs = loadDocs(root);
  const doc = docs.find((d) => d.fm?.id === id);
  if (!doc) throw new Error(`${id} がない`);
  const old = doc.fm.version;
  const [maj, min] = old.split('.').map(Number);
  const next = `${maj}.${min + 1}`;
  const changed = new Map();
  let text = doc.text
    .replace(/^version: .*$/m, `version: ${next}`)
    .replace(/^updated: .*$/m, `updated: ${today}`);
  if (TYPES[doc.fm.type].approval) {
    text = text.replace(/^status: .*$/m, 'status: review').replace(/^verified: .*$/m, 'verified: null');
  }
  changed.set(doc.file, text);
  // 下流の sources の版の表記をそろえる（中身は変えない）
  for (const d of docs) {
    if (d.file === doc.file) continue;
    const re = new RegExp(`(^\\s+-\\s+${id})([（(])v${old.replace('.', '\\.')}([）)])`, 'gm');
    const t = d.text.replace(re, `$1$2v${next}$3`);
    if (t !== d.text) changed.set(d.file, t);
  }
  return { from: old, to: next, changed };
}
