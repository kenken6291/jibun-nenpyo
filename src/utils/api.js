// GAS(Google Apps Script) Web App のURLは src/config.js で設定します
import { GAS_API_URL } from '../config.js'

export { GAS_API_URL }

const SESSION_KEY = 'jibun-nenpyo-session'

async function callApi(action, payload = {}) {
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    // text/plain にすることでブラウザのCORSプリフライト(OPTIONS)を回避する
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  })
  if (!res.ok) {
    throw new Error('通信に失敗しました。時間をおいて再度お試しください。')
  }
  return res.json()
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function storeSession(sessionToken, nickname, email) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionToken, nickname, email }))
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY)
}

export const authApi = {
  register: (email, nickname, fullName) => callApi('register', { email, nickname, fullName }),
  login: (email, password, agreedToTerms) => callApi('login', { email, password, agreedToTerms }),
  changePassword: (email, currentPassword, newPassword) =>
    callApi('changePassword', { email, currentPassword, newPassword }),
  forgotPassword: (email) => callApi('forgotPassword', { email }),
  validateSession: (sessionToken) => callApi('validateSession', { sessionToken }),
  updateNickname: (sessionToken, newNickname) => callApi('updateNickname', { sessionToken, newNickname }),
  logout: (sessionToken) => callApi('logout', { sessionToken }),
}

// 年表データ（プロフィール・出来事）のクラウド保存用API
// すべて sessionToken による認証必須
export const dataApi = {
  getData: (sessionToken) => callApi('getData', { sessionToken }),
  updateProfile: (sessionToken, profile) => callApi('updateProfile', { sessionToken, profile }),
  addEntry: (sessionToken, entry) => callApi('addEntry', { sessionToken, entry }),
  updateEntry: (sessionToken, id, entry) => callApi('updateEntry', { sessionToken, id, entry }),
  deleteEntry: (sessionToken, id) => callApi('deleteEntry', { sessionToken, id }),
  uploadPhoto: (sessionToken, filename, mimeType, base64Data) =>
    callApi('uploadPhoto', { sessionToken, filename, mimeType, base64Data }),
  // PDFファイルのアップロード（Googleドライブ保存）
  uploadFile: (sessionToken, filename, mimeType, base64Data) =>
    callApi('uploadFile', { sessionToken, filename, mimeType, base64Data }),
}

// 年表の限定共有（指定した登録会員だけが閲覧できる）用API
export const shareApi = {
  getShareSettings: (sessionToken) => callApi('getShareSettings', { sessionToken }),
  saveShareSettings: (sessionToken, shares) => callApi('saveShareSettings', { sessionToken, shares }),
  listSharedWithMe: (sessionToken) => callApi('listSharedWithMe', { sessionToken }),
  getSharedTimeline: (sessionToken, ownerId) => callApi('getSharedTimeline', { sessionToken, ownerId }),
}

// サーバー（GAS）のバージョン取得（認証不要）
export const systemApi = {
  getVersion: () => callApi('getVersion'),
}
