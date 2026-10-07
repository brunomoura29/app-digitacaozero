/**
 * ECharts carregado sob demanda e só com o que os relatórios usam (barras, linhas, rosca) —
 * a biblioteca inteira é pesada e só interessa a quem abre um relatório. Só no navegador.
 */
let carregando: Promise<typeof import('echarts/core')> | null = null

export function carregarEcharts() {
  carregando ??= (async () => {
    const [core, graficos, componentes, renderizadores] = await Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers')
    ])
    core.use([
      graficos.BarChart,
      graficos.LineChart,
      graficos.PieChart,
      componentes.GridComponent,
      componentes.TooltipComponent,
      componentes.LegendComponent,
      componentes.GraphicComponent,
      renderizadores.CanvasRenderer
    ])
    return core
  })()
  return carregando
}

/**
 * Cores das séries, na ordem — a ordem é o que mantém vizinhos distinguíveis pra daltônicos
 * (conferido com o validador da skill dataviz nas superfícies claro #FFFFFF e escuro #1E242B).
 * Uma série nova nunca ganha cor inventada: passou de 8, vira "Outros".
 */
export const CORES_SERIES = {
  claro: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  escuro: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
}

/** Lê um token `--s3-*` (canais "r g b") como cor que o canvas entende. */
export function corDoToken(nome: string, alfa = 1): string {
  const canais = getComputedStyle(document.documentElement).getPropertyValue(nome).trim().split(/\s+/).join(', ')
  return alfa === 1 ? `rgb(${canais})` : `rgba(${canais}, ${alfa})`
}
