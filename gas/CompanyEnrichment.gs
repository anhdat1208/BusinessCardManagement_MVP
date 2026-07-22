/**
 * Dán toàn bộ file này vào Apps Script đang gắn với BusinessCardList.
 * Xóa hàm doPost cũ để tránh trùng tên; giữ nguyên các hàm hiện có:
 * appendCard_, createCompanyFile_, setCompanyFileUrl_, getHeaderMap_.
 */

const ORIGINAL_IMAGE_FOLDER_ID = '1ySoZD2oqr3yJH6w3Low-DWUwlff-eMpe';
const IMPORTED_IMAGE_FOLDER_ID = '1KNeN9pQwzWGj6V_r6qeGsGln1JAgpDT3';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'logEvent') {
      appendExecutionLog_(data);
      return jsonResponse_({ ok: true, action: 'logEvent' });
    }

    if (data.action === 'storeImage') {
      const stored = storeImage_(data.image);
      const existing = findExistingCardByImageId_(stored.originalFileId);
      if (existing) {
        appendExecutionLog_({
          source: data.image.source || '',
          sourceKey: data.image.sourceKey || '',
          sourceUrl: data.image.sourceUrl || '',
          step: 'duplicate',
          status: 'skipped',
          row: existing.row,
          message: 'Duplicate detected before OCR.',
        });
        return jsonResponse_({
          ok: true,
          action: 'storeImage',
          duplicate: true,
          row: existing.row,
          no: existing.no,
          companyFileUrl: existing.companyFileUrl,
          originalFileId: stored.originalFileId,
          originalFileUrl: stored.originalFileUrl,
          importedFileId: stored.importedFileId,
          importedFileUrl: stored.importedFileUrl,
        });
      }
      appendExecutionLog_({
        source: data.image.source || '',
        sourceKey: data.image.sourceKey || '',
        sourceUrl: data.image.sourceUrl || '',
        step: 'image_saved',
        status: 'ok',
        message: stored.originalFileId,
      });
      return jsonResponse_(stored);
    }

    if (data.action === 'enrichCompany') {
      return jsonResponse_(enrichCompany_(data));
    }

    const existing = findExistingCardByImageId_(data.imgOrgId);
    if (existing) {
      appendExecutionLog_({
        source: data.source || '',
        sourceKey: data.sourceKey || '',
        sourceUrl: data.sourceUrl || '',
        step: 'duplicate',
        status: 'skipped',
        row: existing.row,
        message: 'The original image was already registered.',
      });
      return jsonResponse_({
        ok: true,
        duplicate: true,
        row: existing.row,
        no: existing.no,
        companyFileUrl: existing.companyFileUrl,
      });
    }

    const appended = appendCard_({
      source: data.source || 'script',
      sourceUrl: data.sourceUrl || '',
      handler: data.handler || '',
      name: data.name || '',
      company: data.company || '',
      department: data.department || '',
      title: data.title || '',
      email: data.email || '',
      phone: data.phone || '',
      mobile: data.mobile || '',
      address: data.address || '',
      companyUrl: data.companyUrl || '',
      imgOrgId: data.imgOrgId || '',
      imgOrgUrl: data.imgOrgUrl || '',
      imgDoneId: data.imgDoneId || '',
      imgDoneUrl: data.imgDoneUrl || '',
      ocrConf: data.ocrConf || '',
      compConf: data.compConf || '',
      status: data.status || '未確認',
      memo: data.memo || '',
    });

    const file = createCompanyFile_(data.company || 'UnknownCompany');
    setCompanyFileUrl_(appended.row, file.url);
    appendExecutionLog_({
      source: data.source || '',
      sourceKey: data.sourceKey || '',
      sourceUrl: data.sourceUrl || '',
      step: 'ocr_saved',
      status: 'ok',
      row: appended.row,
      message: data.company || '',
    });

    return jsonResponse_({
      ok: true,
      no: appended.no,
      row: appended.row,
      companyFileId: file.fileId,
      companyFileUrl: file.url,
      companyFileName: file.name,
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function storeImage_(image) {
  if (!image || !image.base64) throw new Error('image.base64 is required');
  if (!image.sourceKey) throw new Error('image.sourceKey is required');
  if (!/^[a-f0-9]{64}$/i.test(image.contentHash || '')) {
    throw new Error('image.contentHash must be a SHA-256 hash');
  }

  const mimeType = image.mimeType || 'application/octet-stream';
  const safeOriginalName = sanitizeFileName_(
    image.originalName || 'business-card'
  );
  const extension = getFileExtension_(safeOriginalName, mimeType);
  const contentHash = String(image.contentHash).toLowerCase();
  const bytes = Utilities.base64Decode(image.base64);
  const originalName = contentHash + extension;
  const importedName = 'imported_' + contentHash + extension;

  const originalFolder = DriveApp.getFolderById(ORIGINAL_IMAGE_FOLDER_ID);
  const importedFolder = DriveApp.getFolderById(IMPORTED_IMAGE_FOLDER_ID);

  const originalFile = getOrCreateImage_(
    originalFolder,
    originalName,
    bytes,
    mimeType
  );
  const importedFile = getOrCreateImage_(
    importedFolder,
    importedName,
    bytes,
    mimeType
  );

  return {
    ok: true,
    action: 'storeImage',
    originalFileId: originalFile.getId(),
    originalFileUrl: originalFile.getUrl(),
    importedFileId: importedFile.getId(),
    importedFileUrl: importedFile.getUrl(),
  };
}

function getOrCreateImage_(folder, fileName, bytes, mimeType) {
  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) return existing.next();

  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  return folder.createFile(blob);
}

function sanitizeFileName_(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 160);
}

function getFileExtension_(fileName, mimeType) {
  const match = String(fileName || '').match(/(\.[a-zA-Z0-9]{2,5})$/);
  if (match) return match[1].toLowerCase();

  const byMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };
  return byMime[mimeType] || '';
}

function enrichCompany_(data) {
  if (!data.companyFileId) throw new Error('companyFileId is required');
  if (!data.row) throw new Error('row is required');
  if (!data.research) throw new Error('research is required');

  const ss = SpreadsheetApp.openById(data.companyFileId);
  const research = data.research;

  writeCompanyInfo_(ss, research);
  writeResearchNotes_(ss, research.researchNotes || []);
  writeProposal_(ss, research.proposal || {});
  writeEmailDraft_(ss, research.emailDraft || {});
  writeSources_(ss, research.sources || []);
  updateBusinessCardStatus_(data.row, research);
  appendExecutionLog_({
    source: data.source || '',
    sourceKey: data.sourceKey || '',
    sourceUrl: data.sourceUrl || '',
    step: 'done',
    status: 'ok',
    row: data.row,
    message: 'Research, proposal, and email draft were saved.',
  });

  return {
    ok: true,
    action: 'enrichCompany',
    row: data.row,
    companyFileId: data.companyFileId,
    companyIdentificationConfidence:
      research.companyIdentificationConfidence || '',
  };
}

function writeCompanyInfo_(ss, research) {
  const sheet = requireSheet_(ss, '会社情報');
  const companyInfo = research.companyInfo || {};
  const evidence = research.companyInfoEvidence || {};
  const lastRow = Math.max(sheet.getLastRow(), 25);
  const labels = sheet.getRange(1, 2, lastRow, 1).getValues();
  const rowByLabel = {};

  labels.forEach(function (row, index) {
    const label = String(row[0] || '').trim();
    if (label) rowByLabel[label] = index + 1;
  });

  Object.keys(companyInfo).forEach(function (label) {
    const row = rowByLabel[label];
    if (!row) return;

    const itemEvidence = evidence[label] || {};
    sheet.getRange(row, 3).setValue(toCellText_(companyInfo[label]));
    sheet.getRange(row, 4).setValue(itemEvidence.sourceUrl || '');
    sheet
      .getRange(row, 5)
      .setValue(label === '調査日' ? companyInfo[label] : new Date());
    sheet.getRange(row, 6).setValue(itemEvidence.confidence || '');
    sheet.getRange(row, 7).setValue(itemEvidence.memo || '');
  });
}

function writeResearchNotes_(ss, notes) {
  const sheet = requireSheet_(ss, '調査メモ');
  sheet.clearContents();
  sheet.getRange('A1').setValue('■調査メモ');

  const values = normalizeList_(notes).map(function (note) {
    return ['・' + note];
  });
  if (values.length) sheet.getRange(2, 1, values.length, 1).setValues(values);
}

function writeProposal_(ss, proposal) {
  const sheet = requireSheet_(ss, '提案仮説');
  sheet.clearContents();
  sheet.getRange('A1').setValue('■提案仮説');

  const fields = [
    '会社の特徴',
    '想定課題（仮説・未確認）',
    'JV-ITが提案できそうな内容',
    '提案理由',
    '初回商談で確認する質問',
    '優先度',
  ];
  const values = fields.map(function (field) {
    return [field, toCellText_(proposal[field])];
  });
  sheet.getRange(2, 1, values.length, 2).setValues(values);
}

function writeEmailDraft_(ss, draft) {
  const sheet = requireSheet_(ss, '商談メール下書き');
  sheet.clearContents();
  sheet.getRange('A1').setValue('■商談メール下書き');
  sheet.getRange('A2').setValue('件名');
  sheet.getRange('B2').setValue(draft.subject || '');
  sheet.getRange('A3').setValue('本文');
  sheet.getRange('B3').setValue(draft.body || '');
  sheet.getRange('A4').setValue('送信前に人が確認すべき点');
  sheet
    .getRange('B4')
    .setValue(normalizeList_(draft.preSendChecks).map(function (v) {
      return '・' + v;
    }).join('\n'));
}

function writeSources_(ss, sources) {
  const sheet = requireSheet_(ss, '出典');
  sheet.clearContents();
  sheet.getRange('A1').setValue('■出典');
  sheet.getRange(2, 1, 1, 4).setValues([
    ['参照URL', '取得日', 'タイトル', 'メモ'],
  ]);

  const rows = (Array.isArray(sources) ? sources : [])
    .filter(function (source) {
      return source && source.url;
    })
    .map(function (source) {
      return [
        source.url,
        new Date(),
        source.title || '',
        source.memo || '',
      ];
    });

  if (rows.length) sheet.getRange(3, 1, rows.length, 4).setValues(rows);
}

function updateBusinessCardStatus_(row, research) {
  const ss = SpreadsheetApp.openById(LIST_ID);
  const sheet = requireSheet_(ss, SHEET_NAME);
  const headers = getHeaderMap_(sheet);

  setByHeader_(sheet, row, headers, COL.compConf,
    research.companyIdentificationConfidence || '');
  setByHeader_(sheet, row, headers, COL.processedAt, new Date());
  setByHeader_(sheet, row, headers, COL.status, '要確認');
  setByHeader_(
    sheet,
    row,
    headers,
    COL.memo,
    'AI調査・提案仮説・商談メール下書きを作成済み'
  );
}

function setByHeader_(sheet, row, headers, headerName, value) {
  const column = headers[headerName];
  if (column) sheet.getRange(row, column).setValue(value);
}

function requireSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function normalizeList_(value) {
  if (Array.isArray(value)) {
    return value.map(toCellText_).filter(Boolean);
  }
  const text = toCellText_(value);
  return text ? [text] : [];
}

function toCellText_(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(toCellText_).join('\n');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function findExistingCardByImageId_(imageId) {
  if (!imageId) return null;

  const ss = SpreadsheetApp.openById(LIST_ID);
  const sheet = requireSheet_(ss, SHEET_NAME);
  const headers = getHeaderMap_(sheet);
  const imageColumn = headers[COL.imgOrgId];
  if (!imageColumn) return null;

  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return null;

  const values = sheet
    .getRange(
      DATA_START_ROW,
      imageColumn,
      lastRow - DATA_START_ROW + 1,
      1
    )
    .getValues();
  const index = values.findIndex(function (row) {
    return String(row[0] || '') === String(imageId);
  });
  if (index < 0) return null;

  const row = DATA_START_ROW + index;
  return {
    row: row,
    no: headers[COL.no]
      ? sheet.getRange(row, headers[COL.no]).getValue()
      : '',
    companyFileUrl: headers[COL.companyFileUrl]
      ? sheet.getRange(row, headers[COL.companyFileUrl]).getValue()
      : '',
  };
}

function appendExecutionLog_(event) {
  const ss = SpreadsheetApp.openById(LIST_ID);
  const sheetName = '処理ログ';
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow([
      '処理日時',
      '取得元',
      'ソースキー',
      '取得元URL',
      '処理ステップ',
      'ステータス',
      '名刺一覧行',
      'メッセージ',
    ]);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    event.source || '',
    event.sourceKey || '',
    event.sourceUrl || '',
    event.step || '',
    event.status || '',
    event.row || '',
    event.message || '',
  ]);
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

