export const pageSections = [
  { id: "topo", label: "Topo", navLabel: null },
  { id: "intro", label: "Projeto", navLabel: "Projeto" },
  { id: "modulos", label: "Módulos", navLabel: "Módulos" },
  { id: "mapa", label: "Mapa 3D", navLabel: "Mapa 3D" },
  { id: "recursos", label: "Recursos", navLabel: "Recursos" },
  { id: "stack", label: "Stack", navLabel: "Stack" },
  { id: "equipe", label: "Equipe", navLabel: "Equipe" },
  { id: "cta", label: "Links", navLabel: null },
] as const

export type PageSectionId = (typeof pageSections)[number]["id"]

export const darkSections: PageSectionId[] = ["mapa", "cta"]
