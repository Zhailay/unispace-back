const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOFFICE = process.env.SOFFICE_PATH
  || 'C:/Program Files/LibreOffice/program/soffice.exe';

/**
 * Конвертация RTF -> HTML через LibreOffice headless.
 * После конвертации все картинки встраиваются как base64 PNG data URI.
 * Прямой порт из webTestUpload/lib/rtfParser.js.
 */
async function rtfToHtml(rtfFilePath, outputDir) {
  // Проверка что файл действительно RTF
  const header = fs.readFileSync(rtfFilePath, { encoding: 'ascii', flag: 'r' }).substring(0, 5);
  if (header !== '{\\rtf') {
    throw new Error('Данный файл не является RTF документом');
  }

  // Конвертация RTF -> HTML через LibreOffice
  execSync(
    `"${SOFFICE}" --headless --convert-to html "${rtfFilePath}" --outdir "${outputDir}"`,
    { timeout: 120000, stdio: 'pipe' }
  );

  const baseName = path.basename(rtfFilePath, path.extname(rtfFilePath));
  const htmlPath = path.join(outputDir, baseName + '.html');

  if (!fs.existsSync(htmlPath)) {
    throw new Error('LibreOffice не создал HTML файл. Убедитесь что LibreOffice установлен и доступен по пути SOFFICE_PATH.');
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');

  html = await inlineImages(html, outputDir);

  try { fs.unlinkSync(htmlPath); } catch (e) { /* ignore */ }

  return html;
}

/**
 * Заменить <img src="..."> на data:image/png;base64,...
 * Картинки шире 768px ужимаются.
 */
async function inlineImages(html, baseDir) {
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  const matches = [...html.matchAll(imgRegex)];

  for (const match of matches) {
    const imgSrc = match[1];
    if (imgSrc.startsWith('data:')) continue;

    const decodedSrc = decodeURIComponent(imgSrc);
    const imgPath = path.resolve(baseDir, decodedSrc);
    if (!fs.existsSync(imgPath)) continue;

    try {
      const imgBuffer = fs.readFileSync(imgPath);
      let image = sharp(imgBuffer);
      const metadata = await image.metadata();

      if (metadata.width && metadata.width > 768) {
        image = image.resize(768);
      }

      const pngBuffer = await image.png().toBuffer();
      const base64 = pngBuffer.toString('base64');
      const dataUri = `data:image/png;base64,${base64}`;

      html = html.replace(match[0], match[0].replace(imgSrc, dataUri));

      try { fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error(`Failed to process image ${imgPath}:`, e.message);
    }
  }

  return html;
}

/**
 * Конвертация RTF-строки (из clipboard) в HTML с inline base64 картинками.
 * Используется для вставки формул из Word.
 */
async function rtfFragmentToHtml(rtfString) {
  const os = require('os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formula-'));
  const tmpFile = path.join(tmpDir, 'formula.rtf');

  try {
    fs.writeFileSync(tmpFile, rtfString, 'utf-8');

    execSync(
      `"${SOFFICE}" --headless --convert-to html "${tmpFile}" --outdir "${tmpDir}"`,
      { timeout: 30000, stdio: 'pipe' }
    );

    const htmlPath = path.join(tmpDir, 'formula.html');
    if (!fs.existsSync(htmlPath)) {
      throw new Error('LibreOffice не смог сконвертировать формулу');
    }

    let html = fs.readFileSync(htmlPath, 'utf-8');
    html = await inlineImages(html, tmpDir);

    // Извлечь только содержимое body (без обёртки html/head)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      html = bodyMatch[1].trim();
    }

    return html;
  } finally {
    // Очистка временных файлов
    try {
      const files = fs.readdirSync(tmpDir);
      for (const f of files) {
        try { fs.unlinkSync(path.join(tmpDir, f)); } catch (e) {}
      }
      fs.rmdirSync(tmpDir);
    } catch (e) {}
  }
}

module.exports = { rtfToHtml, rtfFragmentToHtml };
