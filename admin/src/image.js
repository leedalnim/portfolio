// 업로드 전에 브라우저에서 이미지를 줄인다.
// 폭은 최대 2000px, WebP 85% 품질. 긴 전체 페이지 캡처도 폭만 줄이고 높이는 비율대로 유지한다.
const MAX_W = 2000;

export async function compressImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return { blob: file, name: file.name };
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.85));
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return { blob: blob && blob.size < file.size ? blob : file, name: blob && blob.size < file.size ? name : file.name, before: file.size, after: Math.min(blob?.size ?? file.size, file.size) };
}

export function formatBytes(n) {
  if (n == null) return '';
  if (n < 1024 * 1024) return Math.round(n / 1024) + 'KB';
  return (n / 1024 / 1024).toFixed(1) + 'MB';
}
