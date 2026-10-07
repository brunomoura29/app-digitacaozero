<template>
  <div ref="alvo" class="w-full cursor-pointer" :style="{ height: altura + 'px' }" role="img" :aria-label="descricao" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TipoBloco } from '#shared/utils/relatorios'
import { formatarMedida, OUTROS, type ResultadoGrafico } from '~/utils/relatorioCalculo'

const props = defineProps<{
  tipo: TipoBloco
  resultado: ResultadoGrafico
  /** Séries vindas de um 2º agrupamento são partes do todo: empilham. Várias medidas ficam lado a lado. */
  empilhado?: boolean
  /** Categorias marcadas no filtro cruzado — as outras ficam esmaecidas. */
  selecionados?: string[]
  descricao?: string
  /** Cor do bloco (hex). Só pinta gráfico de UMA série — com várias, vale a paleta, que mantém as séries distinguíveis. */
  cor?: string | null
  /** Linha/área em curva suave, sem os pontos marcados (eles aparecem ao passar o mouse). */
  suave?: boolean
  /** Escreve o valor em cada barra, ponto ou fatia. */
  rotulos?: boolean
}>()

const emit = defineEmits<{ selecionar: [valor: string] }>()

const alvo = ref<HTMLElement | null>(null)
const colorMode = useColorMode()
let grafico: any = null
let observador: ResizeObserver | null = null

const horizontal = computed(() => props.tipo === 'barras')
const altura = computed(() => {
  if (horizontal.value) return Math.max(220, props.resultado.categorias.length * 30 + 56)
  return 280
})

function montarOpcao() {
  const escuro = colorMode.value === 'dark'
  const paleta = escuro ? CORES_SERIES.escuro : CORES_SERIES.claro
  const cores = props.cor && props.tipo !== 'rosca' && props.resultado.series.length === 1 ? [props.cor] : paleta
  const tinta = corDoToken('--s3-text')
  const tintaSecundaria = corDoToken('--s3-text-secondary')
  const tintaApagada = corDoToken('--s3-text-muted')
  const fio = corDoToken('--s3-border', escuro ? 0.7 : 1)
  const superficie = corDoToken('--s3-card')
  const fonte = '"Plus Jakarta Sans", sans-serif'

  const { categorias, series } = props.resultado
  const marcados = props.selecionados ?? []
  const opacidade = (i: number) => (marcados.length && !marcados.includes(categorias[i]!.valor) ? 0.28 : 1)
  const medida = series[0]?.medida
  const variasSeries = series.length > 1

  const dica = {
    appendToBody: true,
    backgroundColor: superficie,
    borderColor: fio,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: tinta, fontFamily: fonte, fontSize: 12 },
    extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);'
  }
  const linhaDica = (marca: string, nome: string, valor: string) =>
    `<div style="display:flex;align-items:center;gap:8px;justify-content:space-between;min-width:140px">` +
    `<span>${marca}<span style="color:${tintaSecundaria}">${nome}</span></span><b>${valor}</b></div>`
  const legenda = {
    show: variasSeries || props.tipo === 'rosca',
    type: 'scroll',
    bottom: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 14,
    textStyle: { color: tintaSecundaria, fontFamily: fonte, fontSize: 12 },
    pageTextStyle: { color: tintaApagada },
    pageIconColor: tintaSecundaria,
    pageIconInactiveColor: fio
  }

  if (props.tipo === 'rosca') {
    const valores = series[0]?.valores ?? []
    const total = valores.reduce<number>((a, v) => a + (v ?? 0), 0)
    return {
      color: cores,
      textStyle: { fontFamily: fonte },
      tooltip: {
        ...dica,
        trigger: 'item',
        formatter: (p: any) =>
          linhaDica(p.marker, p.name, formatarMedida(p.value, medida!)) +
          `<div style="color:${tintaApagada};margin-top:2px">${total ? ((p.value / total) * 100).toFixed(1).replace('.', ',') : 0}% do total</div>`
      },
      legend: legenda,
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '36%',
          style: { text: formatarMedida(total, medida!, true), fill: tinta, font: `600 20px ${fonte}`, textAlign: 'center' }
        },
        { type: 'text', left: 'center', top: '47%', style: { text: 'Total', fill: tintaApagada, font: `12px ${fonte}` } }
      ],
      series: [
        {
          type: 'pie',
          radius: ['56%', '80%'],
          center: ['50%', '43%'],
          padAngle: 2,
          itemStyle: { borderRadius: 4 },
          label: props.rotulos
            ? {
                show: true,
                color: tintaSecundaria,
                fontFamily: fonte,
                fontSize: 11,
                formatter: (p: any) => formatarMedida(p.value, medida!, true)
              }
            : { show: false },
          labelLine: { lineStyle: { color: fio } },
          emphasis: { scale: true, scaleSize: 5 },
          data: categorias.map((c, i) => ({
            name: c.rotulo,
            value: valores[i] ?? 0,
            itemStyle: { opacity: opacidade(i) }
          }))
        }
      ]
    }
  }

  const deLinha = props.tipo === 'linha' || props.tipo === 'area'
  const eixoCategorias = {
    type: 'category',
    data: categorias.map((c) => c.rotulo),
    boundaryGap: !deLinha,
    inverse: horizontal.value,
    axisTick: { show: false },
    axisLine: { show: !horizontal.value, lineStyle: { color: fio } },
    axisLabel: {
      color: tintaSecundaria,
      fontFamily: fonte,
      fontSize: 11,
      hideOverlap: true,
      ...(horizontal.value ? { width: 130, overflow: 'truncate' } : {})
    }
  }
  const eixoValores = {
    type: 'value',
    splitNumber: 4,
    axisLabel: {
      color: tintaApagada,
      fontFamily: fonte,
      fontSize: 11,
      formatter: (v: number) => (medida ? formatarMedida(v, medida, true) : String(v))
    },
    splitLine: { lineStyle: { color: fio, type: horizontal.value ? 'solid' : 'dashed' } }
  }

  return {
    color: cores,
    textStyle: { fontFamily: fonte },
    animationDuration: 500,
    animationDurationUpdate: 350,
    grid: { left: 8, right: horizontal.value ? 56 : 12, top: props.rotulos ? 26 : 16, bottom: variasSeries ? 36 : 8, containLabel: true },
    tooltip: {
      ...dica,
      trigger: 'axis',
      axisPointer: deLinha
        ? { type: 'line', lineStyle: { color: tintaApagada, width: 1 } }
        : { type: 'shadow', shadowStyle: { color: corDoToken('--s3-text', 0.06) } },
      formatter: (itens: any[]) =>
        `<div style="font-weight:600;margin-bottom:4px">${itens[0]?.axisValueLabel ?? ''}</div>` +
        itens
          .filter((p) => p.value != null)
          .map((p) => linhaDica(p.marker, p.seriesName, formatarMedida(p.value, series[p.seriesIndex]!.medida)))
          .join('')
    },
    legend: legenda,
    xAxis: horizontal.value ? eixoValores : eixoCategorias,
    yAxis: horizontal.value ? eixoCategorias : eixoValores,
    series: series.map((s, indice) => {
      const rotulo = {
        show: true,
        color: tintaSecundaria,
        fontFamily: fonte,
        fontSize: 11,
        formatter: (p: any) => (p.value == null ? '' : formatarMedida(p.value, s.medida, true))
      }
      if (deLinha) {
        const corDaSerie = cores[indice % cores.length]!
        return {
          type: 'line',
          name: s.nome,
          data: s.valores,
          // curva que não passa do ponto: o suavizado comum inventa "barrigas" acima/abaixo do valor real
          smooth: props.suave ? 0.4 : false,
          smoothMonotone: props.suave ? 'x' : undefined,
          lineStyle: { width: props.suave ? 2.5 : 2, cap: 'round', join: 'round' },
          symbol: 'circle',
          symbolSize: 8,
          showSymbol: props.rotulos || (!props.suave && categorias.length <= 24),
          itemStyle: { borderColor: superficie, borderWidth: 2 },
          label: props.rotulos ? { ...rotulo, position: 'top' } : { show: false },
          labelLayout: { hideOverlap: true },
          // na curva suave de uma série só, um degradê discreto embaixo dá o acabamento
          areaStyle:
            props.tipo === 'area' || (props.suave && !variasSeries)
              ? {
                  opacity: 1,
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: comAlfa(corDaSerie, props.tipo === 'area' ? 0.3 : 0.22) },
                      { offset: 1, color: comAlfa(corDaSerie, 0) }
                    ]
                  }
                }
              : undefined,
          emphasis: { focus: variasSeries ? 'series' : 'none' }
        }
      }
      const empilha = props.empilhado && variasSeries
      return {
        type: 'bar',
        name: s.nome,
        stack: empilha ? 'total' : undefined,
        barMaxWidth: 26,
        barGap: '12%',
        // 2px da cor do fundo separam segmentos empilhados e barras vizinhas
        itemStyle: empilha
          ? { borderColor: superficie, borderWidth: 1, borderRadius: 2 }
          : { borderRadius: horizontal.value ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        // ranking horizontal de uma série já vem com o valor na ponta da barra
        label:
          (horizontal.value && !variasSeries) || (props.rotulos && !empilha)
            ? { ...rotulo, position: horizontal.value ? 'right' : 'top' }
            : { show: false },
        labelLayout: { hideOverlap: true },
        emphasis: { focus: variasSeries ? 'series' : 'none' },
        data: s.valores.map((v, i) => ({ value: v, itemStyle: { opacity: opacidade(i) } }))
      }
    })
  }
}

/** "#rrggbb" → rgba com transparência (pro degradê da área). */
function comAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`
}

function desenhar() {
  if (!grafico) return
  grafico.setOption(montarOpcao(), { notMerge: true })
}

/** Clique em qualquer ponto da faixa da categoria (não só em cima da barra) marca o filtro. */
function aoClicarNaArea(ev: { offsetX: number; offsetY: number }) {
  if (!grafico || props.tipo === 'rosca') return
  const ponto = [ev.offsetX, ev.offsetY]
  if (!grafico.containPixel({ gridIndex: 0 }, ponto)) return
  const coordenada = grafico.convertFromPixel({ gridIndex: 0 }, ponto)
  const indice = Math.round(horizontal.value ? coordenada[1] : coordenada[0])
  const categoria = props.resultado.categorias[indice]
  if (categoria) emit('selecionar', categoria.valor)
}

onMounted(async () => {
  const echarts = await carregarEcharts()
  if (!alvo.value) return
  grafico = echarts.init(alvo.value)
  grafico.getZr().on('click', aoClicarNaArea)
  grafico.on('click', (p: any) => {
    if (props.tipo !== 'rosca') return
    const categoria = props.resultado.categorias[p.dataIndex]
    if (categoria && categoria.valor !== OUTROS) emit('selecionar', categoria.valor)
  })
  desenhar()
  observador = new ResizeObserver(() => grafico?.resize())
  observador.observe(alvo.value)
})

watch(() => [props.resultado, props.tipo, props.empilhado, props.selecionados, props.cor, props.suave, props.rotulos, colorMode.value], () => requestAnimationFrame(desenhar), { deep: true })
// (um quadro depois: a troca de tema precisa já ter chegado às variáveis de cor do <html>)
// a altura das barras horizontais acompanha a quantidade de categorias
watch(altura, () => requestAnimationFrame(() => grafico?.resize()))

onBeforeUnmount(() => {
  observador?.disconnect()
  grafico?.dispose()
  grafico = null
})
</script>
