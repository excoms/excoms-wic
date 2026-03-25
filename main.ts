import { App, Modal, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile } from 'obsidian';

const WIC_VIEW_TYPE = 'wic-panel';
const WIC_NETWORK_VIEW_TYPE = 'wic-network';
const WIC_DATA_FILE = 'wic-data.json';
const D3_CDN_URL = 'https://d3js.org/d3.v7.min.js';

const DEFAULT_DIMENSIONS = [
  { id: 'EMO_Love', category: 'EMO', label: 'Love', module: 'MOD_CORE' },
  { id: 'EMO_Longing', category: 'EMO', label: 'Longing', module: 'MOD_CORE' },
  { id: 'EMO_Anxiety', category: 'EMO', label: 'Anxiety', module: 'MOD_CORE' },
  { id: 'EMO_Wonder', category: 'EMO', label: 'Wonder', module: 'MOD_CORE' },
  { id: 'EMO_Peace', category: 'EMO', label: 'Peace', module: 'MOD_CORE' },
  { id: 'EMO_Grief', category: 'EMO', label: 'Grief', module: 'MOD_CORE' },
  { id: 'EMO_Gratitude', category: 'EMO', label: 'Gratitude', module: 'MOD_CORE' },
  { id: 'PHIL_Sufism', category: 'PHIL', label: 'Sufism', module: 'MOD_CORE' },
  { id: 'PHIL_Existentialism', category: 'PHIL', label: 'Existentialism', module: 'MOD_CORE' },
  { id: 'PHIL_Buddhism', category: 'PHIL', label: 'Buddhism', module: 'MOD_CORE' },
  { id: 'PHIL_Stoicism', category: 'PHIL', label: 'Stoicism', module: 'MOD_CORE' },
  { id: 'COG_Metaphorical', category: 'COG', label: 'Metaphorical', module: 'MOD_CORE' },
  { id: 'COG_Abstract', category: 'COG', label: 'Abstract', module: 'MOD_CORE' },
  { id: 'COG_Paradoxical', category: 'COG', label: 'Paradoxical', module: 'MOD_CORE' },
  { id: 'PERS_Openness', category: 'PERS', label: 'Openness', module: 'MOD_CORE' },
  { id: 'PERS_Creativity', category: 'PERS', label: 'Creativity', module: 'MOD_CORE' },
  { id: 'BRAIN_DMN', category: 'BRAIN', label: 'Default Mode Network', module: 'MOD_CORE' },
  { id: 'BRAIN_Amygdala', category: 'BRAIN', label: 'Amygdala', module: 'MOD_CORE' },
];

const WORD_LIMITS: Record<string, number> = {
  trial: 2000,
  free: 500,
  pro: 2000,
  gold: 5000,
};

const FREE_MONTHLY_LIMIT = 5;
const TRIAL_SOFT_CAP = 100;
const TRIAL_DAYS = 30;

const CAT_COLORS: Record<string, string> = {
  EMO: '#D85A30',
  PHIL: '#7F77DD',
  COG: '#1D9E75',
  PERS: '#639922',
  BRAIN: '#378ADD',
};

interface Dimension {
  id: string;
  category: string;
  label: string;
  module?: string;
}

interface ScoreEntry {
  noteTitle: string;
  notePath: string;
  timestamp: number;
  scores: Record<string, number>;
  newDimensions: string[];
  excluded?: boolean;
}

interface WICData {
  entries: ScoreEntry[];
  dimensions: Dimension[];
  activeModules: string[];
  trialStartDate: number;
  trialWritingCount: number;
  tier: string;
  monthlyWritingCount: number;
  monthlyResetDate: number;
}

interface WICSettings {
  apiKey: string;
  model: string;
  dimensions: Dimension[];
}

const DEFAULT_SETTINGS: WICSettings = {
  apiKey: '',
  model: 'gpt-4o-mini',
  dimensions: DEFAULT_DIMENSIONS,
};

function displayName(entry: ScoreEntry): string {
  if (entry.notePath) {
    return entry.notePath.replace(/\.md$/i, '').replace(/^.*\//, '');
  }
  return entry.noteTitle || 'Untitled';
}

function getTrend(entries: ScoreEntry[], dimId: string): 'up' | 'down' | 'stable' | 'none' {
  const relevant = entries.filter(e => e.scores[dimId] !== undefined).slice(-5);
  if (relevant.length < 2) return 'none';
  const recent = relevant.slice(-2);
  const diff = recent[1].scores[dimId] - recent[0].scores[dimId];
  if (diff > 0.8) return 'up';
  if (diff < -0.8) return 'down';
  return 'stable';
}

class WICView extends ItemView {
  plugin: WICPlugin;
  currentScores: Record<string, number> = {};
  currentTitle: string = '';
  newDimensions: string[] = [];
  isLoading: boolean = false;

  constructor(leaf: WorkspaceLeaf, plugin: WICPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return WIC_VIEW_TYPE; }
  getDisplayText(): string { return 'W.I.C'; }
  getIcon(): string { return 'brain'; }

  async onOpen() { this.render(); }
  async onClose() {}

  render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('wic-panel');

    const header = container.createDiv('wic-header');
    header.createSpan({ cls: 'wic-title', text: 'W.I.C' });
    header.createSpan({ cls: 'wic-version', text: 'ExComS' });

    if (this.newDimensions.length > 0) {
      const banner = container.createDiv('wic-new-dim-banner');
      banner.setText('✦ New dimension detected: ' + this.newDimensions.join(', ') + ' — added to your network');
    }

    // Tier warning banners
    const data = this.plugin.wicData;
    if (data.tier === 'trial') {
      const daysElapsed = this.plugin.getTrialDaysElapsed();
      const writings = data.trialWritingCount;

      if (daysElapsed >= TRIAL_DAYS + 1) {
        container.createDiv({ cls: 'wic-tier-banner wic-tier-red', text: 'Trial expired — upgrade to continue with full access' });
      } else if (daysElapsed >= TRIAL_DAYS) {
        container.createDiv({ cls: 'wic-tier-banner wic-tier-red', text: 'Your trial period ends today' });
      } else if (daysElapsed >= TRIAL_DAYS - 5 && daysElapsed < TRIAL_DAYS) {
        container.createDiv({ cls: 'wic-tier-banner wic-tier-amber', text: (TRIAL_DAYS - daysElapsed) + ' days left in your trial' });
      }

      if (writings >= TRIAL_SOFT_CAP) {
        container.createDiv({ cls: 'wic-tier-banner wic-tier-red', text: 'Trial analysis limit reached — ' + writings + ' of ' + TRIAL_SOFT_CAP });
      } else if (writings >= 80) {
        container.createDiv({ cls: 'wic-tier-banner wic-tier-amber', text: 'You\'ve used ' + writings + ' of ' + TRIAL_SOFT_CAP + ' trial analyses' });
      }
    } else if (data.tier === 'free') {
      this.plugin.checkMonthlyReset();
      if (data.monthlyWritingCount >= FREE_MONTHLY_LIMIT) {
        container.createDiv({ cls: 'wic-tier-banner wic-tier-red', text: 'Free tier limit reached — ' + FREE_MONTHLY_LIMIT + ' analyses per month' });
      } else if (data.monthlyWritingCount >= FREE_MONTHLY_LIMIT - 1) {
        container.createDiv({ cls: 'wic-tier-banner wic-tier-amber', text: (FREE_MONTHLY_LIMIT - data.monthlyWritingCount) + ' analysis remaining this month' });
      }
    }

    const btn = container.createEl('button', {
      cls: 'wic-analyse-btn',
      text: this.isLoading ? 'Analysing...' : 'Analyse this note',
    });
    btn.disabled = this.isLoading;
    btn.onclick = () => this.plugin.analyseActiveNote();

    const status = container.createDiv('wic-status');
    if (this.currentTitle) {
      status.setText(this.currentTitle);
    } else {
      status.setText('Open a note and click Analyse');
    }

    if (Object.keys(this.currentScores).length === 0) {
      container.createDiv({
        cls: 'wic-empty',
        text: 'No scores yet. Open any diary entry, poem or note and click Analyse.',
      });
      return;
    }

    const categories = [...new Set(this.plugin.settings.dimensions.map(d => d.category))];

    categories.forEach(cat => {
      const dims = this.plugin.settings.dimensions.filter(d => d.category === cat);
      const scored = dims.filter(d => this.currentScores[d.id] !== undefined);
      if (scored.length === 0) return;

      const catDiv = container.createDiv('wic-category');
      catDiv.createDiv({ cls: 'wic-cat-label', text: cat });

      scored.forEach(dim => {
        const score = this.currentScores[dim.id] || 0;
        const trend = getTrend(this.plugin.wicData.entries, dim.id);
        const isNew = this.newDimensions.includes(dim.id);
        const locked = this.plugin.isDimensionLocked(dim);

        const dimDiv = catDiv.createDiv('wic-dimension');
        if (locked) dimDiv.addClass('wic-dim-locked');
        const row = dimDiv.createDiv('wic-dim-row');

        const nameSpan = row.createSpan({ cls: 'wic-dim-name', text: dim.label });
        if (isNew) {
          nameSpan.createSpan({ cls: 'wic-new-badge', text: 'new' });
        }

        row.createSpan({ cls: 'wic-dim-score', text: score.toFixed(1) });

        const trendSpan = row.createSpan({ cls: 'wic-dim-trend' });
        if (trend === 'up') {
          trendSpan.setText('↑');
          trendSpan.addClass('wic-trend-up');
        } else if (trend === 'down') {
          trendSpan.setText('↓');
          trendSpan.addClass('wic-trend-down');
        } else if (trend === 'stable') {
          trendSpan.setText('→');
          trendSpan.addClass('wic-trend-stable');
        }

        const track = dimDiv.createDiv('wic-bar-track');
        const fill = track.createDiv('wic-bar-fill');
        fill.style.width = (score * 10) + '%';
        fill.style.background = CAT_COLORS[cat] || '#888';
      });
    });

    // Include in network toggle for the current note
    const currentEntry = this.plugin.wicData.entries
      .filter(e => e.noteTitle === this.currentTitle)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (currentEntry) {
      const toggleRow = container.createDiv('wic-include-toggle');
      const cb = toggleRow.createEl('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = !currentEntry.excluded;
      cb.id = 'wic-include-cb';
      const label = toggleRow.createEl('label', { text: 'Include in network' });
      label.setAttribute('for', 'wic-include-cb');
      cb.onchange = async () => {
        currentEntry.excluded = !cb.checked;
        await this.plugin.saveWICData();
      };
    }
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
    this.render();
  }

  setScores(title: string, scores: Record<string, number>, newDims: string[]) {
    this.currentTitle = title;
    this.currentScores = scores;
    this.newDimensions = newDims;
    this.isLoading = false;
    this.render();
  }
}

class WICNetworkView extends ItemView {
  plugin: WICPlugin;
  d3: any = null;
  simulation: any = null;
  activeFilters: Set<string> = new Set();
  selectedNode: string | null = null;
  timeRange: [number, number] = [0, Date.now()];

  constructor(leaf: WorkspaceLeaf, plugin: WICPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return WIC_NETWORK_VIEW_TYPE; }
  getDisplayText(): string { return 'W.I.C Network'; }
  getIcon(): string { return 'git-fork'; }

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('wic-net-container');
    container.createDiv({ cls: 'wic-net-loading', text: 'Loading visualisation...' });
    await this.loadD3();
    this.render();
  }

  async onClose() {
    if (this.simulation) this.simulation.stop();
  }

  async loadD3(): Promise<void> {
    if ((window as any).d3) { this.d3 = (window as any).d3; return; }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = D3_CDN_URL;
      script.onload = () => { this.d3 = (window as any).d3; resolve(); };
      script.onerror = () => reject(new Error('Failed to load D3.js'));
      document.head.appendChild(script);
    });
  }

  getFilteredEntries(): ScoreEntry[] {
    return this.plugin.wicData.entries.filter(e =>
      !e.excluded && e.timestamp >= this.timeRange[0] && e.timestamp <= this.timeRange[1]
    );
  }

  getActiveNodes(): { dim: Dimension; avgScore: number }[] {
    const entries = this.getFilteredEntries();
    if (entries.length === 0) return [];

    return this.plugin.settings.dimensions
      .map(dim => {
        const scores = entries.map(e => e.scores[dim.id]).filter(s => s !== undefined);
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { dim, avgScore, maxScore };
      })
      .filter(n => n.maxScore > 2.0)
      .filter(n => this.activeFilters.size === 0 || this.activeFilters.has(n.dim.category));
  }

  getEdges(nodeIds: Set<string>): { source: string; target: string; strength: number }[] {
    const entries = this.getFilteredEntries();
    if (entries.length < 1) return [];

    const coOccurrence: Record<string, number> = {};
    const ids = [...nodeIds];

    entries.forEach(entry => {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = entry.scores[ids[i]];
          const b = entry.scores[ids[j]];
          if (a !== undefined && b !== undefined && a > 2 && b > 2) {
            const key = ids[i] + '|' + ids[j];
            coOccurrence[key] = (coOccurrence[key] || 0) + Math.min(a, b) / 10;
          }
        }
      }
    });

    const maxStrength = Math.max(...Object.values(coOccurrence), 1);

    return Object.entries(coOccurrence)
      .filter(([, v]) => v > 0.2)
      .map(([key, val]) => {
        const [source, target] = key.split('|');
        return { source, target, strength: val / maxStrength };
      });
  }

  render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('wic-net-container');

    // Header with refresh and start fresh
    const header = container.createDiv('wic-net-header');
    header.createSpan({ cls: 'wic-net-title', text: 'W.I.C Network' });
    const headerBtns = header.createDiv('wic-net-header-btns');
    const freshBtn = headerBtns.createEl('button', { cls: 'wic-net-fresh', text: 'Start fresh' });
    freshBtn.onclick = () => {
      new WICConfirmModal(
        this.app,
        'This will remove all analysis data. Your writings will not be deleted. Continue?',
        async () => {
          try {
            const filename = await this.plugin.clearAllData();
            new Notice('Data cleared. Backup saved: ' + filename);
            this.timeRange = [0, Date.now()];
            if (this.simulation) this.simulation.stop();
            this.render();
          } catch {
            new Notice('Failed — check console for details');
          }
        }
      ).open();
    };
    const refreshBtn = headerBtns.createEl('button', { cls: 'wic-net-refresh', text: '↻' });
    refreshBtn.setAttribute('aria-label', 'Refresh');
    refreshBtn.onclick = async () => {
      await this.plugin.loadWICData();
      this.timeRange = [0, Date.now()];
      if (this.simulation) this.simulation.stop();
      this.render();
    };

    const entries = this.plugin.wicData.entries;
    if (entries.length === 0) {
      container.createDiv({ cls: 'wic-net-empty', text: 'No data yet. Analyse some notes first to see your network.' });
      return;
    }

    if (this.timeRange[0] === 0 && this.timeRange[1] >= Date.now() - 1000) {
      const timestamps = entries.map(e => e.timestamp);
      this.timeRange = [Math.min(...timestamps), Math.max(...timestamps)];
    }

    // Filter chips
    const chipBar = container.createDiv('wic-net-chips');
    const categories = [...new Set(this.plugin.settings.dimensions.map(d => d.category))];
    categories.forEach(cat => {
      const chip = chipBar.createEl('button', { cls: 'wic-net-chip', text: cat });
      chip.style.borderColor = CAT_COLORS[cat] || '#888';
      if (this.activeFilters.has(cat)) {
        chip.addClass('wic-net-chip-active');
        chip.style.background = CAT_COLORS[cat] || '#888';
      }
      chip.onclick = () => {
        if (this.activeFilters.has(cat)) this.activeFilters.delete(cat);
        else this.activeFilters.add(cat);
        this.render();
      };
    });

    // SVG container
    const svgContainer = container.createDiv('wic-net-svg-wrap');
    const nodes = this.getActiveNodes();

    if (nodes.length === 0) {
      svgContainer.createDiv({ cls: 'wic-net-empty', text: 'No dimensions above threshold in this time range.' });
      this.renderScrubber(container);
      this.renderWritingsPanel(container);
      return;
    }

    const nodeIds = new Set(nodes.map(n => n.dim.id));
    const edges = this.getEdges(nodeIds);

    const width = svgContainer.clientWidth || 800;
    const height = svgContainer.clientHeight || 500;

    const d3 = this.d3;
    const svg = d3.select(svgContainer).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Edge lines
    const linkGroup = svg.append('g');
    const links = linkGroup.selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('stroke', 'var(--text-faint)')
      .attr('stroke-opacity', (d: any) => 0.15 + d.strength * 0.5)
      .attr('stroke-width', (d: any) => 1 + d.strength * 4);

    // Node groups
    const nodeGroup = svg.append('g');
    const maxAvg = Math.max(...nodes.map(n => n.avgScore), 1);

    const nodeEls = nodeGroup.selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event: any, d: any) => {
          if (!event.active) this.simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event: any, d: any) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', (event: any, d: any) => {
          if (!event.active) this.simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    nodeEls.append('circle')
      .attr('r', (d: any) => 12 + (d.avgScore / maxAvg) * 28)
      .attr('fill', (d: any) => CAT_COLORS[d.dim.category] || '#888')
      .attr('fill-opacity', 0.85)
      .attr('stroke', (d: any) => CAT_COLORS[d.dim.category] || '#888')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4);

    nodeEls.append('text')
      .text((d: any) => d.dim.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', (d: any) => {
        const r = 12 + (d.avgScore / maxAvg) * 28;
        return Math.max(9, Math.min(14, r * 0.55)) + 'px';
      })
      .attr('font-weight', '600')
      .attr('pointer-events', 'none');

    nodeEls.on('click', (_event: any, d: any) => {
      this.selectedNode = this.selectedNode === d.dim.id ? null : d.dim.id;
      this.renderDetail(container, d.dim);
    });

    // Force simulation
    const simNodes = nodes.map(n => ({ ...n, x: width / 2 + (Math.random() - 0.5) * 200, y: height / 2 + (Math.random() - 0.5) * 200 }));
    const simLinks = edges.map(e => ({
      source: simNodes.find(n => n.dim.id === e.source),
      target: simNodes.find(n => n.dim.id === e.target),
      strength: e.strength,
    })).filter(l => l.source && l.target);

    nodeEls.data(simNodes);
    links.data(simLinks);

    this.simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).distance(120).strength((d: any) => d.strength * 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => 16 + (d.avgScore / maxAvg) * 30))
      .on('tick', () => {
        links
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        nodeEls.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

    // Detail panel (empty initially)
    container.createDiv('wic-net-detail');

    // Timeline scrubber
    this.renderScrubber(container);

    // Writings inclusion panel
    this.renderWritingsPanel(container);
  }

  renderDetail(container: HTMLElement, dim: Dimension) {
    let detail = container.querySelector('.wic-net-detail') as HTMLElement;
    if (!detail) {
      detail = container.createDiv('wic-net-detail');
    }
    detail.innerHTML = '';

    if (!this.selectedNode) {
      detail.style.display = 'none';
      return;
    }

    detail.style.display = 'block';
    const entries = this.getFilteredEntries()
      .filter(e => e.scores[dim.id] !== undefined && e.scores[dim.id] > 0)
      .sort((a, b) => b.timestamp - a.timestamp);

    const header = detail.createDiv('wic-net-detail-header');
    header.createSpan({ cls: 'wic-net-detail-title', text: dim.label });
    header.createSpan({ cls: 'wic-net-detail-cat', text: dim.category });
    const closeBtn = header.createEl('button', { cls: 'wic-net-detail-close', text: '✕' });
    closeBtn.onclick = () => { this.selectedNode = null; detail.style.display = 'none'; };

    if (entries.length === 0) {
      detail.createDiv({ cls: 'wic-net-detail-empty', text: 'No scores recorded.' });
      return;
    }

    const list = detail.createDiv('wic-net-detail-list');
    entries.forEach(entry => {
      const row = list.createDiv('wic-net-detail-row');
      row.createSpan({ cls: 'wic-net-detail-note', text: displayName(entry) });
      row.createSpan({ cls: 'wic-net-detail-score', text: entry.scores[dim.id].toFixed(1) });
      row.createSpan({ cls: 'wic-net-detail-date', text: new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) });
    });
  }

  renderScrubber(container: HTMLElement) {
    const entries = this.plugin.wicData.entries;
    if (entries.length < 2) return;

    const timestamps = entries.map(e => e.timestamp);
    const minT = Math.min(...timestamps);
    const maxT = Math.max(...timestamps);

    const scrubber = container.createDiv('wic-net-scrubber');
    scrubber.createSpan({ cls: 'wic-net-scrub-label', text: new Date(this.timeRange[0]).toLocaleDateString() });

    const track = scrubber.createDiv('wic-net-scrub-track');
    const rangeInput = track.createEl('input');
    rangeInput.type = 'range';
    rangeInput.min = String(minT);
    rangeInput.max = String(maxT);
    rangeInput.value = String(this.timeRange[0]);
    rangeInput.addClass('wic-net-scrub-input');

    const rangeInputEnd = track.createEl('input');
    rangeInputEnd.type = 'range';
    rangeInputEnd.min = String(minT);
    rangeInputEnd.max = String(maxT);
    rangeInputEnd.value = String(this.timeRange[1]);
    rangeInputEnd.addClass('wic-net-scrub-input');

    scrubber.createSpan({ cls: 'wic-net-scrub-label', text: new Date(this.timeRange[1]).toLocaleDateString() });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const onScrub = () => {
      const start = parseInt(rangeInput.value);
      const end = parseInt(rangeInputEnd.value);
      this.timeRange = [Math.min(start, end), Math.max(start, end)];
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this.simulation) this.simulation.stop();
        this.render();
      }, 300);
    };

    rangeInput.addEventListener('input', onScrub);
    rangeInputEnd.addEventListener('input', onScrub);
  }

  writingsPanelOpen: boolean = false;

  renderWritingsPanel(container: HTMLElement) {
    const allEntries = this.plugin.wicData.entries;
    if (allEntries.length === 0) return;

    const panel = container.createDiv('wic-net-writings');

    const toggle = panel.createDiv('wic-net-writings-toggle');
    toggle.createSpan({ text: this.writingsPanelOpen ? '▾' : '▸', cls: 'wic-net-writings-arrow' });
    toggle.createSpan({ text: 'Writings (' + allEntries.length + ')' });
    toggle.onclick = () => {
      this.writingsPanelOpen = !this.writingsPanelOpen;
      const body = panel.querySelector('.wic-net-writings-body') as HTMLElement;
      if (body) body.style.display = this.writingsPanelOpen ? 'block' : 'none';
      const arrow = panel.querySelector('.wic-net-writings-arrow') as HTMLElement;
      if (arrow) arrow.setText(this.writingsPanelOpen ? '▾' : '▸');
    };

    const body = panel.createDiv('wic-net-writings-body');
    body.style.display = this.writingsPanelOpen ? 'block' : 'none';

    // Select all / Deselect all
    const actions = body.createDiv('wic-net-writings-actions');
    const selectAllBtn = actions.createEl('button', { cls: 'wic-net-writings-action-btn', text: 'Select all' });
    const deselectAllBtn = actions.createEl('button', { cls: 'wic-net-writings-action-btn', text: 'Deselect all' });

    selectAllBtn.onclick = async () => {
      allEntries.forEach(e => e.excluded = false);
      await this.plugin.saveWICData();
      if (this.simulation) this.simulation.stop();
      this.render();
    };

    deselectAllBtn.onclick = async () => {
      allEntries.forEach(e => e.excluded = true);
      await this.plugin.saveWICData();
      if (this.simulation) this.simulation.stop();
      this.render();
    };

    const list = body.createDiv('wic-net-writings-list');
    [...allEntries].sort((a, b) => b.timestamp - a.timestamp).forEach(entry => {
      const row = list.createDiv('wic-net-writings-row');
      if (entry.excluded) row.addClass('wic-net-writings-excluded');

      const cb = row.createEl('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = !entry.excluded;
      cb.addClass('wic-net-writings-cb');
      cb.onclick = async (evt) => {
        evt.stopPropagation();
        entry.excluded = !cb.checked;
        await this.plugin.saveWICData();
        if (this.simulation) this.simulation.stop();
        this.render();
      };

      row.createSpan({ cls: 'wic-net-writings-label', text: displayName(entry) });
      row.createSpan({ cls: 'wic-net-writings-date', text: new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) });
    });
  }
}

export default class WICPlugin extends Plugin {
  settings: WICSettings;
  wicData: WICData = { entries: [], dimensions: [], activeModules: ['MOD_CORE'], trialStartDate: 0, trialWritingCount: 0, tier: 'trial', monthlyWritingCount: 0, monthlyResetDate: 0 };

  async onload() {
    await this.loadSettings();
    await this.loadWICData();

    this.registerView(WIC_VIEW_TYPE, (leaf) => new WICView(leaf, this));
    this.registerView(WIC_NETWORK_VIEW_TYPE, (leaf) => new WICNetworkView(leaf, this));

    this.addRibbonIcon('brain', 'ExComS W.I.C', () => this.activateView());
    this.addRibbonIcon('git-fork', 'W.I.C Network', () => this.activateNetworkView());

    this.addCommand({
      id: 'analyse-note',
      name: 'Analyse this note',
      editorCallback: () => this.analyseActiveNote(),
    });

    this.addCommand({
      id: 'open-wic-panel',
      name: 'Open W.I.C panel',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'open-wic-network',
      name: 'Open W.I.C Network',
      callback: () => this.activateNetworkView(),
    });

    this.addSettingTab(new WICSettingTab(this.app, this));
    await this.activateView();
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(WIC_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(WIC_NETWORK_VIEW_TYPE);
  }

  async activateView() {
    const { workspace } = this.app;
    try {
      let leaf = workspace.getLeavesOfType(WIC_VIEW_TYPE)[0];
      if (!leaf) {
        await workspace.onLayoutReady(async () => {
          try {
            let newLeaf = workspace.getRightLeaf(false);
            if (!newLeaf) newLeaf = workspace.getLeaf(true);
            if (newLeaf) {
              await newLeaf.setViewState({ type: WIC_VIEW_TYPE, active: true });
              workspace.revealLeaf(newLeaf);
            }
          } catch(e) {
            console.log('WIC: could not open panel automatically, use ribbon icon');
          }
        });
      } else {
        workspace.revealLeaf(leaf);
      }
    } catch(e) {
      console.log('WIC: activateView error', e);
    }
  }

  async activateNetworkView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(WIC_NETWORK_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: WIC_NETWORK_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  getTrialDaysElapsed(): number {
    if (this.wicData.trialStartDate === 0) return 0;
    return Math.floor((Date.now() - this.wicData.trialStartDate) / (1000 * 60 * 60 * 24));
  }

  isTrialExpired(): boolean {
    return this.wicData.tier === 'trial' && this.getTrialDaysElapsed() > TRIAL_DAYS;
  }

  isTrialCapReached(): boolean {
    return this.wicData.tier === 'trial' && this.wicData.trialWritingCount >= TRIAL_SOFT_CAP;
  }

  isDimensionLocked(dim: Dimension): boolean {
    if (this.wicData.tier === 'pro' || this.wicData.tier === 'gold') return false;
    const module = dim.module || 'MOD_CORE';
    if (module === 'MOD_CORE') return false;
    // Non-core modules locked if trial expired or cap reached
    return this.isTrialExpired() || this.isTrialCapReached();
  }

  checkMonthlyReset() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (this.wicData.monthlyResetDate < firstOfMonth) {
      this.wicData.monthlyWritingCount = 0;
      this.wicData.monthlyResetDate = firstOfMonth;
    }
  }

  enforceWordLimit(content: string): { text: string; wordCount: number; wasTruncated: boolean } {
    const words = content.trim().split(/\s+/);
    const wordCount = words.length;
    const limit = WORD_LIMITS[this.wicData.tier] || WORD_LIMITS.trial;
    if (wordCount <= limit) return { text: content, wordCount, wasTruncated: false };
    const truncated = words.slice(0, limit).join(' ');
    return { text: truncated, wordCount, wasTruncated: true };
  }

  async analyseActiveNote() {
    if (!this.settings.apiKey) { new Notice('Please add your OpenAI API key in W.I.C settings'); return; }

    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) { new Notice('Please open a note first'); return; }

    let content = '';
    let title = 'Untitled';

    try {
      const activeView = activeLeaf.view as any;
      const activeFile = activeView?.file || this.app.workspace.getActiveFile();
      title = activeFile?.basename || activeView?.getDisplayText() || 'Untitled';
      if (activeFile) {
        content = await this.app.vault.read(activeFile);
      } else if (activeView?.editor) {
        content = activeView.editor.getValue();
      } else if (activeView?.data) {
        content = activeView.data;
      }
    } catch(e) {
      new Notice('Could not read note — please click into the note text and try again');
      return;
    }

    if (!content || content.trim().length === 0) {
      new Notice('Note appears empty');
      return;
    }

    if (content.trim().length < 50) {
      new Notice('Note is too short to analyse — add more writing first');
      return;
    }

    // Free tier monthly limit check
    if (this.wicData.tier === 'free') {
      this.checkMonthlyReset();
      if (this.wicData.monthlyWritingCount >= FREE_MONTHLY_LIMIT) {
        new Notice('Free tier limit reached — ' + FREE_MONTHLY_LIMIT + ' analyses per month. Upgrade for unlimited.');
        return;
      }
    }

    // Word count enforcement
    const limit = WORD_LIMITS[this.wicData.tier] || WORD_LIMITS.trial;
    const { text: analysisContent, wordCount, wasTruncated } = this.enforceWordLimit(content);
    if (wasTruncated) {
      new Notice('Your note has ' + wordCount + ' words — limit is ' + limit + '. Analysing the first ' + limit + ' words.');
    }

    // Trial start tracking
    if (this.wicData.tier === 'trial' && this.wicData.trialStartDate === 0) {
      this.wicData.trialStartDate = Date.now();
    }

    const wicView = this.getWICView();
    if (wicView && typeof wicView.setLoading === 'function') wicView.setLoading(true);
    new Notice('W.I.C is analysing your writing...');

    try {
      const scores = await this.callOpenAI(analysisContent, title);
      const newDims = this.detectNewDimensions(scores);

      const entry: ScoreEntry = {
        noteTitle: title,
        notePath: this.app.workspace.getActiveFile()?.path || '',
        timestamp: Date.now(),
        scores,
        newDimensions: newDims,
      };

      this.wicData.entries.push(entry);

      // Tier tracking increments
      if (this.wicData.tier === 'trial') {
        this.wicData.trialWritingCount++;
      }
      if (this.wicData.tier === 'free') {
        this.wicData.monthlyWritingCount++;
      }

      await this.saveWICData();

      if (wicView) wicView.setScores(title, scores, newDims);

      if (newDims.length > 0) {
        new Notice('✦ New dimension detected: ' + newDims.join(', '));
      } else {
        new Notice('Analysis complete');
      }

      // Post-analysis trial warnings
      if (this.wicData.tier === 'trial' && this.wicData.trialWritingCount === TRIAL_SOFT_CAP) {
        new Notice('You\'ve reached ' + TRIAL_SOFT_CAP + ' analyses — explore Pro for unlimited access');
      }
    } catch (err: any) {
      const wicViewErr = this.getWICView();
      if (wicViewErr) wicViewErr.setLoading(false);
      new Notice('Analysis failed: ' + err.message);
      console.error('WIC Error:', err);
    }
  }

  async callOpenAI(content: string, title: string): Promise<Record<string, number>> {
    const dimList = this.settings.dimensions.map(d => d.id + ' (' + d.label + ')').join('\n');

    const prompt = 'You are analysing a personal writing for ExComS W.I.C — a writing intelligence tool.\n\n' +
      'Analyse the following writing and score each dimension from 0.0 to 10.0.\n' +
      'A score of 0 means completely absent. A score of 10 means extremely strongly present.\n' +
      'Be precise and honest — most dimensions will score between 0 and 6 for typical writing.\n' +
      'Only score 8-10 for dimensions that are unmistakably dominant.\n\n' +
      'Dimensions to score:\n' + dimList + '\n\n' +
      'Writing title: "' + title + '"\n' +
      'Writing content:\n---\n' + content + '\n---\n\n' +
      'Respond with ONLY a valid JSON object like this example:\n' +
      '{"EMO_Love": 7.2, "EMO_Longing": 5.1, "PHIL_Sufism": 8.4}\n\n' +
      'Include ALL dimensions in the response, even if scored 0.\n' +
      'No explanation, no markdown, just the JSON object.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.settings.apiKey,
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API error ' + response.status);
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  detectNewDimensions(scores: Record<string, number>): string[] {
    const previouslyScored = new Set(
      this.wicData.entries.flatMap(e => Object.keys(e.scores))
    );
    return Object.keys(scores).filter(
      id => scores[id] > 4 && !previouslyScored.has(id)
    );
  }

  getWICView(): WICView | null {
    const leaf = this.app.workspace.getLeavesOfType(WIC_VIEW_TYPE)[0];
    return leaf ? (leaf.view as WICView) : null;
  }

  async clearAllData(): Promise<string> {
    const filename = await this.exportWICData();
    this.wicData.entries = [];
    await this.saveWICData();
    return filename;
  }

  async exportWICData(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10);
    const filename = 'wic-data-backup-' + date + '.json';
    const raw = JSON.stringify(this.wicData, null, 2);
    try {
      const existing = this.app.vault.getAbstractFileByPath(filename);
      if (existing instanceof TFile) {
        await this.app.vault.modify(existing, raw);
      } else {
        await this.app.vault.create(filename, raw);
      }
    } catch (e) {
      console.error('WIC: export failed', e);
      throw new Error('Could not save backup file');
    }
    return filename;
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    if (!this.settings.dimensions || this.settings.dimensions.length === 0) {
      this.settings.dimensions = DEFAULT_DIMENSIONS;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async loadWICData() {
    try {
      const file = this.app.vault.getAbstractFileByPath(WIC_DATA_FILE);
      if (file instanceof TFile) {
        const raw = await this.app.vault.read(file);
        const parsed = JSON.parse(raw);
        this.wicData = {
          entries: parsed.entries || [],
          dimensions: parsed.dimensions || [],
          activeModules: parsed.activeModules || ['MOD_CORE'],
          trialStartDate: parsed.trialStartDate || 0,
          trialWritingCount: parsed.trialWritingCount || 0,
          tier: parsed.tier || 'trial',
          monthlyWritingCount: parsed.monthlyWritingCount || 0,
          monthlyResetDate: parsed.monthlyResetDate || 0,
        };
      }
    } catch {
      this.wicData = { entries: [], dimensions: [], activeModules: ['MOD_CORE'], trialStartDate: 0, trialWritingCount: 0, tier: 'trial', monthlyWritingCount: 0, monthlyResetDate: 0 };
    }
  }

  async saveWICData() {
    const raw = JSON.stringify(this.wicData, null, 2);
    try {
      const file = this.app.vault.getAbstractFileByPath(WIC_DATA_FILE);
      if (file instanceof TFile) {
        await this.app.vault.modify(file, raw);
      } else {
        await this.app.vault.create(WIC_DATA_FILE, raw);
      }
    } catch (e) {
      console.error('WIC: could not save data', e);
    }
  }
}

class WICConfirmModal extends Modal {
  message: string;
  onConfirm: () => void;

  constructor(app: App, message: string, onConfirm: () => void) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('p', { text: this.message, cls: 'wic-confirm-message' });
    const btnRow = contentEl.createDiv('wic-confirm-buttons');
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();
    const confirmBtn = btnRow.createEl('button', { text: 'Confirm', cls: 'mod-warning' });
    confirmBtn.onclick = () => { this.close(); this.onConfirm(); };
  }

  onClose() {
    this.contentEl.empty();
  }
}

class WICSettingTab extends PluginSettingTab {
  plugin: WICPlugin;

  constructor(app: App, plugin: WICPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'ExComS W.I.C Settings' });
    containerEl.createEl('p', {
      text: 'Writing Intelligence Companion — your writing, understood.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Your OpenAI API key. Find it at platform.openai.com. Never shared or stored externally.')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Model')
      .setDesc('gpt-4o-mini is fast and affordable. gpt-4o is more accurate for complex or subtle writing.')
      .addDropdown(drop => drop
        .addOption('gpt-4o-mini', 'GPT-4o Mini (recommended)')
        .addOption('gpt-4o', 'GPT-4o (more accurate)')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Your Dimensions' });
    containerEl.createEl('p', {
      text: this.plugin.settings.dimensions.length + ' dimensions active. Edit labels or remove dimensions to personalise your taxonomy.',
      cls: 'setting-item-description'
    });

    this.plugin.settings.dimensions.forEach((dim, index) => {
      new Setting(containerEl)
        .setName(dim.id)
        .setDesc('Category: ' + dim.category)
        .addText(text => text
          .setValue(dim.label)
          .onChange(async (value) => {
            this.plugin.settings.dimensions[index].label = value;
            await this.plugin.saveSettings();
          }))
        .addButton(btn => btn
          .setButtonText('Remove')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.dimensions.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          }));
    });

    // Data Management
    containerEl.createEl('h3', { text: 'Data Management' });

    const entryCount = this.plugin.wicData.entries.length;

    new Setting(containerEl)
      .setName('Export data')
      .setDesc('Save a dated backup of wic-data.json to your vault root.')
      .addButton(btn => btn
        .setButtonText('Export')
        .onClick(async () => {
          try {
            const filename = await this.plugin.exportWICData();
            new Notice('Backup saved: ' + filename);
          } catch {
            new Notice('Export failed — check console for details');
          }
        }));

    new Setting(containerEl)
      .setName('Clear all data')
      .setDesc('Delete all ' + entryCount + ' entries. Keeps your dimension taxonomy. A backup is saved automatically first.')
      .addButton(btn => btn
        .setButtonText('Clear')
        .setWarning()
        .onClick(() => {
          new WICConfirmModal(
            this.app,
            'This will delete all ' + entryCount + ' entries from your data. A backup will be saved first. Continue?',
            async () => {
              try {
                const filename = await this.plugin.clearAllData();
                new Notice('Data cleared. Backup saved: ' + filename);
                this.display();
              } catch {
                new Notice('Failed — check console for details');
              }
            }
          ).open();
        }));

    new Setting(containerEl)
      .setName('Full reset')
      .setDesc('Delete all entries AND reset dimensions to the 18 defaults. A backup is saved automatically first.')
      .addButton(btn => btn
        .setButtonText('Reset')
        .setWarning()
        .onClick(() => {
          new WICConfirmModal(
            this.app,
            'This will delete all ' + entryCount + ' entries and reset your dimensions to defaults. A backup will be saved first. Continue?',
            async () => {
              try {
                const filename = await this.plugin.exportWICData();
                this.plugin.wicData.entries = [];
                this.plugin.wicData.dimensions = [];
                this.plugin.wicData.trialStartDate = 0;
                this.plugin.wicData.trialWritingCount = 0;
                this.plugin.wicData.tier = 'trial';
                this.plugin.wicData.monthlyWritingCount = 0;
                this.plugin.wicData.monthlyResetDate = 0;
                this.plugin.wicData.activeModules = ['MOD_CORE'];
                await this.plugin.saveWICData();
                this.plugin.settings.dimensions = [...DEFAULT_DIMENSIONS];
                await this.plugin.saveSettings();
                new Notice('Full reset complete. Backup saved: ' + filename);
                this.display();
              } catch {
                new Notice('Failed — check console for details');
              }
            }
          ).open();
        }));
  }
}
