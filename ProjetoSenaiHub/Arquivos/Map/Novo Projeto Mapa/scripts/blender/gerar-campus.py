# Gera os modelos 3D do campus a partir de dados/salas-geo.json (extrair-geometria.mjs).
#   - paredes extrudadas por pavimento, piso de cada sala como objeto próprio (material pelo tipo),
#     circulação, implantação (pátio, E1, E2 elevado, rampa, escada, grades e portão);
#   - exporta saida/blender/glb/BlocoA..D.glb, Externo.glb e Campus.glb na escala e eixos dos GLB do site
#     (decímetros, Y para cima) e renders de conferência em saida/blender/.
# Uso: blender -b -P gerar-campus.py -- [pasta do Novo Projeto Mapa] [--sem-render] [--blend]
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ROOT = next((a for a in ARGS if not a.startswith("--")), os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
SEM_RENDER = "--sem-render" in ARGS
SALVA_BLEND = "--blend" in ARGS

S = 10.0  # metros -> decímetros (unidade dos GLB do site)
LAJE_M = 0.12
GLB_SITE = os.path.normpath(os.path.join(ROOT, "..", "..", "..", "Senai HUB", "frontend", "public", "models", "campus"))
SAIDA = os.path.join(ROOT, "saida", "blender")
os.makedirs(os.path.join(SAIDA, "glb"), exist_ok=True)

geo = json.load(open(os.path.join(ROOT, "dados", "salas-geo.json"), encoding="utf-8"))
cfg = json.load(open(os.path.join(ROOT, "config", "salas-config.json"), encoding="utf-8"))
TIPOS = cfg["tipos"]


def hex_rgba(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0)


_mats = {}


def material(nome, cor, rough=0.8, metal=0.0):
    if nome in _mats:
        return _mats[nome]
    m = bpy.data.materials.new(nome)
    rgba = hex_rgba(cor)
    m.diffuse_color = rgba
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    _mats[nome] = m
    return m


MAT_PAREDE = material("Parede", "#E4E7EB")
MAT_CIRC = material("Piso circulação", TIPOS["circ"][1])
MAT_PATIO = material("Pátio", "#E9E1CC")
MAT_ASFALTO = material("Estacionamento", "#7A7F87")
MAT_RAMPA = material("Rampa", "#CDBF9E")
MAT_ESCADA = material("Escada externa", "#B9BEC6")
MAT_GRADE = material("Grade", "#3A3550", rough=0.4, metal=0.6)
MAT_PORTAO = material("Portão", "#8A8F98", rough=0.4, metal=0.6)


def mat_tipo(tipo):
    rot, fundo, _borda = TIPOS.get(tipo, TIPOS["apoio"])
    return material("Piso " + rot, fundo)


def colecao(nome):
    c = bpy.data.collections.get(nome)
    if not c:
        c = bpy.data.collections.new(nome)
        bpy.context.scene.collection.children.link(c)
    return c


def bpt(x, z):
    return (x * S, -z * S)


def prisma(nome, loops, z0, z1, mat, col, props=None):
    """Extruda loops [[x, z], ...] (preenchimento par/ímpar, então buracos funcionam) de z0 a z1 (metros)."""
    cu = bpy.data.curves.new(nome, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = (z1 - z0) * S / 2
    for pts in loops:
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, (x, z) in zip(sp.points, pts):
            p.co = (*bpt(x, z), 0.0, 1.0)
        sp.use_cyclic_u = True
    tmp = bpy.data.objects.new(nome + "_tmp", cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.translate(bm, vec=Vector((0, 0, (z0 + z1) / 2 * S)), verts=bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.shade_flat()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    col.objects.link(ob)
    for k, v in (props or {}).items():
        ob[k] = v
    return ob


def caixas(nome, boxes, mat, col):
    """boxes = [(cx, cy, cz, sx, sy, sz)] em coordenadas Blender (já em decímetros)."""
    bm = bmesh.new()
    for cx, cy, cz, sx, sy, sz in boxes:
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r["verts"]:
            v.co = Vector((cx + v.co.x * sx, cy + v.co.y * sy, cz + v.co.z * sz))
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    col.objects.link(ob)
    return ob


def aplica_modificadores(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    me.name = ob.name


def subtrai(ob, cortadores):
    for c in cortadores:
        mod = ob.modifiers.new("corte", "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.solver = "EXACT"
        mod.object = c
    aplica_modificadores(ob)
    for c in cortadores:
        bpy.data.objects.remove(c)


# ---------------------------------------------------------------- limpa a cena
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)

# ---------------------------------------------------------------- blocos
ROTULO_NIVEL = {0: "térreo", 2: "superior"}
for pg in geo["paginas"]:
    b, n = pg["bloco"], pg["nivel"]
    col = colecao(f"Bloco {b}")
    piso, h = pg["piso_m"], pg["alturaParede_m"]
    pref = f"{b}{n}"
    base = {"bloco": b, "nivel": n, "pagina": pg["pagina"], "piso_m": piso}
    prisma(f"{pref} — Paredes", [l["pts"] for l in pg["paredes"]], piso - LAJE_M, piso + h, MAT_PAREDE, col, {**base, "tipo": "parede"})
    if pg["circulacao"]:
        prisma(f"{pref} — Circulação", [l["pts"] for l in pg["circulacao"]], piso - LAJE_M, piso, MAT_CIRC, col, {**base, "tipo": "circ"})
    grupos = {}
    for s in pg["salas"]:
        nome = s["nome"] or TIPOS.get(s["tipo"], ["Sala"])[0]
        g = grupos.setdefault((nome, s["tipo"]), {"loops": [], "area": 0.0})
        g["loops"] += [l["pts"] for l in s["loops"]]
        g["area"] += s["area_m2"]
    for (nome, tipo), g in grupos.items():
        mat = MAT_CIRC if tipo == "circ" else mat_tipo(tipo)
        prisma(f"{pref} — {nome}", g["loops"], piso - LAJE_M, piso, mat, col,
               {**base, "tipo": tipo, "nome": nome, "area_m2": round(g["area"], 1), "pavimento": ROTULO_NIVEL.get(n, str(n))})

# ---------------------------------------------------------------- implantação
imp = geo["implantacao"]
col = colecao("Externo")
P = imp.get("alturaPatio_m", 2.5)
areas = {a["nome"]: a for a in imp["areas"]}


def rect_loop(x0, z0, x1, z1):
    return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]


def cortador(x0, z0, x1, z1, h0, h1, folga=0.02):
    return prisma("_corte", [rect_loop(x0 - folga, z0 - folga, x1 + folga, z1 + folga)], h0, h1, MAT_PATIO, col)


rampas = [a for a in imp["areas"] if a["tipo"] == "rampa"]
for a in imp["areas"]:
    alt = P + a.get("altura_m", 0.0)
    if a["tipo"] == "circulacao":
        ob = prisma(a["nome"], [a["poly"]], P - 0.2, P, MAT_PATIO, col, {"tipo": "circulacao externa"})
        cortes = []
        for r in rampas:
            xs, zs = [p[0] for p in r["poly"]], [p[1] for p in r["poly"]]
            cortes.append(cortador(min(xs), min(zs), max(xs), max(zs), P - 1, P + 1))
        if cortes:
            subtrai(ob, cortes)
    elif a["tipo"] == "estacionamento":
        ob = prisma(a["nome"], [a["poly"]], P - 0.2, alt, MAT_ASFALTO, col, {"tipo": "estacionamento", "altura_m": a.get("altura_m", 0.0)})
        cortes = []
        for e in imp.get("escadas", []):
            if e.get("ate") == a["nome"]:
                x0, z0, x1, z1 = e["rect"]
                cortes.append(cortador(x0, z0, x1, z1, P, alt + 1, folga=0.0))
        if cortes:
            subtrai(ob, cortes)

for r in rampas:
    xs, zs = [p[0] for p in r["poly"]], [p[1] for p in r["poly"]]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    eixo_z = (z1 - z0) >= (x1 - x0)
    comp = (z1 - z0) if eixo_z else (x1 - x0)
    queda = comp * r.get("inclinacao", 0.08)
    lado = r.get("ladoAlto", "-z")
    bm = bmesh.new()
    vs = {}
    for (x, z) in [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]:
        t = ((z - z0) if eixo_z else (x - x0)) / comp
        if lado.startswith("+"):
            t = 1 - t
        topo = P - queda * t
        vs[(x, z)] = (bm.verts.new((*bpt(x, z), topo * S)), bm.verts.new((*bpt(x, z), (P - queda - 0.2) * S)))
    cant = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    bm.faces.new([vs[c][0] for c in cant])
    bm.faces.new([vs[c][1] for c in reversed(cant)])
    for i in range(4):
        a, c = cant[i], cant[(i + 1) % 4]
        bm.faces.new([vs[a][0], vs[a][1], vs[c][1], vs[c][0]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(r["nome"])
    bm.to_mesh(me)
    bm.free()
    me.materials.append(MAT_RAMPA)
    ob = bpy.data.objects.new(r["nome"], me)
    col.objects.link(ob)
    ob["tipo"] = "rampa"
    ob["inclinacao"] = r.get("inclinacao", 0.08)

for e in imp.get("escadas", []):
    x0, z0, x1, z1 = e["rect"]
    topo = P + areas.get(e.get("ate"), {}).get("altura_m", 1.0)
    n = e.get("degraus", 3)
    sobe_x = e.get("sobePara", "+x").endswith("x")
    inverso = e.get("sobePara", "+x").startswith("-")
    comp = (x1 - x0) if sobe_x else (z1 - z0)
    passo, espelho = comp / (n + 1), (topo - P) / (n + 1)
    boxes = []
    for i in range(n + 1):
        k = (n - i) if inverso else i
        h1 = P + espelho * (i + 1) if i < n else topo
        a0, a1 = k * passo, (k + 1) * passo
        if sobe_x:
            bx0, bx1, bz0, bz1 = x0 + a0, x0 + a1, z0, z1
        else:
            bx0, bx1, bz0, bz1 = x0, x1, z0 + a0, z0 + a1
        cx, cy = bpt((bx0 + bx1) / 2, (bz0 + bz1) / 2)
        boxes.append((cx, cy, (P - 0.2 + h1) / 2 * S, (bx1 - bx0) * S, (bz1 - bz0) * S, (h1 - P + 0.2) * S))
    ob = caixas(e["nome"], boxes, MAT_ESCADA, col)
    ob["tipo"] = "escada externa"


def cerca(nome, pts, altura, mat, vao, base):
    boxes = []
    for (xa, za), (xb, zb) in zip(pts, pts[1:]):
        L = math.hypot(xb - xa, zb - za)
        ang = math.atan2(-(zb - za), xb - xa)
        ux, uy = math.cos(ang), math.sin(ang)

        def ao_longo(t):
            return (xa * S + ux * t * S, -za * S + uy * t * S)

        for z_trilho in (0.1, altura - 0.05):
            cx, cy = ao_longo(L / 2)
            boxes.append(("rot", cx, cy, (base + z_trilho) * S, L * S, 0.05 * S, 0.05 * S, ang))
        nb = max(1, int(L / vao))
        for i in range(nb + 1):
            t = L * i / nb
            cx, cy = ao_longo(t)
            poste = i % max(1, int(2.5 / vao)) == 0 or i == nb
            lado = 0.08 if poste else 0.025
            boxes.append(("rot", cx, cy, (base + altura / 2) * S, lado * S, lado * S, altura * S, ang))
    bm = bmesh.new()
    for _, cx, cy, cz, sx, sy, sz, ang in boxes:
        r = bmesh.ops.create_cube(bm, size=1.0)
        ca, sa = math.cos(ang), math.sin(ang)
        for v in r["verts"]:
            lx, ly, lz = v.co.x * sx, v.co.y * sy, v.co.z * sz
            v.co = Vector((cx + lx * ca - ly * sa, cy + lx * sa + ly * ca, cz + lz))
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    col.objects.link(ob)
    return ob


for i, ln in enumerate(imp.get("linhas", [])):
    if ln["tipo"] == "grade":
        ob = cerca(f"Grade {i + 1}", ln["pts"], ln.get("altura_m", 1.8), MAT_GRADE, 0.15, P)
        ob["tipo"] = "grade"
    elif ln["tipo"] == "portao":
        ob = cerca(ln.get("nome", "Portão"), ln["pts"], ln.get("altura_m", 1.8), MAT_PORTAO, 0.1, P)
        ob["tipo"] = "portao"

# ---------------------------------------------------------------- relatório e exportação
def stats(cols):
    obs = [o for c in cols for o in c.objects if o.type == "MESH"]
    return len(obs), sum(len(o.data.vertices) for o in obs), sum(len(o.data.polygons) for o in obs)


def exporta(arquivo, cols):
    bpy.ops.object.select_all(action="DESELECT")
    for c in cols:
        for o in c.objects:
            o.select_set(True)
    caminho = os.path.join(SAIDA, "glb", arquivo)
    bpy.ops.export_scene.gltf(filepath=caminho, export_format="GLB", use_selection=True, export_extras=True,
                              export_apply=True, export_yup=True)
    n, v, f = stats(cols)
    print(f"{arquivo}: {n} objetos, {v} vértices, {f} faces, {os.path.getsize(caminho) / 1024:.0f} KB")


blocos = sorted(c.name.split()[-1] for c in bpy.data.collections if c.name.startswith("Bloco "))
for b in blocos:
    exporta(f"Bloco{b}.glb", [bpy.data.collections[f"Bloco {b}"]])
exporta("Externo.glb", [bpy.data.collections["Externo"]])
exporta("Campus.glb", [bpy.data.collections[f"Bloco {b}"] for b in blocos] + [bpy.data.collections["Externo"]])

# ---------------------------------------------------------------- renders de conferência
def caixa(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == "MESH" for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def prepara_render():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.view_settings.view_transform = "Standard"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.show_cavity = True
    sc.display.shading.show_shadows = True
    sc.display.shading.show_object_outline = False
    sc.render.film_transparent = False
    sc.world = sc.world or bpy.data.worlds.new("Mundo")
    sc.world.color = (0.9, 0.92, 0.95)
    sc.render.image_settings.file_format = "PNG"
    cam = bpy.data.objects.get("Camera") or bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    sc.camera = cam
    return sc, cam


def mostra_so(cols):
    nomes = {c.name for c in cols}
    for c in bpy.data.collections:
        c.hide_render = c.name not in nomes


def render_topo(arquivo, cols, largura=1800, ref=None):
    sc, cam = prepara_render()
    sc.display.shading.light = "FLAT"
    sc.display.shading.show_shadows = False
    mostra_so(cols)
    lo, hi = ref or caixa([o for c in cols for o in c.objects])
    centro, tam = (lo + hi) / 2, hi - lo
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = max(tam.x, tam.y) * 1.05
    cam.data.clip_end = 10000
    cam.location = (centro.x, centro.y, hi.z + 500)
    cam.rotation_euler = (0, 0, 0)
    sc.render.resolution_x = largura if tam.x >= tam.y else int(largura * tam.x / tam.y)
    sc.render.resolution_y = largura if tam.y > tam.x else int(largura * tam.y / tam.x)
    sc.render.filepath = os.path.join(SAIDA, arquivo)
    bpy.ops.render.render(write_still=True)
    print("render", arquivo)


def render_perspectiva(arquivo, cols, direcao=(1.0, -1.2, 0.9), largura=1600, altura=1000):
    sc, cam = prepara_render()
    mostra_so(cols)
    lo, hi = caixa([o for c in cols for o in c.objects])
    centro, raio = (lo + hi) / 2, (hi - lo).length / 2
    cam.data.type = "PERSP"
    cam.data.lens = 35
    cam.data.clip_end = 20000
    d = Vector(direcao).normalized()
    cam.location = centro + d * raio * 2.1
    cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.resolution_x, sc.render.resolution_y = largura, altura
    sc.render.filepath = os.path.join(SAIDA, arquivo)
    bpy.ops.render.render(write_still=True)
    print("render", arquivo)


def compara_topo(novo, orig, saida):
    """Modelo novo por baixo; contorno do GLB atual do site em vermelho por cima."""
    import numpy as np
    a = bpy.data.images.load(novo)
    b = bpy.data.images.load(orig)
    w, h = a.size
    pa = np.array(a.pixels[:]).reshape(h, w, 4)
    pb = np.array(b.pixels[:]).reshape(h, w, 4)
    fundo = pb[0, 0, :3]
    ocupado = np.abs(pb[..., :3] - fundo).sum(axis=2) > 0.02
    borda = ocupado ^ (np.roll(ocupado, 1, 0) & np.roll(ocupado, -1, 0) & np.roll(ocupado, 1, 1) & np.roll(ocupado, -1, 1))
    borda = borda | np.roll(borda, 1, 0) | np.roll(borda, 1, 1)
    out = pa.copy()
    out[ocupado & ~borda, :3] = out[ocupado & ~borda, :3] * 0.8 + np.array([0.9, 0.2, 0.2]) * 0.2
    out[borda, :3] = (0.85, 0.05, 0.05)
    a.pixels[:] = out.ravel()
    a.filepath_raw = saida
    a.file_format = "PNG"
    a.save()
    for im in (a, b):
        bpy.data.images.remove(im)
    for f in (novo, orig):
        os.remove(f)
    print("render", os.path.basename(saida))


if not SEM_RENDER:
    todos = [bpy.data.collections[f"Bloco {b}"] for b in blocos] + [bpy.data.collections["Externo"]]
    render_topo("campus-topo.png", todos)
    render_perspectiva("campus-perspectiva.png", todos)
    for b in blocos:
        render_perspectiva(f"Bloco{b}.png", [bpy.data.collections[f"Bloco {b}"]])
    if os.path.isdir(GLB_SITE):
        orig = colecao("Originais do site")
        for b in blocos:
            f = os.path.join(GLB_SITE, f"Bloco{b}.glb")
            if not os.path.exists(f):
                continue
            antes = set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=f)
            for o in set(bpy.data.objects) - antes:
                for c in o.users_collection:
                    c.objects.unlink(o)
                orig.objects.link(o)
        render_topo("originais-topo.png", [orig])
        render_perspectiva("originais-perspectiva.png", [orig])
        lo1, hi1 = caixa([o for c in todos for o in c.objects])
        lo2, hi2 = caixa(list(orig.objects))
        ref = (Vector(map(min, lo1, lo2)), Vector(map(max, hi1, hi2)))
        render_topo("_novo.png", todos, ref=ref)
        render_topo("_orig.png", [orig], ref=ref)
        compara_topo(os.path.join(SAIDA, "_novo.png"), os.path.join(SAIDA, "_orig.png"), os.path.join(SAIDA, "comparacao-topo.png"))
        bpy.data.collections.remove(orig)

if SALVA_BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SAIDA, "Campus.blend"))
