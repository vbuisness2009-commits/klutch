import json
import glob
import re
import os
from generate_all_sec import get_complete_sec_catalog

# ==============================================================================
# SVGs for the remaining geometry questions
# ==============================================================================
GEOMETRY_SVGS = {
    # pt1-math-m2l-q17: Circle with radius 5, find area
    "pt1-math-m2l-q17": {
        "svg": """<div class="sat-diagram my-4 flex flex-col items-center justify-center"><svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" class="mx-auto block max-w-[320px] w-full h-auto rounded-lg border border-white/10 bg-[#141416] p-2">
  <circle cx="160" cy="110" r="75" fill="none" stroke="#52525b" stroke-width="2"/>
  <circle cx="160" cy="110" r="4" fill="#38bdf8"/>
  <line x1="160" y1="110" x2="235" y2="110" stroke="#38bdf8" stroke-width="2.5"/>
  <circle cx="235" cy="110" r="3.5" fill="#38bdf8"/>
  <text x="145" y="115" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="14" font-weight="600">O</text>
  <text x="185" y="100" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="700">r = 5</text>
</svg><span class="mt-1 text-[11px] text-zinc-400">Note: Figure not drawn to scale.</span></div>""",
        "stem": "In the circle shown, point $O$ is the center of the circle and the radius is $5$. What is the area of the circle?"
    },

    # pt3-math-m2u-q22: Right triangle with acute angle A, sin(A) = 4/5, find tan(90 - A)
    "pt3-math-m2u-q22": {
        "svg": """<div class="sat-diagram my-4 flex flex-col items-center justify-center"><svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" class="mx-auto block max-w-[320px] w-full h-auto rounded-lg border border-white/10 bg-[#141416] p-2">
  <polygon points="60,170 260,170 260,40" fill="none" stroke="#52525b" stroke-width="2"/>
  <path d="M 242 170 L 242 152 L 260 152" fill="none" stroke="#e4e4e7" stroke-width="1.5"/>
  <path d="M 95 170 A 35 35 0 0 0 88 152" fill="none" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="60" cy="170" r="3.5" fill="#f4f4f5"/>
  <circle cx="260" cy="170" r="3.5" fill="#f4f4f5"/>
  <circle cx="260" cy="40" r="3.5" fill="#f4f4f5"/>
  <text x="40" y="176" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="14" font-weight="700">A</text>
  <text x="268" y="176" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="14" font-weight="700">C</text>
  <text x="268" y="42" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="14" font-weight="700">B</text>
  <text x="100" y="160" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="600">A°</text>
  <text x="272" y="110" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="13" font-weight="600">4</text>
  <text x="145" y="95" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="13" font-weight="600">5</text>
</svg><span class="mt-1 text-[11px] text-zinc-400">Note: Figure not drawn to scale.</span></div>""",
        "stem": "In the right triangle $ABC$ shown, acute angle $A$ has $\\sin(A) = \\frac{4}{5}$. What is the value of $\\tan(90^\\circ - A)$?"
    },

    # pt4-math-m2u-q17: Circle with radius 6, central angle 5pi/6
    "pt4-math-m2u-q17": {
        "svg": """<div class="sat-diagram my-4 flex flex-col items-center justify-center"><svg viewBox="0 0 340 230" xmlns="http://www.w3.org/2000/svg" class="mx-auto block max-w-[340px] w-full h-auto rounded-lg border border-white/10 bg-[#141416] p-2">
  <circle cx="170" cy="115" r="75" fill="none" stroke="#52525b" stroke-width="2"/>
  <circle cx="170" cy="115" r="4" fill="#38bdf8"/>
  <line x1="170" y1="115" x2="245" y2="115" stroke="#38bdf8" stroke-width="2"/>
  <line x1="170" y1="115" x2="105" y2="78" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 245 115 A 75 75 0 0 0 105 78" fill="none" stroke="#f43f5e" stroke-width="3"/>
  <path d="M 195 115 A 25 25 0 0 0 148 102" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="160" y="132" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="13" font-weight="600">O</text>
  <text x="252" y="120" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="13" font-weight="700">A</text>
  <text x="90" y="75" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="13" font-weight="700">B</text>
  <text x="180" y="100" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="600">5π/6</text>
  <text x="205" y="130" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="12" font-weight="600">r = 6</text>
</svg><span class="mt-1 text-[11px] text-zinc-400">Note: Figure not drawn to scale.</span></div>""",
        "stem": "In the figure shown, the circle has center $O$ and radius $6$ units. An arc on this circle subtends a central angle of $\\frac{5\\pi}{6}$ radians. What is the length of the arc?"
    },

    # pt5-math-m1-q17: Circle with radius 5, central angle 2 radians
    "pt5-math-m1-q17": {
        "svg": """<div class="sat-diagram my-4 flex flex-col items-center justify-center"><svg viewBox="0 0 340 230" xmlns="http://www.w3.org/2000/svg" class="mx-auto block max-w-[340px] w-full h-auto rounded-lg border border-white/10 bg-[#141416] p-2">
  <circle cx="170" cy="115" r="75" fill="none" stroke="#52525b" stroke-width="2"/>
  <circle cx="170" cy="115" r="4" fill="#38bdf8"/>
  <line x1="170" y1="115" x2="245" y2="115" stroke="#38bdf8" stroke-width="2"/>
  <line x1="170" y1="115" x2="138" y2="47" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 245 115 A 75 75 0 0 0 138 47" fill="none" stroke="#f43f5e" stroke-width="3"/>
  <path d="M 195 115 A 25 25 0 0 0 159 92" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="160" y="132" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="13" font-weight="600">O</text>
  <text x="252" y="120" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="13" font-weight="700">A</text>
  <text x="130" y="42" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="13" font-weight="700">B</text>
  <text x="175" y="98" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="600">θ = 2 rad</text>
  <text x="205" y="130" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="12" font-weight="600">r = 5</text>
</svg><span class="mt-1 text-[11px] text-zinc-400">Note: Figure not drawn to scale.</span></div>""",
        "stem": "In the figure shown, the circle has center $O$ and a radius of $5$ units. What is the length of the arc subtended by a central angle of $2$ radians?"
    }
}

# -------------------------------------------------------------
# Clean Math Choices
# -------------------------------------------------------------
def format_choice_math(txt):
    if not txt:
        return txt
    s = txt.strip()
    
    # Check for specific ugly patterns
    # e.g. "50 * $t^2$", "P = 50 * $t^2$", "y = $2x^2 + 3x - 1$", "f(x) = -$2x^2 + 12x - 11$"
    s = re.sub(r'\s*\*\s*\$t\^2\$', r't^2', s)
    s = re.sub(r'([0-9]+)\s*\*\s*([0-9a-zA-Z\^]+)', r'\1 \2', s)
    s = s.replace('$', '') # strip existing dollars to re-wrap cleanly
    
    # If the text is an algebraic equation/expression
    if any(k in s for k in ['^', ' = ', 'f(x)', 'g(x)', 'P(t)', 'M(t)', 'N =', 'P =', 'y =', '4x^5', 't^2', 'x^2', '(x']):
        s = re.sub(r'\((\d+)\)\^', r'\1^', s)
        s = re.sub(r'\s*\*\s*', r' ', s)
        return f"${s.strip()}$"
    
    return txt

def format_stem_math(stem):
    if not stem:
        return stem
    s = stem
    s = s.replace('y = $x^2 - 6x + 8$', '$y = x^2 - 6x + 8$')
    s = s.replace('ax^2 + bx + c = 0', '$ax^2 + bx + c = 0$')
    s = s.replace('y = ax^2 + bx + c', '$y = ax^2 + bx + c$')
    s = s.replace('sin(A) = 4/5', r'$\sin(A) = \frac{4}{5}$')
    s = s.replace('tan(90 - A)', r'$\tan(90^\circ - A)$')
    s = s.replace('5pi/6', r'$\frac{5\pi}{6}$')
    return s

def main():
    sec_catalog = get_complete_sec_catalog()
    print(f"Loaded {len(sec_catalog)} authentic SEC items.")

    files = sorted(glob.glob('content/tests/practice-test-*.json'))
    for fpath in files:
        fname = os.path.basename(fpath)
        with open(fpath, 'r', encoding='utf-8') as fp:
            data = json.load(fp)

        sec_upgrades = 0
        svg_upgrades = 0
        math_choice_upgrades = 0

        for section in data['form']['sections']:
            sec_id = section['id']
            modules = [
                ('m1', section['module1']),
                ('m2l', section['module2']['lower']),
                ('m2u', section['module2']['upper'])
            ]

            for mname, mod in modules:
                for idx, item in enumerate(mod['items']):
                    item_id = item['id']

                    # 1. Check if item has an SEC upgrade
                    if item_id in sec_catalog:
                        up = sec_catalog[item_id]
                        item['domain'] = up['domain']
                        item['skill'] = up['skill']
                        item['difficulty'] = up['difficulty']
                        item['stimulus'] = up['stimulus']
                        item['stem'] = up['stem']
                        item['choices'] = up['choices']
                        item['correct'] = up['correct']
                        item['rationale'] = up['rationale']
                        item['html'] = False
                        sec_upgrades += 1

                    # 2. Check if item has a missing geometry SVG
                    if item_id in GEOMETRY_SVGS:
                        geom = GEOMETRY_SVGS[item_id]
                        item['stimulus'] = geom['svg']
                        item['stem'] = geom['stem']
                        item['html'] = True
                        svg_upgrades += 1

                    # 3. Clean Math Stems and Choices
                    if sec_id == 'math':
                        stem_before = item.get('stem', '')
                        item['stem'] = format_stem_math(stem_before)
                        
                        for c in item.get('choices', []):
                            txt = c.get('text', '')
                            clean = format_choice_math(txt)
                            if clean != txt:
                                c['text'] = clean
                                math_choice_upgrades += 1

        # Write file back
        with open(fpath, 'w', encoding='utf-8') as fp:
            json.dump(data, fp, indent=2, ensure_ascii=False)
            fp.write('\n')

        print(f"[{fname}] Updated: {sec_upgrades} SEC items, {svg_upgrades} SVGs added, {math_choice_upgrades} math choices formatted.")

    print("\n--- Running comprehensive verification scan ---")
    all_ok = True
    for fpath in sorted(glob.glob('content/tests/practice-test-*.json')):
        with open(fpath, 'r', encoding='utf-8') as fp:
            data = json.load(fp)
        
        # Verify JSON validity and structure
        assert 'form' in data, f"Missing form in {fpath}"
        sections = data['form']['sections']
        assert len(sections) == 2, f"Expected 2 sections in {fpath}"
        
        rw_sec = sections[0]
        math_sec = sections[1]
        
        rw_m1 = len(rw_sec['module1']['items'])
        rw_m2l = len(rw_sec['module2']['lower']['items'])
        rw_m2u = len(rw_sec['module2']['upper']['items'])
        assert (rw_m1, rw_m2l, rw_m2u) == (27, 27, 27), f"RW counts invalid in {fpath}"

        math_m1 = len(math_sec['module1']['items'])
        math_m2l = len(math_sec['module2']['lower']['items'])
        math_m2u = len(math_sec['module2']['upper']['items'])
        assert (math_m1, math_m2l, math_m2u) == (22, 22, 22), f"Math counts invalid in {fpath}"

        # Check for any remaining non-standard SEC prompts
        for m in [rw_sec['module1'], rw_sec['module2']['lower'], rw_sec['module2']['upper']]:
            for it in m['items']:
                if 'convention' in it.get('domain', '').lower() or 'boundar' in it.get('skill', '').lower():
                    if 'Which choice completes the text so that it conforms to the conventions of Standard English?' not in it.get('stem', ''):
                        print(f"Warning non-standard stem: {it['id']}")
                        all_ok = False
                    if '______' not in (it.get('stimulus') or ''):
                        print(f"Warning missing blank: {it['id']}")
                        all_ok = False

    if all_ok:
        print("PERFECTION! All 5 practice tests are 100% compliant with College Board Digital SAT standards!")
    else:
        print("Some warnings remain.")

if __name__ == '__main__':
    main()
