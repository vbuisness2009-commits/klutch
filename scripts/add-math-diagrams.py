import json
import os
import math

TESTS_DIR = os.path.join(os.getcwd(), "content", "tests")

# ==============================================================================
# SVG GENERATOR HELPERS (Clean, dark-mode compatible, College Board styled)
# ==============================================================================

def svg_wrap(content: str, width: int = 340, height: int = 240) -> str:
    return (
        f'<div class="sat-diagram my-4 flex flex-col items-center justify-center">'
        f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" '
        f'class="mx-auto block max-w-[340px] w-full h-auto rounded-lg border border-white/10 bg-[#141416] p-2">'
        f'{content}'
        f'</svg>'
        f'</div>'
    )

def svg_circle_sector(r_label: str, angle_label: str, angle_deg: float = 60.0) -> str:
    cx, cy, r = 170, 110, 75
    rad = math.radians(angle_deg)
    bx = cx + r * math.cos(rad)
    by = cy - r * math.sin(rad)
    
    large_arc = 1 if angle_deg > 180 else 0
    sector_path = f"M {cx} {cy} L {cx + r} {cy} A {r} {r} 0 {large_arc} 0 {bx:.2f} {by:.2f} Z"
    
    arc_r = 24
    arc_bx = cx + arc_r * math.cos(rad)
    arc_by = cy - arc_r * math.sin(rad)
    angle_arc_path = f"M {cx + arc_r} {cy} A {arc_r} {arc_r} 0 0 0 {arc_bx:.2f} {arc_by:.2f}"
    
    mid_rad = rad / 2
    label_x = cx + (arc_r + 18) * math.cos(mid_rad)
    label_y = cy - (arc_r + 18) * math.sin(mid_rad) + 4

    content = f"""
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#52525b" stroke-width="1.5" stroke-dasharray="3,3"/>
  <path d="{sector_path}" fill="#38bdf8" fill-opacity="0.16" stroke="#38bdf8" stroke-width="2"/>
  <path d="{angle_arc_path}" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <circle cx="{cx}" cy="{cy}" r="3.5" fill="#f4f4f5"/>
  <circle cx="{cx + r}" cy="{cy}" r="3.5" fill="#38bdf8"/>
  <circle cx="{bx:.2f}" cy="{by:.2f}" r="3.5" fill="#38bdf8"/>
  <text x="{label_x:.1f}" y="{label_y:.1f}" fill="#fbbf24" font-size="12" font-family="system-ui, sans-serif" font-weight="600">{angle_label}</text>
  <text x="{cx - 14}" y="{cy + 15}" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">O</text>
  <text x="{cx + r + 10}" y="{cy + 4}" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">A</text>
  <text x="{bx + 8:.1f}" y="{by - 4:.1f}" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">B</text>
  <text x="{cx + r/2:.1f}" y="{cy + 16}" fill="#a1a1aa" font-size="12" font-family="system-ui, sans-serif">{r_label}</text>
  <text x="170" y="222" text-anchor="middle" fill="#71717a" font-size="11" font-style="italic" font-family="system-ui, sans-serif">Note: Figure not drawn to scale.</text>
"""
    return svg_wrap(content, 340, 235)

def svg_right_triangle(leg_bottom: str, leg_left: str, hyp: str, angle_a: str = "", angle_b: str = "") -> str:
    c_x, c_y = 80, 175
    b_x, b_y = 260, 175
    a_x, a_y = 80, 60
    
    content = f"""
  <polygon points="{c_x},{c_y} {b_x},{b_y} {a_x},{a_y}" fill="#38bdf8" fill-opacity="0.12" stroke="#38bdf8" stroke-width="2"/>
  <rect x="{c_x}" y="{c_y - 14}" width="14" height="14" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <circle cx="{c_x}" cy="{c_y}" r="3.5" fill="#f4f4f5"/>
  <circle cx="{b_x}" cy="{b_y}" r="3.5" fill="#f4f4f5"/>
  <circle cx="{a_x}" cy="{a_y}" r="3.5" fill="#f4f4f5"/>
  <text x="{c_x - 14}" y="{c_y + 14}" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">C</text>
  <text x="{b_x + 10}" y="{b_y + 6}" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">B</text>
  <text x="{a_x - 4}" y="{a_y - 10}" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">A</text>
  <text x="{(c_x + b_x)/2}" y="{c_y + 18}" text-anchor="middle" fill="#a1a1aa" font-size="13" font-family="system-ui, sans-serif" font-weight="500">{leg_bottom}</text>
  <text x="{c_x - 14}" y="{(c_y + a_y)/2 + 4}" text-anchor="end" fill="#a1a1aa" font-size="13" font-family="system-ui, sans-serif" font-weight="500">{leg_left}</text>
  <text x="{(a_x + b_x)/2 + 12}" y="{(a_y + b_y)/2 - 8}" fill="#a1a1aa" font-size="13" font-family="system-ui, sans-serif" font-weight="500">{hyp}</text>
"""
    if angle_a:
        content += f"""
  <path d="M {a_x} {a_y + 24} A 24 24 0 0 0 {a_x + 14} {a_y + 20}" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="{a_x + 20}" y="{a_y + 36}" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">{angle_a}</text>
"""
    if angle_b:
        content += f"""
  <path d="M {b_x - 26} {b_y} A 26 26 0 0 1 {b_x - 22} {b_y - 14}" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="{b_x - 44}" y="{b_y - 8}" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">{angle_b}</text>
"""
    content += f"""
  <text x="170" y="222" text-anchor="middle" fill="#71717a" font-size="11" font-style="italic" font-family="system-ui, sans-serif">Note: Figure not drawn to scale.</text>
"""
    return svg_wrap(content, 340, 235)

def svg_similar_triangles() -> str:
    content = """
  <!-- Triangle ABC -->
  <polygon points="40,170 140,170 65,85" fill="#38bdf8" fill-opacity="0.12" stroke="#38bdf8" stroke-width="2"/>
  <!-- Triangle DEF -->
  <polygon points="175,170 310,170 205,55" fill="#a78bfa" fill-opacity="0.12" stroke="#a78bfa" stroke-width="2"/>
  <!-- Labels for ABC -->
  <text x="30" y="185" fill="#f4f4f5" font-size="12" font-family="system-ui, sans-serif" font-weight="600">A</text>
  <text x="145" y="185" fill="#f4f4f5" font-size="12" font-family="system-ui, sans-serif" font-weight="600">B</text>
  <text x="60" y="75" fill="#f4f4f5" font-size="12" font-family="system-ui, sans-serif" font-weight="600">C</text>
  <text x="46" y="162" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">42°</text>
  <text x="110" y="162" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">68°</text>
  <!-- Labels for DEF -->
  <text x="165" y="185" fill="#f4f4f5" font-size="12" font-family="system-ui, sans-serif" font-weight="600">D</text>
  <text x="315" y="185" fill="#f4f4f5" font-size="12" font-family="system-ui, sans-serif" font-weight="600">E</text>
  <text x="200" y="45" fill="#f4f4f5" font-size="12" font-family="system-ui, sans-serif" font-weight="600">F</text>
  <text x="182" y="162" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">42°</text>
  <text x="278" y="162" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">68°</text>
  <path d="M 197 70 A 18 18 0 0 0 220 74" fill="none" stroke="#34d399" stroke-width="1.5"/>
  <text x="210" y="92" fill="#34d399" font-size="12" font-family="system-ui, sans-serif" font-weight="600">?</text>
  <text x="170" y="222" text-anchor="middle" fill="#71717a" font-size="11" font-style="italic" font-family="system-ui, sans-serif">Note: Figure not drawn to scale.</text>
"""
    return svg_wrap(content, 340, 235)

def svg_parallel_lines(angle1: str, angle2: str) -> str:
    content = f"""
  <!-- Lines l and m -->
  <line x1="30" y1="80" x2="310" y2="80" stroke="#38bdf8" stroke-width="2"/>
  <line x1="30" y1="150" x2="310" y2="150" stroke="#38bdf8" stroke-width="2"/>
  <!-- Transversal t -->
  <line x1="85" y1="35" x2="255" y2="195" stroke="#a78bfa" stroke-width="2"/>
  <!-- Parallel markers -->
  <polygon points="170,76 178,80 170,84" fill="#38bdf8"/>
  <polygon points="170,146 178,150 170,154" fill="#38bdf8"/>
  <text x="318" y="84" fill="#d4d4d8" font-size="13" font-style="italic" font-family="system-ui, sans-serif">l</text>
  <text x="318" y="154" fill="#d4d4d8" font-size="13" font-style="italic" font-family="system-ui, sans-serif">m</text>
  <text x="75" y="42" fill="#d4d4d8" font-size="13" font-style="italic" font-family="system-ui, sans-serif">t</text>
  <!-- Angles (Alternate interior) -->
  <path d="M 153 80 A 20 20 0 0 1 146 92" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="156" y="102" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">{angle1}</text>
  <path d="M 187 150 A 20 20 0 0 1 194 138" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="120" y="142" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">{angle2}</text>
  <text x="170" y="222" text-anchor="middle" fill="#71717a" font-size="11" font-style="italic" font-family="system-ui, sans-serif">Note: Figure not drawn to scale.</text>
"""
    return svg_wrap(content, 340, 235)

def svg_tangent_circle() -> str:
    content = """
  <!-- Circle centered at (120, 110) with r = 60 -->
  <circle cx="120" cy="110" r="60" fill="none" stroke="#52525b" stroke-width="1.5"/>
  <!-- Tangent line from B (280, 170) to A (120, 170) -->
  <line x1="120" y1="170" x2="295" y2="170" stroke="#38bdf8" stroke-width="2"/>
  <!-- Radius OA -->
  <line x1="120" y1="110" x2="120" y2="170" stroke="#38bdf8" stroke-width="2"/>
  <!-- Hypotenuse OB -->
  <line x1="120" y1="110" x2="280" y2="170" stroke="#a78bfa" stroke-width="2" stroke-dasharray="4,3"/>
  <!-- Right angle at A -->
  <rect x="120" y="156" width="14" height="14" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <!-- Points -->
  <circle cx="120" cy="110" r="3.5" fill="#f4f4f5"/>
  <circle cx="120" cy="170" r="3.5" fill="#f4f4f5"/>
  <circle cx="280" cy="170" r="3.5" fill="#f4f4f5"/>
  <text x="105" y="112" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">O</text>
  <text x="115" y="192" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">A</text>
  <text x="286" y="190" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">B</text>
  <text x="96" y="145" fill="#a1a1aa" font-size="12" font-family="system-ui, sans-serif">r = 5</text>
  <text x="200" y="132" fill="#c4b5fd" font-size="12" font-family="system-ui, sans-serif">13</text>
  <text x="170" y="222" text-anchor="middle" fill="#71717a" font-size="11" font-style="italic" font-family="system-ui, sans-serif">Note: Figure not drawn to scale.</text>
"""
    return svg_wrap(content, 340, 235)

def svg_parabola_coord(vertex_x: float, vertex_y: float, a: float, x_min: int, x_max: int, y_min: int, y_max: int, title: str = "") -> str:
    plot_x0, plot_x1 = 45, 315
    plot_y0, plot_y1 = 30, 225
    
    def map_x(x):
        return plot_x0 + (x - x_min) / (x_max - x_min) * (plot_x1 - plot_x0)
    def map_y(y):
        return plot_y1 - (y - y_min) / (y_max - y_min) * (plot_y1 - plot_y0)
    
    ox = map_x(0)
    oy = map_y(0)
    
    grid_svg = []
    ticks_svg = []
    for x in range(x_min, x_max + 1):
        gx = map_x(x)
        grid_svg.append(f'<line x1="{gx:.1f}" y1="{plot_y0}" x2="{gx:.1f}" y2="{plot_y1}" stroke="#27272a" stroke-width="1"/>')
        if x != 0 and x % 2 == 0:
            ticks_svg.append(f'<text x="{gx:.1f}" y="{oy + 14:.1f}" text-anchor="middle" fill="#71717a" font-size="10" font-family="system-ui">{x}</text>')
            
    for y in range(y_min, y_max + 1):
        gy = map_y(y)
        grid_svg.append(f'<line x1="{plot_x0}" y1="{gy:.1f}" x2="{plot_x1}" y2="{gy:.1f}" stroke="#27272a" stroke-width="1"/>')
        if y != 0 and y % 2 == 0:
            ticks_svg.append(f'<text x="{ox - 8:.1f}" y="{gy + 3:.1f}" text-anchor="end" fill="#71717a" font-size="10" font-family="system-ui">{y}</text>')

    axes_svg = f"""
  <line x1="{plot_x0 - 10}" y1="{oy:.1f}" x2="{plot_x1 + 10}" y2="{oy:.1f}" stroke="#a1a1aa" stroke-width="1.5"/>
  <line x1="{ox:.1f}" y1="{plot_y1 + 10}" x2="{ox:.1f}" y2="{plot_y0 - 10}" stroke="#a1a1aa" stroke-width="1.5"/>
  <text x="{plot_x1 + 15}" y="{oy + 4:.1f}" fill="#a1a1aa" font-size="11" font-family="system-ui">x</text>
  <text x="{ox:.1f}" y="{plot_y0 - 14}" text-anchor="middle" fill="#a1a1aa" font-size="11" font-family="system-ui">y</text>
  <text x="{ox - 7:.1f}" y="{oy + 12:.1f}" fill="#71717a" font-size="10" font-family="system-ui">O</text>
"""
    pts = []
    step = 0.1
    cur_x = x_min - 0.5
    while cur_x <= x_max + 0.5:
        cur_y = a * ((cur_x - vertex_x) ** 2) + vertex_y
        if y_min - 1 <= cur_y <= y_max + 1:
            pts.append(f"{map_x(cur_x):.1f},{map_y(cur_y):.1f}")
        cur_x += step
        
    curve_svg = f'<polyline points="{" ".join(pts)}" fill="none" stroke="#38bdf8" stroke-width="2.2"/>'
    
    vx_mapped = map_x(vertex_x)
    vy_mapped = map_y(vertex_y)
    dot_svg = f"""
  <circle cx="{vx_mapped:.1f}" cy="{vy_mapped:.1f}" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
  <text x="{vx_mapped + 8:.1f}" y="{vy_mapped - 8:.1f}" fill="#38bdf8" font-size="11" font-family="system-ui" font-weight="600">({int(vertex_x)}, {int(vertex_y)})</text>
"""

    title_svg = f'<text x="170" y="20" text-anchor="middle" fill="#d4d4d8" font-size="12" font-family="system-ui" font-weight="500">{title}</text>' if title else ''
    
    content = f"""
  {title_svg}
  {''.join(grid_svg)}
  {axes_svg}
  {''.join(ticks_svg)}
  {curve_svg}
  {dot_svg}
"""
    return svg_wrap(content, 340, 255)

def svg_linear_coord(p1: tuple, p2: tuple, title: str = "") -> str:
    plot_x0, plot_x1 = 45, 315
    plot_y0, plot_y1 = 30, 225
    x_min, x_max = -2, 8
    y_min, y_max = -2, 14
    
    def map_x(x):
        return plot_x0 + (x - x_min) / (x_max - x_min) * (plot_x1 - plot_x0)
    def map_y(y):
        return plot_y1 - (y - y_min) / (y_max - y_min) * (plot_y1 - plot_y0)
    
    ox, oy = map_x(0), map_y(0)
    
    grid_svg = []
    ticks_svg = []
    for x in range(x_min, x_max + 1):
        gx = map_x(x)
        grid_svg.append(f'<line x1="{gx:.1f}" y1="{plot_y0}" x2="{gx:.1f}" y2="{plot_y1}" stroke="#27272a" stroke-width="1"/>')
        if x != 0 and x % 2 == 0:
            ticks_svg.append(f'<text x="{gx:.1f}" y="{oy + 14:.1f}" text-anchor="middle" fill="#71717a" font-size="10" font-family="system-ui">{x}</text>')
            
    for y in range(y_min, y_max + 1):
        gy = map_y(y)
        grid_svg.append(f'<line x1="{plot_x0}" y1="{gy:.1f}" x2="{plot_x1}" y2="{gy:.1f}" stroke="#27272a" stroke-width="1"/>')
        if y != 0 and y % 4 == 0:
            ticks_svg.append(f'<text x="{ox - 8:.1f}" y="{gy + 3:.1f}" text-anchor="end" fill="#71717a" font-size="10" font-family="system-ui">{y}</text>')

    m = (p2[1] - p1[1]) / (p2[0] - p1[0])
    b = p1[1] - m * p1[0]
    
    line_x0 = -1.5
    line_y0 = m * line_x0 + b
    line_x1 = 3.5
    line_y1 = m * line_x1 + b
    
    line_svg = f'<line x1="{map_x(line_x0):.1f}" y1="{map_y(line_y0):.1f}" x2="{map_x(line_x1):.1f}" y2="{map_y(line_y1):.1f}" stroke="#38bdf8" stroke-width="2.2"/>'
    
    p1_svg = f"""
  <circle cx="{map_x(p1[0]):.1f}" cy="{map_y(p1[1]):.1f}" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
  <text x="{map_x(p1[0]) + 8:.1f}" y="{map_y(p1[1]) + 4:.1f}" fill="#f4f4f5" font-size="11" font-family="system-ui" font-weight="600">({p1[0]}, {p1[1]})</text>
"""
    p2_svg = f"""
  <circle cx="{map_x(p2[0]):.1f}" cy="{map_y(p2[1]):.1f}" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
  <text x="{map_x(p2[0]) - 8:.1f}" y="{map_y(p2[1]) - 8:.1f}" text-anchor="end" fill="#f4f4f5" font-size="11" font-family="system-ui" font-weight="600">({p2[0]}, {p2[1]})</text>
"""
    title_svg = f'<text x="170" y="20" text-anchor="middle" fill="#d4d4d8" font-size="12" font-family="system-ui" font-weight="500">{title}</text>' if title else ''

    content = f"""
  {title_svg}
  {''.join(grid_svg)}
  <line x1="{plot_x0 - 10}" y1="{oy:.1f}" x2="{plot_x1 + 10}" y2="{oy:.1f}" stroke="#a1a1aa" stroke-width="1.5"/>
  <line x1="{ox:.1f}" y1="{plot_y1 + 10}" x2="{ox:.1f}" y2="{plot_y0 - 10}" stroke="#a1a1aa" stroke-width="1.5"/>
  <text x="{plot_x1 + 15}" y="{oy + 4:.1f}" fill="#a1a1aa" font-size="11" font-family="system-ui">x</text>
  <text x="{ox:.1f}" y="{plot_y0 - 14}" text-anchor="middle" fill="#a1a1aa" font-size="11" font-family="system-ui">y</text>
  <text x="{ox - 7:.1f}" y="{oy + 12:.1f}" fill="#71717a" font-size="10" font-family="system-ui">O</text>
  {''.join(ticks_svg)}
  {line_svg}
  {p1_svg}
  {p2_svg}
"""
    return svg_wrap(content, 340, 255)

def svg_circle_plane(center: tuple, radius: float, pt: tuple = None, title: str = "", arc_theta: bool = False) -> str:
    plot_x0, plot_x1 = 45, 315
    plot_y0, plot_y1 = 30, 225
    x_min, x_max = -7, 7
    y_min, y_max = -7, 7
    
    def map_x(x):
        return plot_x0 + (x - x_min) / (x_max - x_min) * (plot_x1 - plot_x0)
    def map_y(y):
        return plot_y1 - (y - y_min) / (y_max - y_min) * (plot_y1 - plot_y0)
    
    ox, oy = map_x(0), map_y(0)
    
    grid_svg = []
    ticks_svg = []
    for x in range(x_min, x_max + 1):
        gx = map_x(x)
        grid_svg.append(f'<line x1="{gx:.1f}" y1="{plot_y0}" x2="{gx:.1f}" y2="{plot_y1}" stroke="#27272a" stroke-width="1"/>')
        if x != 0 and x % 2 == 0:
            ticks_svg.append(f'<text x="{gx:.1f}" y="{oy + 14:.1f}" text-anchor="middle" fill="#71717a" font-size="10" font-family="system-ui">{x}</text>')
            
    for y in range(y_min, y_max + 1):
        gy = map_y(y)
        grid_svg.append(f'<line x1="{plot_x0}" y1="{gy:.1f}" x2="{plot_x1}" y2="{gy:.1f}" stroke="#27272a" stroke-width="1"/>')
        if y != 0 and y % 2 == 0:
            ticks_svg.append(f'<text x="{ox - 8:.1f}" y="{gy + 3:.1f}" text-anchor="end" fill="#71717a" font-size="10" font-family="system-ui">{y}</text>')

    r_mapped = radius / (x_max - x_min) * (plot_x1 - plot_x0)
    cx_mapped = map_x(center[0])
    cy_mapped = map_y(center[1])
    
    circle_svg = f'<circle cx="{cx_mapped:.1f}" cy="{cy_mapped:.1f}" r="{r_mapped:.1f}" fill="#38bdf8" fill-opacity="0.1" stroke="#38bdf8" stroke-width="2"/>'
    center_svg = f'<circle cx="{cx_mapped:.1f}" cy="{cy_mapped:.1f}" r="3.5" fill="#f4f4f5"/>'
    
    pt_svg = ""
    if pt:
        px, py = map_x(pt[0]), map_y(pt[1])
        theta_arc = ""
        if arc_theta:
            # Angle arc from positive x-axis to (-3, 4) in Q2
            theta_arc = f"""
  <path d="M {ox + 22} {oy} A 22 22 0 0 0 {ox - 13.2:.1f} {oy - 17.6:.1f}" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="{ox - 4}" y="{oy - 26}" fill="#fbbf24" font-size="11" font-family="system-ui" font-weight="600">θ</text>
"""
        pt_svg = f"""
  <line x1="{cx_mapped:.1f}" y1="{cy_mapped:.1f}" x2="{px:.1f}" y2="{py:.1f}" stroke="#a78bfa" stroke-width="1.8"/>
  <line x1="{px:.1f}" y1="{oy:.1f}" x2="{px:.1f}" y2="{py:.1f}" stroke="#71717a" stroke-width="1.2" stroke-dasharray="3,3"/>
  <circle cx="{px:.1f}" cy="{py:.1f}" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
  <text x="{px - 10:.1f}" y="{py - 8:.1f}" fill="#f4f4f5" font-size="11" font-family="system-ui" font-weight="600">P({pt[0]}, {pt[1]})</text>
  <text x="{(cx_mapped + px)/2 - 12:.1f}" y="{(cy_mapped + py)/2 + 10:.1f}" fill="#c4b5fd" font-size="11" font-family="system-ui">r = {int(radius)}</text>
  {theta_arc}
"""
    title_svg = f'<text x="170" y="20" text-anchor="middle" fill="#d4d4d8" font-size="12" font-family="system-ui" font-weight="500">{title}</text>' if title else ''

    content = f"""
  {title_svg}
  {''.join(grid_svg)}
  <line x1="{plot_x0 - 10}" y1="{oy:.1f}" x2="{plot_x1 + 10}" y2="{oy:.1f}" stroke="#a1a1aa" stroke-width="1.5"/>
  <line x1="{ox:.1f}" y1="{plot_y1 + 10}" x2="{ox:.1f}" y2="{plot_y0 - 10}" stroke="#a1a1aa" stroke-width="1.5"/>
  <text x="{plot_x1 + 15}" y="{oy + 4:.1f}" fill="#a1a1aa" font-size="11" font-family="system-ui">x</text>
  <text x="{ox:.1f}" y="{plot_y0 - 14}" text-anchor="middle" fill="#a1a1aa" font-size="11" font-family="system-ui">y</text>
  <text x="{ox - 7:.1f}" y="{oy + 12:.1f}" fill="#71717a" font-size="10" font-family="system-ui">O</text>
  {''.join(ticks_svg)}
  {circle_svg}
  {center_svg}
  {pt_svg}
"""
    return svg_wrap(content, 340, 255)

def svg_triangle_angles(a_deg: str, b_deg: str, c_label: str) -> str:
    content = f"""
  <polygon points="60,175 270,175 180,60" fill="#38bdf8" fill-opacity="0.12" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="60" cy="175" r="3.5" fill="#f4f4f5"/>
  <circle cx="270" cy="175" r="3.5" fill="#f4f4f5"/>
  <circle cx="180" cy="60" r="3.5" fill="#f4f4f5"/>
  <text x="46" y="190" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">A</text>
  <text x="278" y="190" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">B</text>
  <text x="180" y="46" text-anchor="middle" fill="#f4f4f5" font-size="13" font-family="system-ui, sans-serif" font-weight="600">C</text>
  <!-- Angle arcs -->
  <path d="M 85 175 A 25 25 0 0 0 78 155" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="88" y="166" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">{a_deg}</text>
  <path d="M 245 175 A 25 25 0 0 1 252 153" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="220" y="166" fill="#fbbf24" font-size="11" font-family="system-ui, sans-serif">{b_deg}</text>
  <path d="M 170 76 A 22 22 0 0 0 192 76" fill="none" stroke="#34d399" stroke-width="1.5"/>
  <text x="180" y="98" text-anchor="middle" fill="#34d399" font-size="12" font-family="system-ui, sans-serif" font-weight="600">{c_label}</text>
  <text x="170" y="222" text-anchor="middle" fill="#71717a" font-size="11" font-style="italic" font-family="system-ui, sans-serif">Note: Figure not drawn to scale.</text>
"""
    return svg_wrap(content, 340, 235)


# ==============================================================================
# APPLY DIAGRAMS ACROSS TESTS 1 THROUGH 5
# ==============================================================================

def update_item_in_test(test_data, item_id, updates):
    for sec in test_data["form"]["sections"]:
        if sec["id"] == "math":
            for mod in [sec["module1"], sec["module2"]["lower"], sec["module2"]["upper"]]:
                for idx, item in enumerate(mod["items"]):
                    if item["id"] == item_id:
                        for k, v in updates.items():
                            item[k] = v
                        return True
    return False

# ----------------- TEST 1 -----------------
with open(os.path.join(TESTS_DIR, "practice-test-1.json"), "r") as f:
    pt1 = json.load(f)

# pt1-math-m1-q17: circle arc
update_item_in_test(pt1, "pt1-math-m1-q17", {
    "html": True,
    "stimulus": svg_circle_sector("r = 6", "π/3", 60),
    "stem": "In the circle shown, point $O$ is the center of the circle, the radius is $6$, and the measure of central angle $AOB$ is $\\frac{\\pi}{3}$ radians. What is the length of arc $AB$?",
    "rationale": "The length of an arc with central angle $\\theta$ (in radians) and radius $r$ is $s = r\\theta$. Substituting $r = 6$ and $\\theta = \\frac{\\pi}{3}$: $$s = 6 \\times \\frac{\\pi}{3} = 2\\pi$$"
})

# pt1-math-m1-q20: right triangle
update_item_in_test(pt1, "pt1-math-m1-q20", {
    "html": True,
    "stimulus": svg_right_triangle("BC", "8", "17"),
    "stem": "In right triangle $ABC$ shown, the hypotenuse $\\overline{AB}$ has length $17$ and leg $\\overline{AC}$ has length $8$. What is the area, in square units, of triangle $ABC$?",
    "rationale": "By the Pythagorean theorem, the length of leg $\\overline{BC}$ is $\\sqrt{17^2 - 8^2} = \\sqrt{289 - 64} = \\sqrt{225} = 15$. The area of right triangle $ABC$ is $\\frac{1}{2} \\times \\text{base} \\times \\text{height} = \\frac{1}{2} \\times 15 \\times 8 = 60$ square units."
})

# pt1-math-m2l-q09: parabola vertex
update_item_in_test(pt1, "pt1-math-m2l-q09", {
    "html": True,
    "stimulus": svg_parabola_coord(4, 3, 1, -1, 8, -1, 10, "y = g(x)"),
    "stem": "The graph of $y = g(x)$ is shown in the $xy$-plane. Which of the following defines $g(x)$?",
    "choices": [
        {"id": "A", "text": "g(x) = (x - 4)^2 + 3"},
        {"id": "B", "text": "g(x) = (x + 4)^2 + 3"},
        {"id": "C", "text": "g(x) = (x - 4)^2 - 3"},
        {"id": "D", "text": "g(x) = (x + 4)^2 - 3"}
    ],
    "correct": "A",
    "rationale": "The vertex of the parabola is clearly at $(4, 3)$. In vertex form, the equation of a parabola opening upward with vertex $(h, k)$ is $y = a(x - h)^2 + k$. Here $(h, k) = (4, 3)$ and $a = 1$, giving $g(x) = (x - 4)^2 + 3$."
})

# pt1-math-m2l-q21: triangle angle sum
update_item_in_test(pt1, "pt1-math-m2l-q21", {
    "html": True,
    "stimulus": svg_triangle_angles("45°", "75°", "C"),
    "stem": "In triangle $ABC$ shown, the measure of angle $A$ is $45^\\circ$ and the measure of angle $B$ is $75^\\circ$. What is the measure, in degrees, of angle $C$?",
    "rationale": "The sum of the interior angles in any triangle is $180^\\circ$. Therefore, the measure of angle $C$ is: $$180^\\circ - 45^\\circ - 75^\\circ = 60^\\circ$$"
})

# pt1-math-m2u-q17: circle central angle from arc
update_item_in_test(pt1, "pt1-math-m2u-q17", {
    "html": True,
    "stimulus": svg_circle_sector("r = 6", "θ", 75),
    "stem": "In the figure shown, the circle has center $O$ and radius $6$. The length of arc $AB$ is $\\frac{5\\pi}{2}$. What is the measure of central angle $AOB$, in radians?",
    "choices": [
        {"id": "A", "text": "5pi/12"},
        {"id": "B", "text": "5pi/6"},
        {"id": "C", "text": "5pi/4"},
        {"id": "D", "text": "5pi/3"}
    ],
    "correct": "A",
    "rationale": "Arc length is given by $s = r\\theta$. Substituting $s = \\frac{5\\pi}{2}$ and $r = 6$: $$\\frac{5\\pi}{2} = 6\\theta \\implies \\theta = \\frac{5\\pi}{12}$$"
})

# pt1-math-m2u-q20: right triangle trig
update_item_in_test(pt1, "pt1-math-m2u-q20", {
    "html": True,
    "stimulus": svg_right_triangle("adjacent", "opposite", "25", angle_b="A"),
    "stem": "In right triangle $ABC$ shown, the hypotenuse has length $25$. If $\\tan(A) = \\frac{3}{4}$, what is the length of the side opposite angle $A$?",
    "accepted": ["15"],
    "rationale": "Since $\\tan(A) = \\frac{\\text{opposite}}{\\text{adjacent}} = \\frac{3}{4}$, the legs are in ratio $3k : 4k$, making the hypotenuse $5k$. With hypotenuse $5k = 25$, we have $k = 5$. Thus, the side opposite angle $A$ has length $3k = 3(5) = 15$."
})

pt1["updatedAt"] = "2026-10-11T01:30:00.000Z"
with open(os.path.join(TESTS_DIR, "practice-test-1.json"), "w") as f:
    json.dump(pt1, f, indent=2, ensure_ascii=False)
print("Updated Practice Test 1 with SVG diagrams.")


# ----------------- TEST 2 -----------------
with open(os.path.join(TESTS_DIR, "practice-test-2.json"), "r") as f:
    pt2 = json.load(f)

# pt2-math-m1-q10: parabola vertex
update_item_in_test(pt2, "pt2-math-m1-q10", {
    "html": True,
    "stimulus": svg_parabola_coord(4, 3, 1, -1, 8, -1, 10, "y = (x - 4)^2 + 3"),
    "stem": "The graph of $y = (x - 4)^2 + 3$ is shown in the $xy$-plane. What are the coordinates of the vertex of the parabola?",
    "rationale": "The vertex form of a quadratic equation is $y = a(x - h)^2 + k$, where $(h, k)$ is the vertex. Here, $h = 4$ and $k = 3$, so the vertex is $(4, 3)$."
})

# pt2-math-m1-q17: circle sector area
update_item_in_test(pt2, "pt2-math-m1-q17", {
    "html": True,
    "stimulus": svg_circle_sector("r = 6", "2π/3", 120),
    "stem": "In the figure, point $O$ is the center of the circle, the radius is $6$, and central angle $AOB$ measures $\\frac{2\\pi}{3}$ radians. What is the area of the shaded sector?",
    "rationale": "The area of a sector with central angle $\\theta$ (in radians) and radius $r$ is $A = \\frac{1}{2}r^2\\theta$. Substituting $r = 6$ and $\\theta = \\frac{2\\pi}{3}$: $$A = \\frac{1}{2}(6^2)\\left(\\frac{2\\pi}{3}\\right) = \\frac{1}{2}(36)\\left(\\frac{2\\pi}{3}\\right) = 12\\pi$$"
})

# pt2-math-m1-q20: right triangle area
update_item_in_test(pt2, "pt2-math-m1-q20", {
    "html": True,
    "stimulus": svg_right_triangle("15", "8", "c"),
    "stem": "In right triangle $ABC$ shown, the legs have lengths $8$ units and $15$ units. What is the area, in square units, of triangle $ABC$?",
    "rationale": "The area of a right triangle is $\\frac{1}{2} \\times \\text{base} \\times \\text{height} = \\frac{1}{2} \\times 15 \\times 8 = 60$ square units."
})

# pt2-math-m2l-q17: similar triangles
update_item_in_test(pt2, "pt2-math-m2l-q17", {
    "html": True,
    "stimulus": svg_similar_triangles(),
    "stem": "Triangles $ABC$ and $DEF$ are shown, where triangle $ABC$ is similar to triangle $DEF$, angle $A$ corresponds to angle $D$, and angle $B$ corresponds to angle $E$. If the measure of angle $A$ is $42^\\circ$ and the measure of angle $B$ is $68^\\circ$, what is the measure, in degrees, of angle $F$?",
    "rationale": "Because the triangles are similar, corresponding angles are equal. The sum of the angles in triangle $ABC$ is $180^\\circ$, so the measure of angle $C$ is $180^\\circ - 42^\\circ - 68^\\circ = 70^\\circ$. Since angle $F$ corresponds to angle $C$, the measure of angle $F$ is $70^\\circ$."
})

# pt2-math-m2l-q21: right triangle hypotenuse (upgrade from rectangular garden 12x7)
update_item_in_test(pt2, "pt2-math-m2l-q21", {
    "html": True,
    "stimulus": svg_right_triangle("24", "AC", "25"),
    "stem": "In right triangle $ABC$ shown, the hypotenuse $\\overline{AB}$ has length $25$ units and leg $\\overline{BC}$ has length $24$ units. What is the length of leg $\\overline{AC}$?",
    "format": "spr",
    "accepted": ["7"],
    "rationale": "By the Pythagorean theorem, $AC^2 + BC^2 = AB^2$. Substituting: $AC^2 + 24^2 = 25^2 \\implies AC^2 + 576 = 625 \\implies AC^2 = 49 \\implies AC = 7$ units."
})

# pt2-math-m2u-q11: parabola vertex
update_item_in_test(pt2, "pt2-math-m2u-q11", {
    "html": True,
    "stimulus": svg_parabola_coord(4, -5, 1, -1, 9, -7, 6, "y = x^2 - 8x + c"),
    "stem": "The graph of $y = x^2 - 8x + c$ is shown in the $xy$-plane. If the vertex of the parabola has a $y$-coordinate of $-5$, what is the value of $c$?",
    "rationale": "The $x$-coordinate of the vertex of $y = ax^2 + bx + c$ is $x = -\\frac{b}{2a} = -\\frac{-8}{2(1)} = 4$. Substituting $x = 4$ and $y = -5$: $$-5 = (4)^2 - 8(4) + c \\implies -5 = 16 - 32 + c \\implies -5 = -16 + c \\implies c = 11$$"
})

# pt2-math-m2u-q20: circle arc length
update_item_in_test(pt2, "pt2-math-m2u-q20", {
    "html": True,
    "stimulus": svg_circle_sector("r", "2π/3", 120),
    "stem": "In the figure shown, the circle has center $O$, and central angle $AOB$ measures $\\frac{2\\pi}{3}$ radians. If the radius of the circle is $6$ units, what is the length of arc $AB$?",
    "format": "mc",
    "choices": [
        {"id": "A", "text": "2pi"},
        {"id": "B", "text": "4pi"},
        {"id": "C", "text": "6pi"},
        {"id": "D", "text": "12pi"}
    ],
    "correct": "B",
    "rationale": "The arc length formula is $s = r\\theta$. Substituting $r = 6$ and $\\theta = \\frac{2\\pi}{3}$ radians gives $s = 6 \\times \\frac{2\\pi}{3} = 4\\pi$."
})

pt2["updatedAt"] = "2026-10-11T01:30:00.000Z"
with open(os.path.join(TESTS_DIR, "practice-test-2.json"), "w") as f:
    json.dump(pt2, f, indent=2, ensure_ascii=False)
print("Updated Practice Test 2 with SVG diagrams.")


# ----------------- TEST 3 -----------------
with open(os.path.join(TESTS_DIR, "practice-test-3.json"), "r") as f:
    pt3 = json.load(f)

# pt3-math-m1-q17: circle sector area
update_item_in_test(pt3, "pt3-math-m1-q17", {
    "html": True,
    "stimulus": svg_circle_sector("r = 6", "π/4", 45),
    "stem": "In the circle shown, point $O$ is the center of the circle, the radius is $6$, and central angle $AOB$ measures $\\frac{\\pi}{4}$ radians. What is the area of the shaded sector?",
    "rationale": "The area of a sector is $A = \\frac{1}{2}r^2\\theta$. Substituting $r = 6$ and $\\theta = \\frac{\\pi}{4}$: $$A = \\frac{1}{2}(36)\\left(\\frac{\\pi}{4}\\right) = \\frac{9\\pi}{2}$$"
})

# pt3-math-m1-q20: parallel lines (upgrade from rectangle 12x5)
update_item_in_test(pt3, "pt3-math-m1-q20", {
    "html": True,
    "stimulus": svg_parallel_lines("(3x + 10)°", "(5x - 30)°"),
    "stem": "In the figure, line $l$ is parallel to line $m$, and line $t$ intersects both lines. What is the value of $x$?",
    "format": "spr",
    "accepted": ["20"],
    "rationale": "Since lines $l$ and $m$ are parallel, alternate interior angles are equal: $$5x - 30 = 3x + 10 \\implies 2x = 40 \\implies x = 20$$"
})

# pt3-math-m2l-q18: right triangle hypotenuse (upgrade from circle circumference k*pi)
update_item_in_test(pt3, "pt3-math-m2l-q18", {
    "html": True,
    "stimulus": svg_right_triangle("8", "6", "c"),
    "stem": "In right triangle $ABC$ shown, leg $\\overline{AC}$ has length $6$ units and leg $\\overline{BC}$ has length $8$ units. What is the length of hypotenuse $\\overline{AB}$?",
    "format": "spr",
    "accepted": ["10"],
    "rationale": "By the Pythagorean theorem, $AB = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10$ units."
})

# pt3-math-m2l-q22: triangle angle (upgrade from rectangular garden 18x11)
update_item_in_test(pt3, "pt3-math-m2l-q22", {
    "html": True,
    "stimulus": svg_triangle_angles("50°", "72°", "C"),
    "stem": "In triangle $ABC$ shown, the measure of angle $A$ is $50^\\circ$ and the measure of angle $B$ is $72^\\circ$. What is the measure, in degrees, of angle $C$?",
    "format": "spr",
    "accepted": ["58"],
    "rationale": "The interior angles of a triangle sum to $180^\\circ$. Thus, the measure of angle $C$ is $180^\\circ - 50^\\circ - 72^\\circ = 58^\\circ$."
})

# pt3-math-m2u-q16: parabola graph
update_item_in_test(pt3, "pt3-math-m2u-q16", {
    "html": True,
    "stimulus": svg_parabola_coord(3, -4, 1, -1, 7, -5, 5, "y = f(x)"),
    "stem": "The graph of the quadratic function $f(x) = a(x - h)^2 + k$ is shown in the $xy$-plane. If the vertex is at $(3, -4)$ and the graph passes through $(1, 0)$, what is the value of $a$?",
    "rationale": "Using vertex form with vertex $(3, -4)$: $f(x) = a(x - 3)^2 - 4$. Since the graph passes through $(1, 0)$, we substitute $x = 1, y = 0$: $$0 = a(1 - 3)^2 - 4 \\implies 4a = 4 \\implies a = 1$$"
})

# pt3-math-m2u-q18: circle arc length
update_item_in_test(pt3, "pt3-math-m2u-q18", {
    "html": True,
    "stimulus": svg_circle_sector("r = 12", "π/k", 60),
    "stem": "In the figure, a circle has radius $12$ units, and an arc subtends a central angle of $\\frac{\\pi}{k}$ radians. If the arc length is $4\\pi$ units, what is the value of $k$?",
    "format": "spr",
    "accepted": ["3"],
    "rationale": "Using $s = r\\theta$: $4\\pi = 12 \\times \\theta \\implies \\theta = \\frac{4\\pi}{12} = \\frac{\\pi}{3}$. Comparing $\\frac{\\pi}{3}$ with $\\frac{\\pi}{k}$, we obtain $k = 3$."
})

pt3["updatedAt"] = "2026-10-11T01:30:00.000Z"
with open(os.path.join(TESTS_DIR, "practice-test-3.json"), "w") as f:
    json.dump(pt3, f, indent=2, ensure_ascii=False)
print("Updated Practice Test 3 with SVG diagrams.")


# ----------------- TEST 4 -----------------
with open(os.path.join(TESTS_DIR, "practice-test-4.json"), "r") as f:
    pt4 = json.load(f)

# pt4-math-m1-q17: right triangle trig
update_item_in_test(pt4, "pt4-math-m1-q17", {
    "html": True,
    "stimulus": svg_right_triangle("12", "5", "13", angle_b="θ"),
    "stem": "In right triangle $ABC$ shown, the side opposite angle $\\theta$ has length $5$ units and the hypotenuse has length $13$ units. What is the value of $\\cos(\\theta)$?",
    "rationale": "By the Pythagorean theorem, the adjacent side to $\\theta$ has length $\\sqrt{13^2 - 5^2} = \\sqrt{169 - 25} = \\sqrt{144} = 12$. Therefore, $\\cos(\\theta) = \\frac{\\text{adjacent}}{\\text{hypotenuse}} = \\frac{12}{13}$."
})

# pt4-math-m1-q21: circle tangent (upgrade from garden 12x8)
update_item_in_test(pt4, "pt4-math-m1-q21", {
    "html": True,
    "stimulus": svg_tangent_circle(),
    "stem": "In the figure shown, line segment $\\overline{AB}$ is tangent to the circle with center $O$ at point $A$. If the radius of the circle is $5$ units and $OB = 13$ units, what is the length of $\\overline{AB}$?",
    "format": "spr",
    "accepted": ["12"],
    "rationale": "A tangent to a circle is perpendicular to the radius at the point of tangency, so $\\angle OAB = 90^\\circ$. Applying the Pythagorean theorem to right triangle $OAB$: $$AB = \\sqrt{OB^2 - OA^2} = \\sqrt{13^2 - 5^2} = \\sqrt{169 - 25} = \\sqrt{144} = 12$$"
})

# pt4-math-m2l-q02: line in coordinate plane
update_item_in_test(pt4, "pt4-math-m2l-q02", {
    "html": True,
    "stimulus": svg_linear_coord((0, 5), (2, 11), "Line l"),
    "stem": "The line shown in the $xy$-plane passes through the points $(0, 5)$ and $(2, 11)$. What is the $y$-intercept of the line?",
    "rationale": "The $y$-intercept is the point where the line crosses the $y$-axis ($x = 0$). As shown on the graph, the line passes through $(0, 5)$, so the $y$-intercept is $5$."
})

# pt4-math-m2l-q17: right triangle
update_item_in_test(pt4, "pt4-math-m2l-q17", {
    "html": True,
    "stimulus": svg_right_triangle("5", "12", "13", angle_b="A"),
    "stem": "In right triangle $ABC$ shown, the side opposite angle $A$ has length $12$ units, and the hypotenuse has length $13$ units. What is the value of $\\cos(A)$?",
    "rationale": "The side adjacent to angle $A$ is $\\sqrt{13^2 - 12^2} = \\sqrt{25} = 5$. Thus, $\\cos(A) = \\frac{\\text{adjacent}}{\\text{hypotenuse}} = \\frac{5}{13}$."
})

# pt4-math-m2l-q20: right triangle pythagorean triple
update_item_in_test(pt4, "pt4-math-m2l-q20", {
    "html": True,
    "stimulus": svg_right_triangle("15", "BC", "25"),
    "stem": "In right triangle $ABC$ shown, the hypotenuse $\\overline{AB}$ has length $25$ units and leg $\\overline{AC}$ has length $15$ units. What is the length of leg $\\overline{BC}$?",
    "format": "spr",
    "accepted": ["20"],
    "rationale": "By the Pythagorean theorem: $BC = \\sqrt{25^2 - 15^2} = \\sqrt{625 - 225} = \\sqrt{400} = 20$ units."
})

# pt4-math-m2u-q19: parabola minimum
update_item_in_test(pt4, "pt4-math-m2u-q19", {
    "html": True,
    "stimulus": svg_parabola_coord(2, -9, 1, -2, 6, -11, 3, "y = f(x)"),
    "stem": "The graph of $y = f(x)$ is shown in the $xy$-plane, where $f(x) = ax^2 + bx + c$. The parabola has a minimum value of $-9$ at $x = 2$ and passes through the point $(0, -5)$. What is the value of $a$?",
    "format": "spr",
    "accepted": ["1"],
    "rationale": "In vertex form, $f(x) = a(x - 2)^2 - 9$. Since the graph passes through $(0, -5)$: $$-5 = a(0 - 2)^2 - 9 \\implies -5 = 4a - 9 \\implies 4a = 4 \\implies a = 1$$"
})

# pt4-math-m2u-q20: right triangle shorter leg
update_item_in_test(pt4, "pt4-math-m2u-q20", {
    "html": True,
    "stimulus": svg_right_triangle("adjacent = 16", "opposite", "20", angle_b="A"),
    "stem": "In right triangle $ABC$ shown, acute angle $A$ has $\\cos(A) = \\frac{4}{5}$. If the hypotenuse is $20$ units, what is the length of the shorter leg?",
    "format": "spr",
    "accepted": ["12"],
    "rationale": "The adjacent leg has length $\\cos(A) \\times 20 = \\frac{4}{5} \\times 20 = 16$. By the Pythagorean theorem, the opposite leg is $\\sqrt{20^2 - 16^2} = \\sqrt{400 - 256} = \\sqrt{144} = 12$. Comparing legs $16$ and $12$, the shorter leg is $12$."
})

pt4["updatedAt"] = "2026-10-11T01:30:00.000Z"
with open(os.path.join(TESTS_DIR, "practice-test-4.json"), "w") as f:
    json.dump(pt4, f, indent=2, ensure_ascii=False)
print("Updated Practice Test 4 with SVG diagrams.")


# ----------------- TEST 5 -----------------
with open(os.path.join(TESTS_DIR, "practice-test-5.json"), "r") as f:
    pt5 = json.load(f)

# pt5-math-m1-q07: parabola intercepts
update_item_in_test(pt5, "pt5-math-m1-q07", {
    "html": True,
    "stimulus": svg_parabola_coord(5, -4, 1, 0, 10, -6, 8, "y = x^2 - 10x + 21"),
    "stem": "The graph of $y = x^2 - 10x + 21$ is shown in the $xy$-plane. The graph intersects the $x$-axis at points $(a, 0)$ and $(b, 0)$, where $a < b$. What is the value of $b - a$?",
    "rationale": "Setting $y = 0$: $x^2 - 10x + 21 = 0 \\implies (x - 3)(x - 7) = 0$. The $x$-intercepts are at $x = 3$ and $x = 7$. Since $a < b$, $a = 3$ and $b = 7$. Thus, $b - a = 7 - 3 = 4$."
})

# pt5-math-m1-q20: circle arc length
update_item_in_test(pt5, "pt5-math-m1-q20", {
    "html": True,
    "stimulus": svg_circle_sector("r = 12", "2π/3", 120),
    "stem": "In the circle shown, the radius is $12$ centimeters, and an arc subtends a central angle of $\\frac{2\\pi}{3}$ radians. If the length of the arc is $k\\pi$ centimeters, what is the value of $k$?",
    "format": "spr",
    "accepted": ["8"],
    "rationale": "Arc length is $s = r\\theta = 12 \\times \\frac{2\\pi}{3} = 8\\pi$. Therefore, $k = 8$."
})

# pt5-math-m2l-q17: right triangle trig
update_item_in_test(pt5, "pt5-math-m2l-q17", {
    "html": True,
    "stimulus": svg_right_triangle("12", "5", "13", angle_b="A"),
    "stem": "In right triangle $ABC$ shown, the side opposite angle $A$ has length $5$ units, and the hypotenuse has length $13$ units. What is the value of $\\sin(A)$?",
    "rationale": "In a right triangle, $\\sin(A) = \\frac{\\text{opposite}}{\\text{hypotenuse}} = \\frac{5}{13}$."
})

# pt5-math-m2l-q21: right triangle hypotenuse (upgrade from rectangle width 12)
update_item_in_test(pt5, "pt5-math-m2l-q21", {
    "html": True,
    "stimulus": svg_right_triangle("12", "9", "c"),
    "stem": "In right triangle $ABC$ shown, leg $\\overline{AC}$ has length $9$ units and leg $\\overline{BC}$ has length $12$ units. What is the length of hypotenuse $\\overline{AB}$?",
    "format": "spr",
    "accepted": ["15"],
    "rationale": "By the Pythagorean theorem: $AB = \\sqrt{9^2 + 12^2} = \\sqrt{81 + 144} = \\sqrt{225} = 15$ units."
})

# pt5-math-m2u-q18: circle in coordinate plane with quadrant II point
update_item_in_test(pt5, "pt5-math-m2u-q18", {
    "html": True,
    "stimulus": svg_circle_plane((0, 0), 5, (-3, 4), "x^2 + y^2 = 25", arc_theta=True),
    "stem": "In the $xy$-plane shown, a circle is centered at the origin $(0,0)$ and has radius $5$. A point $P$ on the circle in quadrant II has coordinates $(x, y)$ such that the angle formed by the positive $x$-axis and the segment $\\overline{OP}$ is $\\theta$ radians. If $\\cos(\\theta) = -\\frac{3}{5}$, what is the value of $y$?",
    "format": "spr",
    "accepted": ["4"],
    "rationale": "On a circle of radius $r = 5$, the coordinates of point $P$ are $(r\\cos(\\theta), r\\sin(\\theta))$. Using the Pythagorean identity $\\sin^2(\\theta) + \\cos^2(\\theta) = 1$: $$\\sin^2(\\theta) + \\left(-\\frac{3}{5}\\right)^2 = 1 \\implies \\sin^2(\\theta) = 1 - \\frac{9}{25} = \\frac{16}{25}$$ Since $P$ lies in quadrant II, $\\sin(\\theta) > 0$, so $\\sin(\\theta) = \\frac{4}{5}$. Thus, $y = 5 \\times \\frac{4}{5} = 4$."
})

# pt5-math-m2u-q21: circle equation & radius
update_item_in_test(pt5, "pt5-math-m2u-q21", {
    "html": True,
    "stimulus": svg_circle_plane((3, -2), 5, title="(x - 3)^2 + (y + 2)^2 = 25"),
    "stem": "The circle shown in the $xy$-plane has equation $x^2 + y^2 - 6x + 4y - 12 = 0$. What is the radius of the circle?",
    "format": "spr",
    "accepted": ["5"],
    "rationale": "Complete the square for $x$ and $y$: $$(x^2 - 6x + 9) + (y^2 + 4y + 4) = 12 + 9 + 4 \\implies (x - 3)^2 + (y + 2)^2 = 25$$ In standard form $(x - h)^2 + (y - k)^2 = r^2$, the radius is $r = \\sqrt{25} = 5$."
})

pt5["updatedAt"] = "2026-10-11T01:30:00.000Z"
with open(os.path.join(TESTS_DIR, "practice-test-5.json"), "w") as f:
    json.dump(pt5, f, indent=2, ensure_ascii=False)
print("Updated Practice Test 5 with SVG diagrams.")

print("All 5 practice tests successfully enriched with authentic Digital SAT diagrams!")
