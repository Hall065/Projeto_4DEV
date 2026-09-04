export type CampusBlockId = "A" | "B" | "C" | "D"

export const CAMPUS_BLOCKS = [
  {
    id: "A" as const,
    name: "Bloco A",
    modelFile: "/models/campus/BlocoA.glb",
    accent: "#00A9E0",
    blurb: "Ensino e salas — referência espacial para localização.",
  },
  {
    id: "B" as const,
    name: "Bloco B",
    modelFile: "/models/campus/BlocoB.glb",
    accent: "#3DBE4A",
    blurb: "Secretaria e atendimento — ponto de apoio operacional.",
  },
  {
    id: "C" as const,
    name: "Bloco C",
    modelFile: "/models/campus/BlocoC.glb",
    accent: "#F7941D",
    blurb: "Laboratórios e oficinas — onde a manutenção aparece no Grid.",
  },
  {
    id: "D" as const,
    name: "Bloco D",
    modelFile: "/models/campus/BlocoD.glb",
    accent: "#7B4FC7",
    blurb: "Áreas complementares do campus no mesmo mapa unificado.",
  },
]

export const MAP_HIGHLIGHTS = [
  "Campus completo em GLB (Blocos A–D)",
  "OrbitControls — rotação, zoom e pan",
  "Seleção de bloco com destaque visual",
  "Usado no Connect (localização) e no Grid (mapa de tarefas)",
]
