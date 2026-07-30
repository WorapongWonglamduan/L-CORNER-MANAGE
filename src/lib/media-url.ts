// Normalizes a stored Media path/URL (file_path, thumbnail_path,
// medium_path) for use as an <Image>/<img> src.
//
// The local storage driver returns OS-path-like values — on Windows these
// can contain backslashes, and older rows may be missing a leading slash —
// which need normalizing into a same-origin path. The R2 driver returns a
// complete absolute URL (e.g. "https://pub-xxx.r2.dev/uploads/..."), which
// must be returned untouched: prepending "/" to it turns it into the
// broken same-origin path "/https://pub-xxx.r2.dev/..." instead of loading
// the real remote image (this exact bug shipped once already).
export function normalizeMediaUrl(filePath: string | null | undefined): string {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const withForwardSlashes = filePath.replace(/\\/g, "/");
  return withForwardSlashes.startsWith("/") ? withForwardSlashes : `/${withForwardSlashes}`;
}
