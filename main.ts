import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile } from 'obsidian';

const WIC_VIEW_TYPE = 'wic-panel';
const WIC_DATA_FILE = 'wic-data.json';

const DEFAULT_DIMENSIONS = [
  { id: 'EMO_Love', category: 'EMO', label: 'Love' },
  { id: 'EMO_Longing', category: 'EMO', label: 'Longing' },
  { id: 'EMO_Anxiety', category: 'EMO', label: 'Anxiety' },
  { id: 'EMO_Wonder', category: 'EMO', label: 'Wonder' },
  { id: 'EMO_Peace', category: 'EMO', label: 'Peace' },
  { id: 'EMO_Grief', category: 'EMO', label: 'Grief' },
  { id: 'EMO_Gratitude', category: 'EMO', label: 'Gratitude' },
  { id: 'PHIL_Sufism', category: 'PHIL', label: 'Sufism' },
  { id: 'PHIL_Existentialism', category: 'PHIL', label: 'Existentialism' },
  { id: 'PHIL_Buddhism', category: 'PHIL', label: 'Buddhism' },
  { id: 'PHIL_Stoicism', category: 'PHIL', label: 'Stoicism' },
  { id: 'COG_Metaphorical', category: 'COG', label: 'Metaphorical' },
  { id: 'COG_Abstract', category: 'COG', label: 'Abstract' },
  { id: 'COG_Paradoxical', category: 'COG', label: 'Paradoxical' },
  { id: 'PERS_Openness', category: 'PERS', label: 'Openness' },
  { id: 'PERS_Creativity', category: 'PERS', label: 'Creativity' },
  { id: 'BRAIN_DMN', category: 'BRAIN', label: 'Default Mode Network' },
  { id: 'BRAIN_Amygdala', category: 'BRAIN', label: 'Amygdala' },
];

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
}

interface ScoreEntry {
  noteTitle: string;
  notePath: string;
  timestamp: number;
  scores: Record<string, number>;
  newDimensions: string[];
}

interface WICData {
  entries: ScoreEntry[];
  dimensions: Dimension[];
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

        const dimDiv = catDiv.createDiv('wic-dimension');
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

export default class WICPlugin extends Plugin {
  settings: WICSettings;
  wicData: WICData = { entries: [], dimensions: [] };

  async onload() {
    await this.loadSettings();
    await this.loadWICData();

    this.registerView(WIC_VIEW_TYPE, (leaf) => new WICView(leaf, this));

    this.addRibbonIcon('brain', 'ExComS W.I.C', () => this.activateView());

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

    this.addSettingTab(new WICSettingTab(this.app, this));
    await this.activateView();
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(WIC_VIEW_TYPE);
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

  async analyseActiveNote() {
    if (!this.settings.apiKey) { new Notice('Please add your OpenAI API key in W.I.C settings'); return; }

    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) { new Notice('Please open a note first'); return; }

    let content = '';
    let title = 'Untitled';

    try {
      const activeView = activeLeaf.view as any;
      title = activeView?.file?.basename || activeView?.getDisplayText() || 'Untitled';

      const activeFile = activeView?.file || this.app.workspace.getActiveFile();
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

    const wicView = this.getWICView();
    if (wicView && typeof wicView.setLoading === 'function') wicView.setLoading(true);
    new Notice('W.I.C is analysing your writing...');

    try {
      const scores = await this.callOpenAI(content, title);
      const newDims = this.detectNewDimensions(scores);

      const entry: ScoreEntry = {
        noteTitle: title,
        notePath: this.app.workspace.getActiveFile()?.path || '',
        timestamp: Date.now(),
        scores,
        newDimensions: newDims,
      };

      this.wicData.entries.push(entry);
      await this.saveWICData();

      if (wicView) wicView.setScores(title, scores, newDims);

      if (newDims.length > 0) {
        new Notice('✦ New dimension detected: ' + newDims.join(', '));
      } else {
        new Notice('Analysis complete');
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
      'Writing content:\n---\n' + content.slice(0, 3000) + '\n---\n\n' +
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
        this.wicData = JSON.parse(raw);
      }
    } catch {
      this.wicData = { entries: [], dimensions: [] };
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
  }
}
