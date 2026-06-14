import re
from typing import Dict

_STOPWORDS = {
    'buy', 'price', 'cheap', 'best', 'deal', 'sale', 'online', 'offer'
}

_OCR_FIXES = [
    # Legacy Tesseract fixes removed as they break modern accurate texts like "iPhone 16" or "PS5"
]

_TOKEN_RE = re.compile(r'[A-Za-z0-9]+')


def normalize_query(text: str) -> Dict[str, str]:
    """Normalize a raw query string with light OCR repair and stopword stripping."""
    raw_query = (text or '').strip()
    
    # Strip SEO tracking or Store names appended by Google Lens (e.g. "iPhone 16 | Desertcart India")
    if '|' in raw_query:
        raw_query = raw_query.split('|')[0].strip()
        
    lower = raw_query.lower()

    # remove punctuation by keeping tokens
    tokens = _TOKEN_RE.findall(lower)
    rebuilt = ' '.join(tokens)

    fixed = rebuilt
    for pattern, replacement in _OCR_FIXES:
        fixed = pattern.sub(replacement, fixed)

    # split, drop stopwords and short tokens
    out_tokens = []
    for tok in fixed.split():
        if tok in _STOPWORDS:
            continue
        if len(tok) < 2:
            continue
        out_tokens.append(tok)

    cleaned = ' '.join(out_tokens).strip()
    if not cleaned:
        cleaned = raw_query.lower()

    return {'raw': raw_query, 'clean': cleaned}
