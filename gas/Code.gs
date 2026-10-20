/**
 * 人生の棚卸し年表（jibun-nenpyo）バックエンド
 * -----------------------------------------------------------
 * 構成: Google Apps Script (Web App) + Google スプレッドシート
 * フロント: GitHub Pages（jibun-nenpyo）から fetch で呼び出す
 *
 * v2: 認証機能に加え、年表データ（出来事・プロフィール）を
 *     スプレッドシート側に保存するCRUD機能を追加。
 * v4: 指定した登録会員だけに年表を閲覧させる「限定共有」機能を追加。
 *     閲覧者ごとに見せる項目（名前・生年月日・年齢・月・メモ・写真・動画）と
 *     カテゴリーを指定可能。設定は Shares シートに保存（初回利用時に自動作成）。
 * v4.1: GAS URLをフロントのconfig.jsへ分離、getVersion（バージョン情報）を追加。
 *
 * ■ 初回セットアップ手順
 * 1. 新しいGoogleスプレッドシートを作成する
 * 2. 拡張機能 → Apps Script を開き、このファイルの内容を貼り付ける
 * 3. スクリプトエディタで setupSheets 関数を選択して実行する
 *    （Users / Sessions / ConsentLog / Entries の4シートと見出し行が自動作成されます）
 *    ※ 既にv1で運用中の場合も、setupSheetsを再実行すればEntriesシートと
 *      UsersシートのprofileJson列が不足分だけ追加されます（既存データは消えません）
 * 4. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      - 実行するユーザー: 自分
 *      - アクセスできるユーザー: 全員
 * 5. 発行されたウェブアプリURLを、フロント側 src/utils/api.js の
 *    GAS_API_URL に設定する
 * 6. このスクリプトの「プロジェクトの設定」→「スクリプト プロパティ」に
 *    以下を追加する（任意だが推奨）
 *      SENDER_NAME : 送信者表示名（例: 人生の棚卸し年表）
 *
 * ■ コード変更時の注意
 * コードを書き換えただけでは既存のデプロイには反映されません。
 * 「デプロイ」→「デプロイを管理」→ 鉛筆アイコン→ バージョン「新バージョン」で
 * 再デプロイしてください。
 * -----------------------------------------------------------
 */

// ==========================================================
// 設定
// ==========================================================
// サーバー（GAS）のバージョン。フロント側 src/config.js の APP_VERSION と揃える。
// 画面のバージョン情報で両者が違うと「再デプロイ忘れ」の警告が出ます。
const APP_VERSION = '4.1.0';
const APP_UPDATED = '2026-10-20';

const SHEET_USERS = 'Users';
const SHEET_SESSIONS = 'Sessions';
const SHEET_CONSENT = 'ConsentLog';
const SHEET_ENTRIES = 'Entries';
const SHEET_SHARES = 'Shares';

const SESSION_TTL_DAYS = 30;
const TEMP_PASSWORD_LENGTH = 10;
const MAX_LOGIN_FAILS = 5;
const LOGIN_FAIL_LOCK_MINUTES = 15;
const TERMS_VERSION = '2026-07-08'; // 規約文言を改訂したら日付を更新すること

// Users シートの列番号（1始まり）
const USERS_COL = {
  email: 1,
  nickname: 2,
  fullName: 3,
  passwordHash: 4,
  salt: 5,
  mustChangePassword: 6,
  createdAt: 7,
  updatedAt: 8,
  profileJson: 9,
};

// Entries シートの列番号（1始まり）
const ENTRIES_COL = {
  id: 1,
  email: 2,
  year: 3,
  month: 4,
  title: 5,
  category: 6,
  memo: 7,
  videoUrl: 8,
  createdAt: 9,
  updatedAt: 10,
  photoUrl: 11,
};

// Shares シートの列番号（1始まり）
const SHARES_COL = {
  ownerEmail: 1,
  viewerEmail: 2,
  label: 3,
  fieldsJson: 4,
  categoriesJson: 5,
  createdAt: 6,
  updatedAt: 7,
};
const SHARES_HEADERS = ['ownerEmail', 'viewerEmail', 'label', 'fieldsJson', 'categoriesJson', 'createdAt', 'updatedAt'];
const SHARE_MAX_VIEWERS = 30;
const SHARE_FIELD_KEYS = ['name', 'birthday', 'age', 'month', 'memo', 'photo', 'video'];
const SHARE_CATEGORY_KEYS = ['work', 'family', 'hobby', 'general'];

const PHOTO_DRIVE_FOLDER_NAME = 'jibun-nenpyo-photos';
const MAX_PHOTO_BASE64_CHARS = 7000000; // 概ね5MB程度のBase64上限（GASのdoPost実質上限に対する安全マージン）

// ==========================================================
// エントリーポイント
// ==========================================================
function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'リクエストの形式が不正です' });
  }

  const action = body.action;
  try {
    switch (action) {
      case 'getVersion':
        return jsonResponse({ success: true, version: APP_VERSION, updated: APP_UPDATED });
      case 'register':
        return jsonResponse(handleRegister(body));
      case 'login':
        return jsonResponse(handleLogin(body));
      case 'changePassword':
        return jsonResponse(handleChangePassword(body));
      case 'forgotPassword':
        return jsonResponse(handleForgotPassword(body));
      case 'validateSession':
        return jsonResponse(handleValidateSession(body));
      case 'updateNickname':
        return jsonResponse(handleUpdateNickname(body));
      case 'logout':
        return jsonResponse(handleLogout(body));
      case 'getData':
        return jsonResponse(handleGetData(body));
      case 'updateProfile':
        return jsonResponse(handleUpdateProfile(body));
      case 'addEntry':
        return jsonResponse(handleAddEntry(body));
      case 'updateEntry':
        return jsonResponse(handleUpdateEntry(body));
      case 'deleteEntry':
        return jsonResponse(handleDeleteEntry(body));
      case 'uploadPhoto':
        return jsonResponse(handleUploadPhoto(body));
      case 'getShareSettings':
        return jsonResponse(handleGetShareSettings(body));
      case 'saveShareSettings':
        return jsonResponse(handleSaveShareSettings(body));
      case 'listSharedWithMe':
        return jsonResponse(handleListSharedWithMe(body));
      case 'getSharedTimeline':
        return jsonResponse(handleGetSharedTimeline(body));
      default:
        return jsonResponse({ success: false, error: '不明な操作です' });
    }
  } catch (err) {
    // 予期しないエラーの詳細は返さない（情報漏えい防止）
    console.error(err);
    return jsonResponse({ success: false, error: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================================
// 認証アクション
// ==========================================================

function handleRegister(body) {
  const email = normalizeEmail(body.email);
  const nickname = (body.nickname || '').trim();
  const fullName = (body.fullName || '').trim();

  if (!isValidEmail(email)) return { success: false, error: 'メールアドレスの形式が正しくありません' };
  if (!nickname) return { success: false, error: 'ニックネームを入力してください' };
  if (!fullName) return { success: false, error: '氏名を入力してください' };
  if (nickname.length > 30) return { success: false, error: 'ニックネームは30文字以内で入力してください' };
  if (fullName.length > 50) return { success: false, error: '氏名は50文字以内で入力してください' };

  const sheet = getSheet(SHEET_USERS);
  if (findUserRow(sheet, email) !== -1) {
    // アカウント存在の有無を推測されないよう、成功時と同じレスポンス文言にする
    return { success: true, message: 'ご登録のメールアドレス宛に案内をお送りしました。メールをご確認ください。' };
  }

  const tempPassword = generateTempPassword();
  const salt = Utilities.getUuid();
  const hash = hashPassword(tempPassword, salt);
  const now = new Date();

  sheet.appendRow([email, nickname, fullName, hash, salt, true, now, now, '{}']);

  sendMail(
    email,
    '【人生の棚卸し年表】仮パスワードのご案内',
    buildTempPasswordMailBody(nickname, tempPassword, '新規登録')
  );

  return { success: true, message: 'ご登録のメールアドレス宛に仮パスワードをお送りしました。メールをご確認のうえログインしてください。' };
}

function handleLogin(body) {
  const email = normalizeEmail(body.email);
  const password = body.password || '';
  const agreedToTerms = body.agreedToTerms === true;

  if (!isValidEmail(email) || !password) {
    return { success: false, error: 'メールアドレスとパスワードを入力してください' };
  }
  if (!agreedToTerms) {
    return { success: false, error: '注意事項・免責事項への同意が必要です' };
  }

  if (isLockedOut(email)) {
    return { success: false, error: 'ログイン試行回数が上限に達しました。しばらく時間をおいて再度お試しください。' };
  }

  const sheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(sheet, email);
  if (rowIdx === -1) {
    registerLoginFail(email);
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  const row = getUserRowValues(sheet, rowIdx);

  if (hashPassword(password, row.salt) !== row.passwordHash) {
    registerLoginFail(email);
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  clearLoginFail(email);
  logConsent(email, row.mustChangePassword ? 'login_temp' : 'login');

  if (row.mustChangePassword) {
    return { success: true, mustChangePassword: true };
  }

  const token = createSession(email);
  return { success: true, mustChangePassword: false, sessionToken: token, nickname: row.nickname };
}

function handleChangePassword(body) {
  const email = normalizeEmail(body.email);
  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';

  if (!isValidEmail(email) || !currentPassword || !newPassword) {
    return { success: false, error: '入力内容を確認してください' };
  }
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { success: false, error: pwError };

  if (isLockedOut(email)) {
    return { success: false, error: 'しばらく時間をおいて再度お試しください。' };
  }

  const sheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(sheet, email);
  if (rowIdx === -1) {
    registerLoginFail(email);
    return { success: false, error: '現在のパスワードが正しくありません' };
  }

  const row = getUserRowValues(sheet, rowIdx);

  if (hashPassword(currentPassword, row.salt) !== row.passwordHash) {
    registerLoginFail(email);
    return { success: false, error: '現在のパスワードが正しくありません' };
  }

  clearLoginFail(email);

  const newSalt = Utilities.getUuid();
  const newHash = hashPassword(newPassword, newSalt);
  sheet.getRange(rowIdx, USERS_COL.passwordHash).setValue(newHash);
  sheet.getRange(rowIdx, USERS_COL.salt).setValue(newSalt);
  sheet.getRange(rowIdx, USERS_COL.mustChangePassword).setValue(false);
  sheet.getRange(rowIdx, USERS_COL.updatedAt).setValue(new Date());

  const token = createSession(email);
  return { success: true, sessionToken: token, nickname: row.nickname };
}

function handleForgotPassword(body) {
  const email = normalizeEmail(body.email);
  const generic = { success: true, message: 'ご登録のメールアドレス宛にご案内をお送りしました（ご登録がない場合はメールは届きません）。' };

  if (!isValidEmail(email)) return generic;
  if (isLockedOut('reset_' + email)) return generic;

  const sheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(sheet, email);
  if (rowIdx === -1) {
    registerLoginFail('reset_' + email);
    return generic; // アカウント有無を漏らさない
  }

  const nickname = sheet.getRange(rowIdx, USERS_COL.nickname).getValue();
  const tempPassword = generateTempPassword();
  const newSalt = Utilities.getUuid();
  const newHash = hashPassword(tempPassword, newSalt);

  sheet.getRange(rowIdx, USERS_COL.passwordHash).setValue(newHash);
  sheet.getRange(rowIdx, USERS_COL.salt).setValue(newSalt);
  sheet.getRange(rowIdx, USERS_COL.mustChangePassword).setValue(true);
  sheet.getRange(rowIdx, USERS_COL.updatedAt).setValue(new Date());

  sendMail(
    email,
    '【人生の棚卸し年表】仮パスワード再発行のご案内',
    buildTempPasswordMailBody(nickname, tempPassword, 'パスワード再発行')
  );

  registerLoginFail('reset_' + email); // 連続再発行の悪用を軽減
  return generic;
}

function handleValidateSession(body) {
  const session = getValidSession(body.sessionToken);
  if (!session) return { success: false, valid: false };

  const sheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(sheet, session.email);
  if (rowIdx === -1) return { success: false, valid: false };

  const nickname = sheet.getRange(rowIdx, USERS_COL.nickname).getValue();
  return { success: true, valid: true, email: session.email, nickname };
}

function handleUpdateNickname(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const newNickname = (body.newNickname || '').trim();
  if (!newNickname) return { success: false, error: 'ニックネームを入力してください' };
  if (newNickname.length > 30) return { success: false, error: 'ニックネームは30文字以内で入力してください' };

  const sheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(sheet, session.email);
  if (rowIdx === -1) return { success: false, error: 'ユーザーが見つかりません' };

  sheet.getRange(rowIdx, USERS_COL.nickname).setValue(newNickname);
  sheet.getRange(rowIdx, USERS_COL.updatedAt).setValue(new Date());

  return { success: true, nickname: newNickname };
}

function handleLogout(body) {
  const token = body.sessionToken;
  if (!token) return { success: true };
  const sheet = getSheet(SHEET_SESSIONS);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === token) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { success: true };
}

// ==========================================================
// 年表データ（プロフィール・出来事）アクション
// すべてセッション認証必須。データの所有者チェック（IDOR対策）あり。
// ==========================================================

function handleGetData(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const usersSheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(usersSheet, session.email);
  if (rowIdx === -1) return { success: false, error: 'ユーザーが見つかりません' };

  const row = getUserRowValues(usersSheet, rowIdx);
  let profile = {};
  try {
    profile = JSON.parse(row.profileJson || '{}');
  } catch (err) {
    profile = {};
  }

  const entries = listEntriesForEmail(session.email);

  return { success: true, profile: profile, entries: entries, nickname: row.nickname };
}

function handleUpdateProfile(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const profile = body.profile || {};
  const safeProfile = {
    name: String(profile.name || '').slice(0, 50),
    birthYear: profile.birthYear ? String(profile.birthYear).slice(0, 4) : '',
    birthMonth: profile.birthMonth ? String(profile.birthMonth).slice(0, 2) : '',
  };

  const sheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(sheet, session.email);
  if (rowIdx === -1) return { success: false, error: 'ユーザーが見つかりません' };

  sheet.getRange(rowIdx, USERS_COL.profileJson).setValue(JSON.stringify(safeProfile));
  sheet.getRange(rowIdx, USERS_COL.updatedAt).setValue(new Date());

  return { success: true, profile: safeProfile };
}

function handleAddEntry(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const input = body.entry || {};
  const validation = validateEntryInput(input);
  if (validation.error) return { success: false, error: validation.error };

  const sheet = getSheet(SHEET_ENTRIES);
  const id = Utilities.getUuid();
  const now = new Date();

  sheet.appendRow([
    id,
    session.email,
    validation.value.year,
    validation.value.month,
    validation.value.title,
    validation.value.category,
    validation.value.memo,
    validation.value.videoUrl,
    now,
    now,
    validation.value.photoUrl,
  ]);

  return {
    success: true,
    entry: {
      id: id,
      year: validation.value.year,
      month: validation.value.month,
      title: validation.value.title,
      category: validation.value.category,
      memo: validation.value.memo,
      videoUrl: validation.value.videoUrl,
      photoUrl: validation.value.photoUrl,
    },
  };
}

function handleUpdateEntry(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const id = body.id;
  if (!id) return { success: false, error: 'IDが指定されていません' };

  const input = body.entry || {};
  const validation = validateEntryInput(input);
  if (validation.error) return { success: false, error: validation.error };

  const sheet = getSheet(SHEET_ENTRIES);
  const rowIdx = findEntryRow(sheet, id);
  if (rowIdx === -1) return { success: false, error: '対象のデータが見つかりません' };

  // 所有者チェック（他人のデータを書き換えられないようにする）
  const ownerEmail = sheet.getRange(rowIdx, ENTRIES_COL.email).getValue();
  if (normalizeEmail(ownerEmail) !== session.email) {
    return { success: false, error: 'この操作を行う権限がありません' };
  }

  sheet.getRange(rowIdx, ENTRIES_COL.year).setValue(validation.value.year);
  sheet.getRange(rowIdx, ENTRIES_COL.month).setValue(validation.value.month);
  sheet.getRange(rowIdx, ENTRIES_COL.title).setValue(validation.value.title);
  sheet.getRange(rowIdx, ENTRIES_COL.category).setValue(validation.value.category);
  sheet.getRange(rowIdx, ENTRIES_COL.memo).setValue(validation.value.memo);
  sheet.getRange(rowIdx, ENTRIES_COL.videoUrl).setValue(validation.value.videoUrl);
  sheet.getRange(rowIdx, ENTRIES_COL.photoUrl).setValue(validation.value.photoUrl);
  sheet.getRange(rowIdx, ENTRIES_COL.updatedAt).setValue(new Date());

  return {
    success: true,
    entry: {
      id: id,
      year: validation.value.year,
      month: validation.value.month,
      title: validation.value.title,
      category: validation.value.category,
      memo: validation.value.memo,
      videoUrl: validation.value.videoUrl,
      photoUrl: validation.value.photoUrl,
    },
  };
}

function handleDeleteEntry(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const id = body.id;
  if (!id) return { success: false, error: 'IDが指定されていません' };

  const sheet = getSheet(SHEET_ENTRIES);
  const rowIdx = findEntryRow(sheet, id);
  if (rowIdx === -1) return { success: true }; // 既に無ければ成功扱い

  const ownerEmail = sheet.getRange(rowIdx, ENTRIES_COL.email).getValue();
  if (normalizeEmail(ownerEmail) !== session.email) {
    return { success: false, error: 'この操作を行う権限がありません' };
  }

  sheet.deleteRow(rowIdx);
  return { success: true };
}

// ==========================================================
// 写真アップロード（Googleドライブ保存）
// リサイズはフロント側(canvas)で行ってから送信される想定。
// ==========================================================

function handleUploadPhoto(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const base64Data = body.base64Data || '';
  const mimeType = body.mimeType || '';
  const filename = String(body.filename || 'photo.jpg').slice(0, 100);

  if (!base64Data) return { success: false, error: '画像データがありません' };
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mimeType) === -1) {
    return { success: false, error: '対応していない画像形式です（JPEG/PNG/WEBPのみ）' };
  }
  if (base64Data.length > MAX_PHOTO_BASE64_CHARS) {
    return { success: false, error: '画像サイズが大きすぎます。もう少し小さい画像でお試しください。' };
  }

  try {
    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, mimeType, filename);

    const folder = getOrCreateUserPhotoFolder(session.email);
    const file = folder.createFile(blob);
    // リンクを知っている全員が閲覧可能に設定（アプリ内で画像を表示するために必要）
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const url = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';

    return { success: true, photoUrl: url, fileId: fileId };
  } catch (err) {
    console.error(err);
    return { success: false, error: '画像のアップロードに失敗しました' };
  }
}

function getOrCreateUserPhotoFolder(email) {
  const rootFolders = DriveApp.getFoldersByName(PHOTO_DRIVE_FOLDER_NAME);
  const rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(PHOTO_DRIVE_FOLDER_NAME);

  const userFolders = rootFolder.getFoldersByName(email);
  return userFolders.hasNext() ? userFolders.next() : rootFolder.createFolder(email);
}

function listEntriesForEmail(email) {
  const sheet = getSheet(SHEET_ENTRIES);
  const data = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalizeEmail(row[ENTRIES_COL.email - 1]) !== email) continue;
    result.push({
      id: row[ENTRIES_COL.id - 1],
      year: row[ENTRIES_COL.year - 1],
      month: row[ENTRIES_COL.month - 1] || null,
      title: row[ENTRIES_COL.title - 1],
      category: row[ENTRIES_COL.category - 1],
      memo: row[ENTRIES_COL.memo - 1] || '',
      videoUrl: row[ENTRIES_COL.videoUrl - 1] || '',
      photoUrl: row[ENTRIES_COL.photoUrl - 1] || '',
    });
  }
  result.sort(function (a, b) { return a.year - b.year || (a.month || 0) - (b.month || 0); });
  return result;
}

function findEntryRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][ENTRIES_COL.id - 1] === id) return i + 1; // 1-indexed row number
  }
  return -1;
}

function validateEntryInput(input) {
  const year = parseInt(input.year, 10);
  if (!year || isNaN(year) || year < 1900 || year > 2100) {
    return { error: '有効な年を入力してください' };
  }
  const title = String(input.title || '').trim();
  if (!title) return { error: '出来事を入力してください' };
  if (title.length > 200) return { error: '出来事は200文字以内で入力してください' };

  const month = input.month ? parseInt(input.month, 10) : null;
  if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
    return { error: '月の指定が正しくありません' };
  }

  const validCategories = ['work', 'family', 'hobby', 'general'];
  const category = validCategories.indexOf(input.category) !== -1 ? input.category : 'general';
  const memo = String(input.memo || '').slice(0, 1000);
  const videoUrl = String(input.videoUrl || '').slice(0, 500);
  const photoUrl = String(input.photoUrl || '').slice(0, 500);

  return { value: { year: year, month: month, title: title, category: category, memo: memo, videoUrl: videoUrl, photoUrl: photoUrl } };
}

// ==========================================================
// 限定共有アクション（v4）
// 指定した登録会員（閲覧者）だけが、許可された項目のみ閲覧できる。
// 非表示項目はサーバー側で取り除いてから返すため、通信にも含まれない。
// ==========================================================

function handleGetShareSettings(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const shares = readShareRows().filter(function (r) { return r.ownerEmail === session.email; })
    .map(function (r) {
      return { viewerEmail: r.viewerEmail, label: r.label, fields: r.fields, categories: r.categories };
    });
  return { success: true, shares: shares };
}

function handleSaveShareSettings(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const input = body.shares;
  if (!Array.isArray(input)) return { success: false, error: 'リクエストの形式が不正です' };
  if (input.length > SHARE_MAX_VIEWERS) {
    return { success: false, error: '共有できるのは最大' + SHARE_MAX_VIEWERS + '人までです' };
  }

  // 登録会員のメールアドレス一覧（存在確認用）
  const usersData = getSheet(SHEET_USERS).getDataRange().getValues();
  const memberSet = {};
  for (let i = 1; i < usersData.length; i++) {
    memberSet[normalizeEmail(usersData[i][USERS_COL.email - 1])] = true;
  }

  const seen = {};
  const list = [];
  for (let i = 0; i < input.length; i++) {
    const s = input[i] || {};
    const viewerEmail = normalizeEmail(String(s.viewerEmail || ''));
    if (!isValidEmail(viewerEmail)) return { success: false, error: 'メールアドレスの形式が正しくありません：' + viewerEmail };
    if (viewerEmail === session.email) return { success: false, error: '自分自身のメールアドレスは指定できません' };
    if (seen[viewerEmail]) return { success: false, error: '同じメールアドレスが重複しています：' + viewerEmail };
    if (!memberSet[viewerEmail]) {
      return { success: false, error: viewerEmail + ' は登録会員ではありません。相手の方に先に会員登録をお願いしてください。' };
    }
    seen[viewerEmail] = true;

    const fields = {};
    SHARE_FIELD_KEYS.forEach(function (k) { fields[k] = !!(s.fields && s.fields[k]); });
    const categories = (Array.isArray(s.categories) ? s.categories : []).filter(function (c) {
      return SHARE_CATEGORY_KEYS.indexOf(c) !== -1;
    });
    if (categories.length === 0) return { success: false, error: viewerEmail + ' に見せるカテゴリーを1つ以上選んでください' };

    list.push({ viewerEmail: viewerEmail, label: String(s.label || '').trim().slice(0, 30), fields: fields, categories: categories });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSharesSheet();
    const data = sheet.getDataRange().getValues();
    const createdMap = {};
    // 自分が共有元の行を下から削除（作成日時は引き継ぐ）
    for (let i = data.length - 1; i >= 1; i--) {
      if (normalizeEmail(data[i][SHARES_COL.ownerEmail - 1]) === session.email) {
        createdMap[normalizeEmail(data[i][SHARES_COL.viewerEmail - 1])] = data[i][SHARES_COL.createdAt - 1];
        sheet.deleteRow(i + 1);
      }
    }
    const now = new Date();
    const rows = list.map(function (s) {
      return [session.email, s.viewerEmail, s.label, JSON.stringify(s.fields), JSON.stringify(s.categories),
        createdMap[s.viewerEmail] || now, now];
    });
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SHARES_HEADERS.length).setValues(rows);
    }
  } finally {
    lock.releaseLock();
  }

  return { success: true, shares: list };
}

function handleListSharedWithMe(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const mine = readShareRows().filter(function (r) { return r.viewerEmail === session.email; });
  if (mine.length === 0) return { success: true, items: [] };

  const nicknames = getNicknameMap();
  const entriesByOwner = groupEntriesByEmail();

  const items = mine
    .filter(function (r) { return nicknames[r.ownerEmail] !== undefined; }) // 退会等で存在しない会員は除外
    .map(function (r) {
      const entries = entriesByOwner[r.ownerEmail] || [];
      return {
        ownerId: shareOwnerId(r.ownerEmail),
        ownerNickname: nicknames[r.ownerEmail] || '',
        entryCount: entries.filter(function (e) { return r.categories.indexOf(e.category || 'general') !== -1; }).length,
      };
    });
  return { success: true, items: items };
}

function handleGetSharedTimeline(body) {
  const session = requireSession(body.sessionToken);
  if (!session) return { success: false, error: 'セッションが無効です。再度ログインしてください。' };

  const ownerId = String(body.ownerId || '');
  const share = readShareRows().filter(function (r) {
    return r.viewerEmail === session.email && shareOwnerId(r.ownerEmail) === ownerId;
  })[0];
  if (!share) return { success: false, error: 'この年表の閲覧権限がありません（共有が解除された可能性があります）' };

  const usersSheet = getSheet(SHEET_USERS);
  const rowIdx = findUserRow(usersSheet, share.ownerEmail);
  if (rowIdx === -1) return { success: false, error: '年表が見つかりません' };
  const ownerRow = getUserRowValues(usersSheet, rowIdx);
  let p = {};
  try { p = JSON.parse(ownerRow.profileJson || '{}'); } catch (err) { p = {}; }

  const f = share.fields;
  const profile = {
    name: f.name ? (p.name || '') : '',
    birthYear: (f.birthday || f.age) ? (p.birthYear || '') : '',
    birthMonth: f.birthday ? (p.birthMonth || '') : '',
    birthDay: f.birthday ? (p.birthDay || '') : '',
  };

  const entries = listEntriesForEmail(share.ownerEmail)
    .filter(function (e) { return share.categories.indexOf(e.category || 'general') !== -1; })
    .map(function (e) {
      return {
        id: e.id,
        year: e.year,
        category: e.category || 'general',
        title: e.title,
        month: f.month ? (e.month || null) : null,
        memo: f.memo ? e.memo : '',
        photoUrl: f.photo ? e.photoUrl : '',
        videoUrl: f.video ? e.videoUrl : '',
      };
    });

  return { success: true, ownerNickname: ownerRow.nickname || '', fields: f, profile: profile, entries: entries };
}

// ---- 限定共有ユーティリティ ----

// Sharesシートを取得（無ければ自動作成するので setupSheets の再実行は不要）
function getSharesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SHARES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SHARES);
    sheet.appendRow(SHARES_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readShareRows() {
  const data = getSharesSheet().getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const ownerEmail = normalizeEmail(String(data[i][SHARES_COL.ownerEmail - 1] || ''));
    const viewerEmail = normalizeEmail(String(data[i][SHARES_COL.viewerEmail - 1] || ''));
    if (!ownerEmail || !viewerEmail) continue;
    let fields = {};
    let categories = [];
    try { fields = JSON.parse(data[i][SHARES_COL.fieldsJson - 1] || '{}'); } catch (err) { fields = {}; }
    try { categories = JSON.parse(data[i][SHARES_COL.categoriesJson - 1] || '[]'); } catch (err) { categories = []; }
    const safeFields = {};
    SHARE_FIELD_KEYS.forEach(function (k) { safeFields[k] = !!fields[k]; });
    rows.push({
      ownerEmail: ownerEmail,
      viewerEmail: viewerEmail,
      label: String(data[i][SHARES_COL.label - 1] || ''),
      fields: safeFields,
      categories: Array.isArray(categories) ? categories : [],
    });
  }
  return rows;
}

// メールアドレスを推測されないよう、秘密の値を混ぜてハッシュ化した共有元ID
function shareOwnerId(email) {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SHARE_ID_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SHARE_ID_SECRET', secret);
  }
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, secret + ':' + email, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('').slice(0, 32);
}

function getNicknameMap() {
  const data = getSheet(SHEET_USERS).getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    map[normalizeEmail(data[i][USERS_COL.email - 1])] = data[i][USERS_COL.nickname - 1] || '';
  }
  return map;
}

function groupEntriesByEmail() {
  const data = getSheet(SHEET_ENTRIES).getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const email = normalizeEmail(data[i][ENTRIES_COL.email - 1]);
    if (!map[email]) map[email] = [];
    map[email].push({ category: data[i][ENTRIES_COL.category - 1] });
  }
  return map;
}

// ==========================================================
// セッション管理
// ==========================================================
function createSession(email) {
  const sheet = getSheet(SHEET_SESSIONS);
  const token = Utilities.getUuid();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  sheet.appendRow([token, email, now, expires]);
  return token;
}

function getValidSession(token) {
  if (!token) return null;
  const sheet = getSheet(SHEET_SESSIONS);
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      const expires = new Date(data[i][3]);
      if (expires < now) return null;
      return { email: normalizeEmail(data[i][1]) };
    }
  }
  return null;
}

// getValidSession のエイリアス（意図を明確にするための命名）
function requireSession(token) {
  return getValidSession(token);
}

// ==========================================================
// ログイン失敗回数の制御（CacheService・簡易レートリミット）
// ==========================================================
function isLockedOut(key) {
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get('fail_' + key) || 0);
  return count >= MAX_LOGIN_FAILS;
}

function registerLoginFail(key) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'fail_' + key;
  const count = Number(cache.get(cacheKey) || 0) + 1;
  cache.put(cacheKey, String(count), LOGIN_FAIL_LOCK_MINUTES * 60);
}

function clearLoginFail(key) {
  CacheService.getScriptCache().remove('fail_' + key);
}

// ==========================================================
// 同意ログ（利用規約・免責事項）
// ==========================================================
function logConsent(email, event) {
  const sheet = getSheet(SHEET_CONSENT);
  sheet.appendRow([email, new Date(), event, TERMS_VERSION]);
}

// ==========================================================
// パスワード・ユーティリティ
// ==========================================================
function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function generateTempPassword() {
  // 紛らわしい文字（0/O, 1/l/I）を除いた文字集合からランダム生成
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

function validatePasswordStrength(password) {
  if (password.length < 8) return 'パスワードは8文字以上で設定してください';
  if (password.length > 100) return 'パスワードが長すぎます';
  return null;
}

// ==========================================================
// メール送信
// ==========================================================
function buildTempPasswordMailBody(nickname, tempPassword, reason) {
  const senderName = getSenderName();
  return [
    nickname + ' 様',
    '',
    '「人生の棚卸し年表」の' + reason + '処理を受け付けました。',
    '以下の仮パスワードでログインし、ログイン後に表示される画面から',
    '新しいパスワードへの変更をお願いいたします。',
    '',
    '仮パスワード： ' + tempPassword,
    '',
    'このメールに心当たりがない場合は、お手数ですが破棄してください。',
    '',
    '※本サービスは無料のボランティア運営です。',
    '※このメールは送信専用です。返信いただいてもご対応できません。',
    '',
    '— ' + senderName,
  ].join('\n');
}

function sendMail(to, subject, body) {
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    name: getSenderName(),
  });
}

function getSenderName() {
  return PropertiesService.getScriptProperties().getProperty('SENDER_NAME') || '人生の棚卸し年表';
}

// ==========================================================
// 汎用ユーティリティ
// ==========================================================
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('シートが見つかりません: ' + name);
  return sheet;
}

function findUserRow(sheet, email) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizeEmail(data[i][USERS_COL.email - 1]) === email) return i + 1; // 1-indexed row number
  }
  return -1;
}

function getUserRowValues(sheet, rowIdx) {
  const row = sheet.getRange(rowIdx, 1, 1, 9).getValues()[0];
  return {
    email: row[USERS_COL.email - 1],
    nickname: row[USERS_COL.nickname - 1],
    fullName: row[USERS_COL.fullName - 1],
    passwordHash: row[USERS_COL.passwordHash - 1],
    salt: row[USERS_COL.salt - 1],
    mustChangePassword: row[USERS_COL.mustChangePassword - 1],
    createdAt: row[USERS_COL.createdAt - 1],
    updatedAt: row[USERS_COL.updatedAt - 1],
    profileJson: row[USERS_COL.profileJson - 1],
  };
}

// ==========================================================
// 初期セットアップ（スクリプトエディタから一度だけ手動実行する）
// 既存運用中に再実行しても、不足しているシート・列を補うだけで
// 既存データは変更・削除しません。
// ==========================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const usersHeaders = ['email', 'nickname', 'fullName', 'passwordHash', 'salt', 'mustChangePassword', 'createdAt', 'updatedAt', 'profileJson'];
  const sessionsHeaders = ['token', 'email', 'createdAt', 'expiresAt'];
  const consentHeaders = ['email', 'timestamp', 'event', 'termsVersion'];
  const entriesHeaders = ['id', 'email', 'year', 'month', 'title', 'category', 'memo', 'videoUrl', 'createdAt', 'updatedAt', 'photoUrl'];

  ensureSheetWithHeaders(ss, SHEET_USERS, usersHeaders);
  ensureSheetWithHeaders(ss, SHEET_SESSIONS, sessionsHeaders);
  ensureSheetWithHeaders(ss, SHEET_CONSENT, consentHeaders);
  ensureSheetWithHeaders(ss, SHEET_ENTRIES, entriesHeaders);
  ensureSheetWithHeaders(ss, SHEET_SHARES, SHARES_HEADERS);

  // v1で作成済みのUsersシートにprofileJson列が無い場合は追加する
  const usersSheet = ss.getSheetByName(SHEET_USERS);
  if (usersSheet.getLastColumn() < 9) {
    usersSheet.getRange(1, 9).setValue('profileJson');
  }

  // v2で作成済みのEntriesシートにphotoUrl列が無い場合は追加する
  const entriesSheet = ss.getSheetByName(SHEET_ENTRIES);
  if (entriesSheet.getLastColumn() < 11) {
    entriesSheet.getRange(1, 11).setValue('photoUrl');
  }

  Logger.log('セットアップが完了しました。Users / Sessions / ConsentLog / Entries / Shares シートを確認してください。');
}

function ensureSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
}

// ==========================================================
// 期限切れセッションの定期クリーンアップ（任意・トリガー設定推奨）
// トリガー: 編集メニュー→現在のプロジェクトのトリガー→毎日1回程度
// ==========================================================
function cleanupExpiredSessions() {
  const sheet = getSheet(SHEET_SESSIONS);
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  for (let i = data.length - 1; i >= 1; i--) {
    if (new Date(data[i][3]) < now) sheet.deleteRow(i + 1);
  }
}
