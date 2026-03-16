String stripAndDecodeHtml(String html) {
  var result = html;

  const htmlEntities = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  for (final entry in htmlEntities.entries) {
    result = result.replaceAll(entry.key, entry.value);
  }

  result = result.replaceAll(RegExp(r'<[^>]*>'), '');

  result = result.replaceAll(RegExp(r'\s+'), ' ').trim();

  return result;
}
