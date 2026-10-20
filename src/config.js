// ============================================================
// アプリ設定（環境ごとに変える値はここにまとめる）
// ============================================================

// GAS(Google Apps Script) Web App のURL
// GASを「新しいデプロイ」で作り直してURLが変わった場合はここだけ書き換える
// （「デプロイを管理」→「新バージョン」での更新ならURLは変わりません）
export const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwGBp9Nq-6QqbOx1-uhk-tVK1Es2-aCtfZaERt9HPawi1i9DxQ3nrWM4Uo_5mmUydaK_Q/exec'

// 画面（フロントエンド）のバージョン
// 機能を追加・修正したら上げる。GAS側 Code.gs の APP_VERSION と揃えておくと、
// GASの再デプロイ忘れを画面上で検知できます。
export const APP_VERSION = '4.2.1'

// ビルド日時（vite.config.js で自動埋め込み）
// eslint-disable-next-line no-undef
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''

export const APP_NAME = '人生の棚卸し年表'
