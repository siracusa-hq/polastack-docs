#!/usr/bin/env node
/**
 * ブランドアセット同期スクリプト。
 * 正本 = Polastack_GTM brand-assets/（readonly マウント）。使用規程は正本側 USAGE.md。
 * 共通ルールは親ワークスペース websites-workspace/CLAUDE.md「ブランドアセット」節。
 *
 * 本スクリプトは正本の manifest.json に列挙されたファイルだけを配布先へコピーする
 * （manifest に載るまでは正本にファイルが増えても配布されない＝意図しない配布を防ぐ）。
 * 配布先は丸ごと生成物であり手編集禁止。修正は正本側で行い、本スクリプトを再実行する。
 *
 * **全サイトで同一のファイルを配置する（サイト固有の差分を入れない）。**
 * サイトごとの違い（取り込むブランド・配布先）は、リポジトリ直下の brand.config.json で持つ:
 *
 *   { "out": "public/brand", "include": ["corporate", "peerdesk"] }
 *
 *   out     配布先（リポジトリ直下からの相対パス。省略時 public/brand）
 *           モノレポではアプリ配下を指す（例: Polastack の "lp/public/brand"）
 *   include 取り込むブランド（manifest.json の brands のキー）
 *
 * 実行:
 *   npm run sync:brand              同期（package.json を持つサイト）
 *   node scripts/sync-brand.mjs     同期（package.json を持たない静的サイト）
 *   ↑ に --check を付けると乖離検査のみ（正本と生成物をハッシュで突合）
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// 正本の場所。devcontainer のマウント先 → ホスト実パス（= sandbox の ro マウント先と同一）の順で解決する
// （sync-legal.mjs の既定はホストパスのみだが、どの環境でも動くよう候補を並べる）
const GTM_CANDIDATES = [
  process.env.POLASTACK_GTM_DIR,
  '/workspaces/Polastack_GTM',
  '/Users/jesuisneko/Development/Polastack_GTM',
].filter(Boolean);
const GTM_ROOT = GTM_CANDIDATES.find((p) => existsSync(join(p, 'brand-assets', 'manifest.json')));

// バージョン記録はビルド管理用メタデータなので公開領域（public/）の外に置く
// （public/ はそのまま配信物へ素通しされるため、配下に置くと本番へ公開されてしまう）
const VERSION_FILE = join(REPO_ROOT, '.brand-version');
const CONFIG_FILE = join(REPO_ROOT, 'brand.config.json');

// package.json の無い静的サイトでも動く。エラーメッセージの実行例だけ環境に合わせる
const CMD = existsSync(join(REPO_ROOT, 'package.json')) ? 'npm run sync:brand' : 'node scripts/sync-brand.mjs';

const checkOnly = process.argv.includes('--check');

if (!GTM_ROOT) {
  console.error(
    `Polastack_GTM がマウントされていません（brand-assets/manifest.json が見つからない）。\n` +
      `探した場所: ${GTM_CANDIDATES.join(' , ')}\nPOLASTACK_GTM_DIR で指定できます。`,
  );
  process.exit(checkOnly ? 0 : 1); // マウントのない環境（Netlify 等）では check はスキップ扱い
}
if (!existsSync(CONFIG_FILE)) {
  console.error(`brand.config.json がリポジトリ直下にありません（out・include を書く設定ファイル）。`);
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
const include = cfg.include;
const OUT_DIR = resolve(REPO_ROOT, cfg.out ?? 'public/brand');
const OUT_REL = relative(REPO_ROOT, OUT_DIR);

// 配布先は毎回 rmSync で作り直すため、リポジトリ内の専用ディレクトリであることを必ず確かめる
// （設定ミスでリポジトリ全体や外部ディレクトリを消さないための歯止め）
if (!OUT_DIR.startsWith(REPO_ROOT + sep) || OUT_DIR === REPO_ROOT) {
  console.error(`brand.config.json の out がリポジトリ外を指しています: ${cfg.out}`);
  process.exit(1);
}
if (!Array.isArray(include) || include.length === 0) {
  console.error('brand.config.json の include（取り込むブランドの配列）が未設定です。');
  process.exit(1);
}

const SRC_DIR = join(GTM_ROOT, 'brand-assets');
const manifest = JSON.parse(readFileSync(join(SRC_DIR, 'manifest.json'), 'utf8'));

// コピー対象の対応表を作る。corporate/ は配布先の直下へ（プロダクトと違いブランド名の階層を挟まない）
const entries = [];
for (const brand of include) {
  const def = manifest.brands[brand];
  if (!def) {
    console.error(`manifest.json に無いブランドが指定されています: ${brand}`);
    process.exit(1);
  }
  for (const file of def.files) {
    entries.push({
      src: join(SRC_DIR, brand, file),
      dest: brand === 'corporate' ? join(OUT_DIR, file) : join(OUT_DIR, brand, file),
    });
  }
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const listFiles = (dir) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir, { recursive: true })
        .map(String)
        .filter((f) => statSync(join(dir, f)).isFile());

let failed = false;

if (checkOnly) {
  for (const { src, dest } of entries) {
    const rel = relative(REPO_ROOT, dest);
    if (!existsSync(dest)) {
      console.log(`DRIFT ${rel} ← 生成物がありません。${CMD} で再同期してください`);
      failed = true;
    } else if (sha(readFileSync(src)) !== sha(readFileSync(dest))) {
      console.log(`DRIFT ${rel} ← 正本と内容が異なります。${CMD} で再同期してください`);
      failed = true;
    }
  }
  // 対応表にない余剰ファイル（手置き・旧ブランドの残骸）も乖離として扱う
  const expected = new Set(entries.map((e) => e.dest));
  for (const f of listFiles(OUT_DIR)) {
    const abs = join(OUT_DIR, f);
    if (!expected.has(abs)) {
      console.log(`DRIFT ${relative(REPO_ROOT, abs)} ← 正本に無い余剰ファイルです`);
      failed = true;
    }
  }
  const recorded = existsSync(VERSION_FILE) ? readFileSync(VERSION_FILE, 'utf8').trim() : '(なし)';
  if (recorded !== manifest.version) {
    console.log(`DRIFT .brand-version（${recorded}）← 正本は ${manifest.version} です`);
    failed = true;
  }
  if (!failed) console.log(`OK    ${OUT_REL}/（${entries.length} ファイル・version ${manifest.version}）`);
} else {
  // 配布先は丸ごと生成物なので、作り直しで余剰も掃除する
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const { src, dest } of entries) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(src)); // Buffer のまま = バイナリ安全
  }
  // VERSION_FILE はリポジトリ直下にあり、上の rmSync(OUT_DIR) の対象外（毎回上書きで更新）
  writeFileSync(VERSION_FILE, `${manifest.version}\n`);
  console.log(`WRITE ${OUT_REL}/（${entries.length} ファイル・version ${manifest.version}）`);
}

process.exit(failed ? 1 : 0);
