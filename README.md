# Simulador OEE / TOC

Simulador interativo de linhas de produção baseado em **OEE** (Overall Equipment Effectiveness, padrão JIPM/TPM) e **TOC** (Theory of Constraints, Goldratt). Mostra como disponibilidade, performance, qualidade, gargalos e buffers afetam o throughput de uma linha.

> Autoria: [Pedro Portela](https://www.linkedin.com/in/pedro-ag-portela/)

## Como executar

Não há build step. Abrir `index.html` num browser moderno (Chrome, Firefox, Edge, Safari).

```bash
# servir localmente (opcional — permite carregar planta baixa via file://)
python3 -m http.server 8000
# depois abrir http://localhost:8000
```

## Estrutura do repositório

```
├── index.html      # Estrutura HTML (topbar, board linear, modais, mapa)
├── styles.css      # Folha de estilos (~410 linhas, organizada por bloco)
├── app.js          # Engine de simulação + UI (~3000 linhas)
└── README.md
```

## Funcionalidades

### Linha de produção (vista linear)
- Até **99 estações** configuráveis (PPM, A%, P%, Q%, setup, tamanho de lote, MTBF/MTTR, curva de aprendizagem, rework loop).
- **Buffers (ESTEIRAS)** entre estações: capacidade, peças iniciais e *dwell-time* (cura/quarentena).
- **Estoque** e **meta de produção** com modo **∞** (corre indefinidamente).
- Modos de simulação: *make-to-good*, *esgotar linha*, *manter parâmetros* no reset.

### Vista MAPA (grafo)
- Topologia em grafo (`SOURCE → STATION → BUFFER → SINK`), com bifurcações e junções via *shortest-queue*.
- **Drag** de nós, **conectar**/**apagar** edges, **dividir** estação em paralelas.
- Painel direito espelha o card linear: editar parâmetros tem o mesmo efeito.
- **Auto-layout** topológico (BFS por rank), **auto-fit**, pan/zoom.
- **Minimap** sincronizado e clicável.
- **Planta baixa** (upload de imagem como fundo, opacidade ajustável).
- Estilo de seta **Bezier** ou **L** ortogonal.
- Badges de estado: GARGALO / PARADA / TRAVADA / SETUP / AGUARDANDO / OPERANDO / OFF.

### Análise
Modal **ANÁLISE** com 4 vistas:
- **Yamazumi** — tempo de ciclo decomposto por estado, com linha de Takt.
- **Pareto** de perdas (Disponibilidade, Performance, Qualidade, Travada, etc.).
- **Heatmap** temporal — estado de cada estação ao longo do tempo.
- **Sankey** — fluxo de peças entre estações + refugos.

### Dados & Reprodutibilidade
- Export **CSV** (KPIs por estação) e **JSON** (snapshot completo).
- **Save/Load** de configurações (ficheiro ou localStorage).
- **Seed determinística** (PRNG mulberry32) para reprodutibilidade da simulação.
- Estimativa **P50/P90** com MTBF ativo.

### Cenários didáticos
Catálogo de presets: linha balanceada, gargalo central, starving em cascata, refugo concentrado, lotes vs SMED, curva de aprendizagem, linha com paralelo.

### Comparador
Compara dois snapshots JSON lado a lado com delta percentual por métrica.

## Glossário

| Termo | Significado |
|---|---|
| **OEE** | Overall Equipment Effectiveness = A × P × Q |
| **PPM** | Peças por minuto |
| **PPH** | Peças por hora (= PPM × 60) |
| **WIP / ESTEIRA** | Work in Progress — estoque intermediário entre estações |
| **TOC** | Theory of Constraints (Teoria das Restrições) |
| **Gargalo** | Recurso que limita a capacidade total do sistema |
| **Takt** | Ritmo necessário para atingir a meta no tempo planeado |
| **MTBF / MTTR** | Mean Time Between Failures / Mean Time To Repair |
| **Dwell** | Tempo de cura/quarentena obrigatório num buffer |
| **Setup** | Tempo de preparação/troca de ferramenta |
</content>
</invoke>