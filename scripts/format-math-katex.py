import json
import glob
import re

def format_equation(match):
    eq = match.group(0).strip()
    return f"${eq}$"

def clean_stem(stem):
    if not stem:
        return stem
    # Don't touch if it already has rich HTML or SVG
    if '<svg' in stem:
        return stem
    
    # Target common unformatted algebraic expressions
    patterns = [
        r'\b(?:x\^2|x\^3|[a-z]\^[0-9]+)\b(?:\s*[-+*\/]\s*[a-zA-Z0-9\^]+)*',
        r'\b[A-Za-z]\([0-9a-zA-Z,\s+-]+\)\s*=\s*[-+0-9A-Za-z\s\/\^\*\(\)\.]+',
        r'\(x\s*[-+]\s*[0-9]+\)\^[0-9]+',
        r'\(x\^2\s*[-+]\s*[0-9]+\)\s*\/\s*\(x\s*[-+]\s*[0-9]+\)',
    ]
    
    # Process text parts outside existing $ ... $
    parts = stem.split('$')
    for i in range(0, len(parts), 2):
        seg = parts[i]
        # Replace unformatted polynomials like "x^2 - 7x + 12" -> "$x^2 - 7x + 12$"
        seg = re.sub(r'(\b[-+]?[0-9]*[a-zA-Z]\^[0-9]+(?:\s*[-+*\/]\s*[-+]?[0-9]*[a-zA-Z0-9\^]*)*)', r'$\1$', seg)
        parts[i] = seg
        
    res = '$'.join(parts)
    # Deduplicate any $$ that became adjacent to each other
    res = re.sub(r'\${2,}', '$$', res)
    return res

total_formatted = 0
for test_file in sorted(glob.glob('content/tests/practice-test-*.json')):
    with open(test_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    math_sec = [s for s in data['form']['sections'] if s['id'] == 'math'][0]
    changed = False
    for mod in [math_sec['module1'], math_sec['module2']['lower'], math_sec['module2']['upper']]:
        for item in mod['items']:
            stem = item.get('stem', '')
            if ('^2' in stem or '^3' in stem) and '$' not in stem and not item.get('html'):
                formatted = clean_stem(stem)
                if formatted != stem:
                    item['stem'] = formatted
                    changed = True
                    total_formatted += 1
                    
            # Also format choices if they have raw ^2 or equations
            for c in item.get('choices', []):
                txt = c.get('text', '')
                if ('^2' in txt or '^3' in txt) and '$' not in txt:
                    c['text'] = clean_stem(txt)
                    changed = True
                    
    if changed:
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')

print(f"Total math questions updated with crisp KaTeX math formatting: {total_formatted}")
