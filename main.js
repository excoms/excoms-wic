/* ExComS W.I.C Plugin */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WICPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var WIC_VIEW_TYPE = "wic-panel";
var WIC_DATA_FILE = "wic-data.json";
var DEFAULT_DIMENSIONS = [
  { id: "EMO_Love", category: "EMO", label: "Love" },
  { id: "EMO_Longing", category: "EMO", label: "Longing" },
  { id: "EMO_Anxiety", category: "EMO", label: "Anxiety" },
  { id: "EMO_Wonder", category: "EMO", label: "Wonder" },
  { id: "EMO_Peace", category: "EMO", label: "Peace" },
  { id: "EMO_Grief", category: "EMO", label: "Grief" },
  { id: "EMO_Gratitude", category: "EMO", label: "Gratitude" },
  { id: "PHIL_Sufism", category: "PHIL", label: "Sufism" },
  { id: "PHIL_Existentialism", category: "PHIL", label: "Existentialism" },
  { id: "PHIL_Buddhism", category: "PHIL", label: "Buddhism" },
  { id: "PHIL_Stoicism", category: "PHIL", label: "Stoicism" },
  { id: "COG_Metaphorical", category: "COG", label: "Metaphorical" },
  { id: "COG_Abstract", category: "COG", label: "Abstract" },
  { id: "COG_Paradoxical", category: "COG", label: "Paradoxical" },
  { id: "PERS_Openness", category: "PERS", label: "Openness" },
  { id: "PERS_Creativity", category: "PERS", label: "Creativity" },
  { id: "BRAIN_DMN", category: "BRAIN", label: "Default Mode Network" },
  { id: "BRAIN_Amygdala", category: "BRAIN", label: "Amygdala" }
];
var CAT_COLORS = {
  EMO: "#D85A30",
  PHIL: "#7F77DD",
  COG: "#1D9E75",
  PERS: "#639922",
  BRAIN: "#378ADD"
};
var DEFAULT_SETTINGS = {
  apiKey: "",
  model: "gpt-4o-mini",
  dimensions: DEFAULT_DIMENSIONS
};
function getTrend(entries, dimId) {
  const relevant = entries.filter((e) => e.scores[dimId] !== void 0).slice(-5);
  if (relevant.length < 2)
    return "none";
  const recent = relevant.slice(-2);
  const diff = recent[1].scores[dimId] - recent[0].scores[dimId];
  if (diff > 0.8)
    return "up";
  if (diff < -0.8)
    return "down";
  return "stable";
}
var WICView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    __publicField(this, "currentScores", {});
    __publicField(this, "currentTitle", "");
    __publicField(this, "newDimensions", []);
    __publicField(this, "isLoading", false);
    this.plugin = plugin;
  }
  getViewType() {
    return WIC_VIEW_TYPE;
  }
  getDisplayText() {
    return "W.I.C";
  }
  getIcon() {
    return "brain";
  }
  async onOpen() {
    this.render();
  }
  async onClose() {
  }
  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("wic-panel");
    const header = container.createDiv("wic-header");
    header.createSpan({ cls: "wic-title", text: "W.I.C" });
    header.createSpan({ cls: "wic-version", text: "ExComS" });
    if (this.newDimensions.length > 0) {
      const banner = container.createDiv("wic-new-dim-banner");
      banner.setText("\u2726 New dimension detected: " + this.newDimensions.join(", ") + " \u2014 added to your network");
    }
    const btn = container.createEl("button", {
      cls: "wic-analyse-btn",
      text: this.isLoading ? "Analysing..." : "Analyse this note"
    });
    btn.disabled = this.isLoading;
    btn.onclick = () => this.plugin.analyseActiveNote();
    const status = container.createDiv("wic-status");
    if (this.currentTitle) {
      status.setText(this.currentTitle);
    } else {
      status.setText("Open a note and click Analyse");
    }
    if (Object.keys(this.currentScores).length === 0) {
      container.createDiv({
        cls: "wic-empty",
        text: "No scores yet. Open any diary entry, poem or note and click Analyse."
      });
      return;
    }
    const categories = [...new Set(this.plugin.settings.dimensions.map((d) => d.category))];
    categories.forEach((cat) => {
      const dims = this.plugin.settings.dimensions.filter((d) => d.category === cat);
      const scored = dims.filter((d) => this.currentScores[d.id] !== void 0);
      if (scored.length === 0)
        return;
      const catDiv = container.createDiv("wic-category");
      catDiv.createDiv({ cls: "wic-cat-label", text: cat });
      scored.forEach((dim) => {
        const score = this.currentScores[dim.id] || 0;
        const trend = getTrend(this.plugin.wicData.entries, dim.id);
        const isNew = this.newDimensions.includes(dim.id);
        const dimDiv = catDiv.createDiv("wic-dimension");
        const row = dimDiv.createDiv("wic-dim-row");
        const nameSpan = row.createSpan({ cls: "wic-dim-name", text: dim.label });
        if (isNew) {
          nameSpan.createSpan({ cls: "wic-new-badge", text: "new" });
        }
        row.createSpan({ cls: "wic-dim-score", text: score.toFixed(1) });
        const trendSpan = row.createSpan({ cls: "wic-dim-trend" });
        if (trend === "up") {
          trendSpan.setText("\u2191");
          trendSpan.addClass("wic-trend-up");
        } else if (trend === "down") {
          trendSpan.setText("\u2193");
          trendSpan.addClass("wic-trend-down");
        } else if (trend === "stable") {
          trendSpan.setText("\u2192");
          trendSpan.addClass("wic-trend-stable");
        }
        const track = dimDiv.createDiv("wic-bar-track");
        const fill = track.createDiv("wic-bar-fill");
        fill.style.width = score * 10 + "%";
        fill.style.background = CAT_COLORS[cat] || "#888";
      });
    });
  }
  setLoading(loading) {
    this.isLoading = loading;
    this.render();
  }
  setScores(title, scores, newDims) {
    this.currentTitle = title;
    this.currentScores = scores;
    this.newDimensions = newDims;
    this.isLoading = false;
    this.render();
  }
};
var WICPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "wicData", { entries: [], dimensions: [] });
  }
  async onload() {
    await this.loadSettings();
    await this.loadWICData();
    this.registerView(WIC_VIEW_TYPE, (leaf) => new WICView(leaf, this));
    this.addRibbonIcon("brain", "ExComS W.I.C", () => this.activateView());
    this.addCommand({
      id: "analyse-note",
      name: "Analyse this note",
      editorCallback: () => this.analyseActiveNote()
    });
    this.addCommand({
      id: "open-wic-panel",
      name: "Open W.I.C panel",
      callback: () => this.activateView()
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
            if (!newLeaf)
              newLeaf = workspace.getLeaf(true);
            if (newLeaf) {
              await newLeaf.setViewState({ type: WIC_VIEW_TYPE, active: true });
              workspace.revealLeaf(newLeaf);
            }
          } catch (e) {
            console.log("WIC: could not open panel automatically, use ribbon icon");
          }
        });
      } else {
        workspace.revealLeaf(leaf);
      }
    } catch (e) {
      console.log("WIC: activateView error", e);
    }
  }
  async analyseActiveNote() {
    var _a, _b;
    if (!this.settings.apiKey) {
      new import_obsidian.Notice("Please add your OpenAI API key in W.I.C settings");
      return;
    }
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) {
      new import_obsidian.Notice("Please open a note first");
      return;
    }
    let content = "";
    let title = "Untitled";
    try {
      const activeView = activeLeaf.view;
      title = ((_a = activeView == null ? void 0 : activeView.file) == null ? void 0 : _a.basename) || (activeView == null ? void 0 : activeView.getDisplayText()) || "Untitled";
      const activeFile = (activeView == null ? void 0 : activeView.file) || this.app.workspace.getActiveFile();
      if (activeFile) {
        content = await this.app.vault.read(activeFile);
      } else if (activeView == null ? void 0 : activeView.editor) {
        content = activeView.editor.getValue();
      } else if (activeView == null ? void 0 : activeView.data) {
        content = activeView.data;
      }
    } catch (e) {
      new import_obsidian.Notice("Could not read note \u2014 please click into the note text and try again");
      return;
    }
    if (!content || content.trim().length === 0) {
      new import_obsidian.Notice("Note appears empty");
      return;
    }
    if (content.trim().length < 50) {
      new import_obsidian.Notice("Note is too short to analyse \u2014 add more writing first");
      return;
    }
    const wicView = this.getWICView();
    if (wicView && typeof wicView.setLoading === "function")
      wicView.setLoading(true);
    new import_obsidian.Notice("W.I.C is analysing your writing...");
    try {
      const scores = await this.callOpenAI(content, title);
      const newDims = this.detectNewDimensions(scores);
      const entry = {
        noteTitle: title,
        notePath: ((_b = this.app.workspace.getActiveFile()) == null ? void 0 : _b.path) || "",
        timestamp: Date.now(),
        scores,
        newDimensions: newDims
      };
      this.wicData.entries.push(entry);
      await this.saveWICData();
      if (wicView)
        wicView.setScores(title, scores, newDims);
      if (newDims.length > 0) {
        new import_obsidian.Notice("\u2726 New dimension detected: " + newDims.join(", "));
      } else {
        new import_obsidian.Notice("Analysis complete");
      }
    } catch (err) {
      const wicViewErr = this.getWICView();
      if (wicViewErr)
        wicViewErr.setLoading(false);
      new import_obsidian.Notice("Analysis failed: " + err.message);
      console.error("WIC Error:", err);
    }
  }
  async callOpenAI(content, title) {
    var _a;
    const dimList = this.settings.dimensions.map((d) => d.id + " (" + d.label + ")").join("\n");
    const prompt = "You are analysing a personal writing for ExComS W.I.C \u2014 a writing intelligence tool.\n\nAnalyse the following writing and score each dimension from 0.0 to 10.0.\nA score of 0 means completely absent. A score of 10 means extremely strongly present.\nBe precise and honest \u2014 most dimensions will score between 0 and 6 for typical writing.\nOnly score 8-10 for dimensions that are unmistakably dominant.\n\nDimensions to score:\n" + dimList + '\n\nWriting title: "' + title + '"\nWriting content:\n---\n' + content.slice(0, 3e3) + '\n---\n\nRespond with ONLY a valid JSON object like this example:\n{"EMO_Love": 7.2, "EMO_Longing": 5.1, "PHIL_Sufism": 8.4}\n\nInclude ALL dimensions in the response, even if scored 0.\nNo explanation, no markdown, just the JSON object.';
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.settings.apiKey
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(((_a = err.error) == null ? void 0 : _a.message) || "API error " + response.status);
    }
    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }
  detectNewDimensions(scores) {
    const previouslyScored = new Set(
      this.wicData.entries.flatMap((e) => Object.keys(e.scores))
    );
    return Object.keys(scores).filter(
      (id) => scores[id] > 4 && !previouslyScored.has(id)
    );
  }
  getWICView() {
    const leaf = this.app.workspace.getLeavesOfType(WIC_VIEW_TYPE)[0];
    return leaf ? leaf.view : null;
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
      if (file instanceof import_obsidian.TFile) {
        const raw = await this.app.vault.read(file);
        this.wicData = JSON.parse(raw);
      }
    } catch (e) {
      this.wicData = { entries: [], dimensions: [] };
    }
  }
  async saveWICData() {
    const raw = JSON.stringify(this.wicData, null, 2);
    try {
      const file = this.app.vault.getAbstractFileByPath(WIC_DATA_FILE);
      if (file instanceof import_obsidian.TFile) {
        await this.app.vault.modify(file, raw);
      } else {
        await this.app.vault.create(WIC_DATA_FILE, raw);
      }
    } catch (e) {
      console.error("WIC: could not save data", e);
    }
  }
};
var WICSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "ExComS W.I.C Settings" });
    containerEl.createEl("p", {
      text: "Writing Intelligence Companion \u2014 your writing, understood.",
      cls: "setting-item-description"
    });
    new import_obsidian.Setting(containerEl).setName("OpenAI API Key").setDesc("Your OpenAI API key. Find it at platform.openai.com. Never shared or stored externally.").addText((text) => text.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
      this.plugin.settings.apiKey = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Model").setDesc("gpt-4o-mini is fast and affordable. gpt-4o is more accurate for complex or subtle writing.").addDropdown((drop) => drop.addOption("gpt-4o-mini", "GPT-4o Mini (recommended)").addOption("gpt-4o", "GPT-4o (more accurate)").setValue(this.plugin.settings.model).onChange(async (value) => {
      this.plugin.settings.model = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Your Dimensions" });
    containerEl.createEl("p", {
      text: this.plugin.settings.dimensions.length + " dimensions active. Edit labels or remove dimensions to personalise your taxonomy.",
      cls: "setting-item-description"
    });
    this.plugin.settings.dimensions.forEach((dim, index) => {
      new import_obsidian.Setting(containerEl).setName(dim.id).setDesc("Category: " + dim.category).addText((text) => text.setValue(dim.label).onChange(async (value) => {
        this.plugin.settings.dimensions[index].label = value;
        await this.plugin.saveSettings();
      })).addButton((btn) => btn.setButtonText("Remove").setWarning().onClick(async () => {
        this.plugin.settings.dimensions.splice(index, 1);
        await this.plugin.saveSettings();
        this.display();
      }));
    });
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgQXBwLCBNYXJrZG93blZpZXcsIE5vdGljZSwgUGx1Z2luLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nLCBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5cbmNvbnN0IFdJQ19WSUVXX1RZUEUgPSAnd2ljLXBhbmVsJztcbmNvbnN0IFdJQ19EQVRBX0ZJTEUgPSAnd2ljLWRhdGEuanNvbic7XG5cbmNvbnN0IERFRkFVTFRfRElNRU5TSU9OUyA9IFtcbiAgeyBpZDogJ0VNT19Mb3ZlJywgY2F0ZWdvcnk6ICdFTU8nLCBsYWJlbDogJ0xvdmUnIH0sXG4gIHsgaWQ6ICdFTU9fTG9uZ2luZycsIGNhdGVnb3J5OiAnRU1PJywgbGFiZWw6ICdMb25naW5nJyB9LFxuICB7IGlkOiAnRU1PX0FueGlldHknLCBjYXRlZ29yeTogJ0VNTycsIGxhYmVsOiAnQW54aWV0eScgfSxcbiAgeyBpZDogJ0VNT19Xb25kZXInLCBjYXRlZ29yeTogJ0VNTycsIGxhYmVsOiAnV29uZGVyJyB9LFxuICB7IGlkOiAnRU1PX1BlYWNlJywgY2F0ZWdvcnk6ICdFTU8nLCBsYWJlbDogJ1BlYWNlJyB9LFxuICB7IGlkOiAnRU1PX0dyaWVmJywgY2F0ZWdvcnk6ICdFTU8nLCBsYWJlbDogJ0dyaWVmJyB9LFxuICB7IGlkOiAnRU1PX0dyYXRpdHVkZScsIGNhdGVnb3J5OiAnRU1PJywgbGFiZWw6ICdHcmF0aXR1ZGUnIH0sXG4gIHsgaWQ6ICdQSElMX1N1ZmlzbScsIGNhdGVnb3J5OiAnUEhJTCcsIGxhYmVsOiAnU3VmaXNtJyB9LFxuICB7IGlkOiAnUEhJTF9FeGlzdGVudGlhbGlzbScsIGNhdGVnb3J5OiAnUEhJTCcsIGxhYmVsOiAnRXhpc3RlbnRpYWxpc20nIH0sXG4gIHsgaWQ6ICdQSElMX0J1ZGRoaXNtJywgY2F0ZWdvcnk6ICdQSElMJywgbGFiZWw6ICdCdWRkaGlzbScgfSxcbiAgeyBpZDogJ1BISUxfU3RvaWNpc20nLCBjYXRlZ29yeTogJ1BISUwnLCBsYWJlbDogJ1N0b2ljaXNtJyB9LFxuICB7IGlkOiAnQ09HX01ldGFwaG9yaWNhbCcsIGNhdGVnb3J5OiAnQ09HJywgbGFiZWw6ICdNZXRhcGhvcmljYWwnIH0sXG4gIHsgaWQ6ICdDT0dfQWJzdHJhY3QnLCBjYXRlZ29yeTogJ0NPRycsIGxhYmVsOiAnQWJzdHJhY3QnIH0sXG4gIHsgaWQ6ICdDT0dfUGFyYWRveGljYWwnLCBjYXRlZ29yeTogJ0NPRycsIGxhYmVsOiAnUGFyYWRveGljYWwnIH0sXG4gIHsgaWQ6ICdQRVJTX09wZW5uZXNzJywgY2F0ZWdvcnk6ICdQRVJTJywgbGFiZWw6ICdPcGVubmVzcycgfSxcbiAgeyBpZDogJ1BFUlNfQ3JlYXRpdml0eScsIGNhdGVnb3J5OiAnUEVSUycsIGxhYmVsOiAnQ3JlYXRpdml0eScgfSxcbiAgeyBpZDogJ0JSQUlOX0RNTicsIGNhdGVnb3J5OiAnQlJBSU4nLCBsYWJlbDogJ0RlZmF1bHQgTW9kZSBOZXR3b3JrJyB9LFxuICB7IGlkOiAnQlJBSU5fQW15Z2RhbGEnLCBjYXRlZ29yeTogJ0JSQUlOJywgbGFiZWw6ICdBbXlnZGFsYScgfSxcbl07XG5cbmNvbnN0IENBVF9DT0xPUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIEVNTzogJyNEODVBMzAnLFxuICBQSElMOiAnIzdGNzdERCcsXG4gIENPRzogJyMxRDlFNzUnLFxuICBQRVJTOiAnIzYzOTkyMicsXG4gIEJSQUlOOiAnIzM3OEFERCcsXG59O1xuXG5pbnRlcmZhY2UgRGltZW5zaW9uIHtcbiAgaWQ6IHN0cmluZztcbiAgY2F0ZWdvcnk6IHN0cmluZztcbiAgbGFiZWw6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFNjb3JlRW50cnkge1xuICBub3RlVGl0bGU6IHN0cmluZztcbiAgbm90ZVBhdGg6IHN0cmluZztcbiAgdGltZXN0YW1wOiBudW1iZXI7XG4gIHNjb3JlczogUmVjb3JkPHN0cmluZywgbnVtYmVyPjtcbiAgbmV3RGltZW5zaW9uczogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBXSUNEYXRhIHtcbiAgZW50cmllczogU2NvcmVFbnRyeVtdO1xuICBkaW1lbnNpb25zOiBEaW1lbnNpb25bXTtcbn1cblxuaW50ZXJmYWNlIFdJQ1NldHRpbmdzIHtcbiAgYXBpS2V5OiBzdHJpbmc7XG4gIG1vZGVsOiBzdHJpbmc7XG4gIGRpbWVuc2lvbnM6IERpbWVuc2lvbltdO1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBXSUNTZXR0aW5ncyA9IHtcbiAgYXBpS2V5OiAnJyxcbiAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gIGRpbWVuc2lvbnM6IERFRkFVTFRfRElNRU5TSU9OUyxcbn07XG5cbmZ1bmN0aW9uIGdldFRyZW5kKGVudHJpZXM6IFNjb3JlRW50cnlbXSwgZGltSWQ6IHN0cmluZyk6ICd1cCcgfCAnZG93bicgfCAnc3RhYmxlJyB8ICdub25lJyB7XG4gIGNvbnN0IHJlbGV2YW50ID0gZW50cmllcy5maWx0ZXIoZSA9PiBlLnNjb3Jlc1tkaW1JZF0gIT09IHVuZGVmaW5lZCkuc2xpY2UoLTUpO1xuICBpZiAocmVsZXZhbnQubGVuZ3RoIDwgMikgcmV0dXJuICdub25lJztcbiAgY29uc3QgcmVjZW50ID0gcmVsZXZhbnQuc2xpY2UoLTIpO1xuICBjb25zdCBkaWZmID0gcmVjZW50WzFdLnNjb3Jlc1tkaW1JZF0gLSByZWNlbnRbMF0uc2NvcmVzW2RpbUlkXTtcbiAgaWYgKGRpZmYgPiAwLjgpIHJldHVybiAndXAnO1xuICBpZiAoZGlmZiA8IC0wLjgpIHJldHVybiAnZG93bic7XG4gIHJldHVybiAnc3RhYmxlJztcbn1cblxuY2xhc3MgV0lDVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcGx1Z2luOiBXSUNQbHVnaW47XG4gIGN1cnJlbnRTY29yZXM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgY3VycmVudFRpdGxlOiBzdHJpbmcgPSAnJztcbiAgbmV3RGltZW5zaW9uczogc3RyaW5nW10gPSBbXTtcbiAgaXNMb2FkaW5nOiBib29sZWFuID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBXSUNQbHVnaW4pIHtcbiAgICBzdXBlcihsZWFmKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7IHJldHVybiBXSUNfVklFV19UWVBFOyB9XG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7IHJldHVybiAnVy5JLkMnOyB9XG4gIGdldEljb24oKTogc3RyaW5nIHsgcmV0dXJuICdicmFpbic7IH1cblxuICBhc3luYyBvbk9wZW4oKSB7IHRoaXMucmVuZGVyKCk7IH1cbiAgYXN5bmMgb25DbG9zZSgpIHt9XG5cbiAgcmVuZGVyKCkge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV0gYXMgSFRNTEVsZW1lbnQ7XG4gICAgY29udGFpbmVyLmVtcHR5KCk7XG4gICAgY29udGFpbmVyLmFkZENsYXNzKCd3aWMtcGFuZWwnKTtcblxuICAgIGNvbnN0IGhlYWRlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ3dpYy1oZWFkZXInKTtcbiAgICBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ3dpYy10aXRsZScsIHRleHQ6ICdXLkkuQycgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICd3aWMtdmVyc2lvbicsIHRleHQ6ICdFeENvbVMnIH0pO1xuXG4gICAgaWYgKHRoaXMubmV3RGltZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBiYW5uZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KCd3aWMtbmV3LWRpbS1iYW5uZXInKTtcbiAgICAgIGJhbm5lci5zZXRUZXh0KCdcdTI3MjYgTmV3IGRpbWVuc2lvbiBkZXRlY3RlZDogJyArIHRoaXMubmV3RGltZW5zaW9ucy5qb2luKCcsICcpICsgJyBcdTIwMTQgYWRkZWQgdG8geW91ciBuZXR3b3JrJyk7XG4gICAgfVxuXG4gICAgY29uc3QgYnRuID0gY29udGFpbmVyLmNyZWF0ZUVsKCdidXR0b24nLCB7XG4gICAgICBjbHM6ICd3aWMtYW5hbHlzZS1idG4nLFxuICAgICAgdGV4dDogdGhpcy5pc0xvYWRpbmcgPyAnQW5hbHlzaW5nLi4uJyA6ICdBbmFseXNlIHRoaXMgbm90ZScsXG4gICAgfSk7XG4gICAgYnRuLmRpc2FibGVkID0gdGhpcy5pc0xvYWRpbmc7XG4gICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5hbmFseXNlQWN0aXZlTm90ZSgpO1xuXG4gICAgY29uc3Qgc3RhdHVzID0gY29udGFpbmVyLmNyZWF0ZURpdignd2ljLXN0YXR1cycpO1xuICAgIGlmICh0aGlzLmN1cnJlbnRUaXRsZSkge1xuICAgICAgc3RhdHVzLnNldFRleHQodGhpcy5jdXJyZW50VGl0bGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0dXMuc2V0VGV4dCgnT3BlbiBhIG5vdGUgYW5kIGNsaWNrIEFuYWx5c2UnKTtcbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy5jdXJyZW50U2NvcmVzKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnRhaW5lci5jcmVhdGVEaXYoe1xuICAgICAgICBjbHM6ICd3aWMtZW1wdHknLFxuICAgICAgICB0ZXh0OiAnTm8gc2NvcmVzIHlldC4gT3BlbiBhbnkgZGlhcnkgZW50cnksIHBvZW0gb3Igbm90ZSBhbmQgY2xpY2sgQW5hbHlzZS4nLFxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2F0ZWdvcmllcyA9IFsuLi5uZXcgU2V0KHRoaXMucGx1Z2luLnNldHRpbmdzLmRpbWVuc2lvbnMubWFwKGQgPT4gZC5jYXRlZ29yeSkpXTtcblxuICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXQgPT4ge1xuICAgICAgY29uc3QgZGltcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRpbWVuc2lvbnMuZmlsdGVyKGQgPT4gZC5jYXRlZ29yeSA9PT0gY2F0KTtcbiAgICAgIGNvbnN0IHNjb3JlZCA9IGRpbXMuZmlsdGVyKGQgPT4gdGhpcy5jdXJyZW50U2NvcmVzW2QuaWRdICE9PSB1bmRlZmluZWQpO1xuICAgICAgaWYgKHNjb3JlZC5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgICAgY29uc3QgY2F0RGl2ID0gY29udGFpbmVyLmNyZWF0ZURpdignd2ljLWNhdGVnb3J5Jyk7XG4gICAgICBjYXREaXYuY3JlYXRlRGl2KHsgY2xzOiAnd2ljLWNhdC1sYWJlbCcsIHRleHQ6IGNhdCB9KTtcblxuICAgICAgc2NvcmVkLmZvckVhY2goZGltID0+IHtcbiAgICAgICAgY29uc3Qgc2NvcmUgPSB0aGlzLmN1cnJlbnRTY29yZXNbZGltLmlkXSB8fCAwO1xuICAgICAgICBjb25zdCB0cmVuZCA9IGdldFRyZW5kKHRoaXMucGx1Z2luLndpY0RhdGEuZW50cmllcywgZGltLmlkKTtcbiAgICAgICAgY29uc3QgaXNOZXcgPSB0aGlzLm5ld0RpbWVuc2lvbnMuaW5jbHVkZXMoZGltLmlkKTtcblxuICAgICAgICBjb25zdCBkaW1EaXYgPSBjYXREaXYuY3JlYXRlRGl2KCd3aWMtZGltZW5zaW9uJyk7XG4gICAgICAgIGNvbnN0IHJvdyA9IGRpbURpdi5jcmVhdGVEaXYoJ3dpYy1kaW0tcm93Jyk7XG5cbiAgICAgICAgY29uc3QgbmFtZVNwYW4gPSByb3cuY3JlYXRlU3Bhbih7IGNsczogJ3dpYy1kaW0tbmFtZScsIHRleHQ6IGRpbS5sYWJlbCB9KTtcbiAgICAgICAgaWYgKGlzTmV3KSB7XG4gICAgICAgICAgbmFtZVNwYW4uY3JlYXRlU3Bhbih7IGNsczogJ3dpYy1uZXctYmFkZ2UnLCB0ZXh0OiAnbmV3JyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgY2xzOiAnd2ljLWRpbS1zY29yZScsIHRleHQ6IHNjb3JlLnRvRml4ZWQoMSkgfSk7XG5cbiAgICAgICAgY29uc3QgdHJlbmRTcGFuID0gcm93LmNyZWF0ZVNwYW4oeyBjbHM6ICd3aWMtZGltLXRyZW5kJyB9KTtcbiAgICAgICAgaWYgKHRyZW5kID09PSAndXAnKSB7XG4gICAgICAgICAgdHJlbmRTcGFuLnNldFRleHQoJ1x1MjE5MScpO1xuICAgICAgICAgIHRyZW5kU3Bhbi5hZGRDbGFzcygnd2ljLXRyZW5kLXVwJyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJlbmQgPT09ICdkb3duJykge1xuICAgICAgICAgIHRyZW5kU3Bhbi5zZXRUZXh0KCdcdTIxOTMnKTtcbiAgICAgICAgICB0cmVuZFNwYW4uYWRkQ2xhc3MoJ3dpYy10cmVuZC1kb3duJyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJlbmQgPT09ICdzdGFibGUnKSB7XG4gICAgICAgICAgdHJlbmRTcGFuLnNldFRleHQoJ1x1MjE5MicpO1xuICAgICAgICAgIHRyZW5kU3Bhbi5hZGRDbGFzcygnd2ljLXRyZW5kLXN0YWJsZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdHJhY2sgPSBkaW1EaXYuY3JlYXRlRGl2KCd3aWMtYmFyLXRyYWNrJyk7XG4gICAgICAgIGNvbnN0IGZpbGwgPSB0cmFjay5jcmVhdGVEaXYoJ3dpYy1iYXItZmlsbCcpO1xuICAgICAgICBmaWxsLnN0eWxlLndpZHRoID0gKHNjb3JlICogMTApICsgJyUnO1xuICAgICAgICBmaWxsLnN0eWxlLmJhY2tncm91bmQgPSBDQVRfQ09MT1JTW2NhdF0gfHwgJyM4ODgnO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBzZXRMb2FkaW5nKGxvYWRpbmc6IGJvb2xlYW4pIHtcbiAgICB0aGlzLmlzTG9hZGluZyA9IGxvYWRpbmc7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHNldFNjb3Jlcyh0aXRsZTogc3RyaW5nLCBzY29yZXM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4sIG5ld0RpbXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5jdXJyZW50VGl0bGUgPSB0aXRsZTtcbiAgICB0aGlzLmN1cnJlbnRTY29yZXMgPSBzY29yZXM7XG4gICAgdGhpcy5uZXdEaW1lbnNpb25zID0gbmV3RGltcztcbiAgICB0aGlzLmlzTG9hZGluZyA9IGZhbHNlO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV0lDUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFdJQ1NldHRpbmdzO1xuICB3aWNEYXRhOiBXSUNEYXRhID0geyBlbnRyaWVzOiBbXSwgZGltZW5zaW9uczogW10gfTtcblxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICBhd2FpdCB0aGlzLmxvYWRXSUNEYXRhKCk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhXSUNfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IFdJQ1ZpZXcobGVhZiwgdGhpcykpO1xuXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdicmFpbicsICdFeENvbVMgVy5JLkMnLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ2FuYWx5c2Utbm90ZScsXG4gICAgICBuYW1lOiAnQW5hbHlzZSB0aGlzIG5vdGUnLFxuICAgICAgZWRpdG9yQ2FsbGJhY2s6ICgpID0+IHRoaXMuYW5hbHlzZUFjdGl2ZU5vdGUoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4td2ljLXBhbmVsJyxcbiAgICAgIG5hbWU6ICdPcGVuIFcuSS5DIHBhbmVsJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBXSUNTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZVZpZXcoKTtcbiAgfVxuXG4gIGFzeW5jIG9udW5sb2FkKCkge1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoV0lDX1ZJRVdfVFlQRSk7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZVZpZXcoKSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgIHRyeSB7XG4gICAgICBsZXQgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoV0lDX1ZJRVdfVFlQRSlbMF07XG4gICAgICBpZiAoIWxlYWYpIHtcbiAgICAgICAgYXdhaXQgd29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgbmV3TGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xuICAgICAgICAgICAgaWYgKCFuZXdMZWFmKSBuZXdMZWFmID0gd29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XG4gICAgICAgICAgICBpZiAobmV3TGVhZikge1xuICAgICAgICAgICAgICBhd2FpdCBuZXdMZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFdJQ19WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgd29ya3NwYWNlLnJldmVhbExlYWYobmV3TGVhZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnV0lDOiBjb3VsZCBub3Qgb3BlbiBwYW5lbCBhdXRvbWF0aWNhbGx5LCB1c2UgcmliYm9uIGljb24nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLmxvZygnV0lDOiBhY3RpdmF0ZVZpZXcgZXJyb3InLCBlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBhbmFseXNlQWN0aXZlTm90ZSgpIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYXBpS2V5KSB7IG5ldyBOb3RpY2UoJ1BsZWFzZSBhZGQgeW91ciBPcGVuQUkgQVBJIGtleSBpbiBXLkkuQyBzZXR0aW5ncycpOyByZXR1cm47IH1cblxuICAgIGNvbnN0IGFjdGl2ZUxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuYWN0aXZlTGVhZjtcbiAgICBpZiAoIWFjdGl2ZUxlYWYpIHsgbmV3IE5vdGljZSgnUGxlYXNlIG9wZW4gYSBub3RlIGZpcnN0Jyk7IHJldHVybjsgfVxuXG4gICAgbGV0IGNvbnRlbnQgPSAnJztcbiAgICBsZXQgdGl0bGUgPSAnVW50aXRsZWQnO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSBhY3RpdmVMZWFmLnZpZXcgYXMgYW55O1xuICAgICAgdGl0bGUgPSBhY3RpdmVWaWV3Py5maWxlPy5iYXNlbmFtZSB8fCBhY3RpdmVWaWV3Py5nZXREaXNwbGF5VGV4dCgpIHx8ICdVbnRpdGxlZCc7XG5cbiAgICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSBhY3RpdmVWaWV3Py5maWxlIHx8IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgICBpZiAoYWN0aXZlRmlsZSkge1xuICAgICAgICBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChhY3RpdmVGaWxlKTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aXZlVmlldz8uZWRpdG9yKSB7XG4gICAgICAgIGNvbnRlbnQgPSBhY3RpdmVWaWV3LmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmVWaWV3Py5kYXRhKSB7XG4gICAgICAgIGNvbnRlbnQgPSBhY3RpdmVWaWV3LmRhdGE7XG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBuZXcgTm90aWNlKCdDb3VsZCBub3QgcmVhZCBub3RlIFx1MjAxNCBwbGVhc2UgY2xpY2sgaW50byB0aGUgbm90ZSB0ZXh0IGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICBuZXcgTm90aWNlKCdOb3RlIGFwcGVhcnMgZW1wdHknKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY29udGVudC50cmltKCkubGVuZ3RoIDwgNTApIHtcbiAgICAgIG5ldyBOb3RpY2UoJ05vdGUgaXMgdG9vIHNob3J0IHRvIGFuYWx5c2UgXHUyMDE0IGFkZCBtb3JlIHdyaXRpbmcgZmlyc3QnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB3aWNWaWV3ID0gdGhpcy5nZXRXSUNWaWV3KCk7XG4gICAgaWYgKHdpY1ZpZXcgJiYgdHlwZW9mIHdpY1ZpZXcuc2V0TG9hZGluZyA9PT0gJ2Z1bmN0aW9uJykgd2ljVmlldy5zZXRMb2FkaW5nKHRydWUpO1xuICAgIG5ldyBOb3RpY2UoJ1cuSS5DIGlzIGFuYWx5c2luZyB5b3VyIHdyaXRpbmcuLi4nKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzY29yZXMgPSBhd2FpdCB0aGlzLmNhbGxPcGVuQUkoY29udGVudCwgdGl0bGUpO1xuICAgICAgY29uc3QgbmV3RGltcyA9IHRoaXMuZGV0ZWN0TmV3RGltZW5zaW9ucyhzY29yZXMpO1xuXG4gICAgICBjb25zdCBlbnRyeTogU2NvcmVFbnRyeSA9IHtcbiAgICAgICAgbm90ZVRpdGxlOiB0aXRsZSxcbiAgICAgICAgbm90ZVBhdGg6IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk/LnBhdGggfHwgJycsXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgICAgc2NvcmVzLFxuICAgICAgICBuZXdEaW1lbnNpb25zOiBuZXdEaW1zLFxuICAgICAgfTtcblxuICAgICAgdGhpcy53aWNEYXRhLmVudHJpZXMucHVzaChlbnRyeSk7XG4gICAgICBhd2FpdCB0aGlzLnNhdmVXSUNEYXRhKCk7XG5cbiAgICAgIGlmICh3aWNWaWV3KSB3aWNWaWV3LnNldFNjb3Jlcyh0aXRsZSwgc2NvcmVzLCBuZXdEaW1zKTtcblxuICAgICAgaWYgKG5ld0RpbXMubGVuZ3RoID4gMCkge1xuICAgICAgICBuZXcgTm90aWNlKCdcdTI3MjYgTmV3IGRpbWVuc2lvbiBkZXRlY3RlZDogJyArIG5ld0RpbXMuam9pbignLCAnKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXcgTm90aWNlKCdBbmFseXNpcyBjb21wbGV0ZScpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBjb25zdCB3aWNWaWV3RXJyID0gdGhpcy5nZXRXSUNWaWV3KCk7XG4gICAgICBpZiAod2ljVmlld0Vycikgd2ljVmlld0Vyci5zZXRMb2FkaW5nKGZhbHNlKTtcbiAgICAgIG5ldyBOb3RpY2UoJ0FuYWx5c2lzIGZhaWxlZDogJyArIGVyci5tZXNzYWdlKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1dJQyBFcnJvcjonLCBlcnIpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNhbGxPcGVuQUkoY29udGVudDogc3RyaW5nLCB0aXRsZTogc3RyaW5nKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PiB7XG4gICAgY29uc3QgZGltTGlzdCA9IHRoaXMuc2V0dGluZ3MuZGltZW5zaW9ucy5tYXAoZCA9PiBkLmlkICsgJyAoJyArIGQubGFiZWwgKyAnKScpLmpvaW4oJ1xcbicpO1xuXG4gICAgY29uc3QgcHJvbXB0ID0gJ1lvdSBhcmUgYW5hbHlzaW5nIGEgcGVyc29uYWwgd3JpdGluZyBmb3IgRXhDb21TIFcuSS5DIFx1MjAxNCBhIHdyaXRpbmcgaW50ZWxsaWdlbmNlIHRvb2wuXFxuXFxuJyArXG4gICAgICAnQW5hbHlzZSB0aGUgZm9sbG93aW5nIHdyaXRpbmcgYW5kIHNjb3JlIGVhY2ggZGltZW5zaW9uIGZyb20gMC4wIHRvIDEwLjAuXFxuJyArXG4gICAgICAnQSBzY29yZSBvZiAwIG1lYW5zIGNvbXBsZXRlbHkgYWJzZW50LiBBIHNjb3JlIG9mIDEwIG1lYW5zIGV4dHJlbWVseSBzdHJvbmdseSBwcmVzZW50LlxcbicgK1xuICAgICAgJ0JlIHByZWNpc2UgYW5kIGhvbmVzdCBcdTIwMTQgbW9zdCBkaW1lbnNpb25zIHdpbGwgc2NvcmUgYmV0d2VlbiAwIGFuZCA2IGZvciB0eXBpY2FsIHdyaXRpbmcuXFxuJyArXG4gICAgICAnT25seSBzY29yZSA4LTEwIGZvciBkaW1lbnNpb25zIHRoYXQgYXJlIHVubWlzdGFrYWJseSBkb21pbmFudC5cXG5cXG4nICtcbiAgICAgICdEaW1lbnNpb25zIHRvIHNjb3JlOlxcbicgKyBkaW1MaXN0ICsgJ1xcblxcbicgK1xuICAgICAgJ1dyaXRpbmcgdGl0bGU6IFwiJyArIHRpdGxlICsgJ1wiXFxuJyArXG4gICAgICAnV3JpdGluZyBjb250ZW50Olxcbi0tLVxcbicgKyBjb250ZW50LnNsaWNlKDAsIDMwMDApICsgJ1xcbi0tLVxcblxcbicgK1xuICAgICAgJ1Jlc3BvbmQgd2l0aCBPTkxZIGEgdmFsaWQgSlNPTiBvYmplY3QgbGlrZSB0aGlzIGV4YW1wbGU6XFxuJyArXG4gICAgICAne1wiRU1PX0xvdmVcIjogNy4yLCBcIkVNT19Mb25naW5nXCI6IDUuMSwgXCJQSElMX1N1ZmlzbVwiOiA4LjR9XFxuXFxuJyArXG4gICAgICAnSW5jbHVkZSBBTEwgZGltZW5zaW9ucyBpbiB0aGUgcmVzcG9uc2UsIGV2ZW4gaWYgc2NvcmVkIDAuXFxuJyArXG4gICAgICAnTm8gZXhwbGFuYXRpb24sIG5vIG1hcmtkb3duLCBqdXN0IHRoZSBKU09OIG9iamVjdC4nO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MS9jaGF0L2NvbXBsZXRpb25zJywge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBdXRob3JpemF0aW9uJzogJ0JlYXJlciAnICsgdGhpcy5zZXR0aW5ncy5hcGlLZXksXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbDogdGhpcy5zZXR0aW5ncy5tb2RlbCxcbiAgICAgICAgbWVzc2FnZXM6IFt7IHJvbGU6ICd1c2VyJywgY29udGVudDogcHJvbXB0IH1dLFxuICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxuICAgICAgICBtYXhfdG9rZW5zOiA1MDAsXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIGNvbnN0IGVyciA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihlcnIuZXJyb3I/Lm1lc3NhZ2UgfHwgJ0FQSSBlcnJvciAnICsgcmVzcG9uc2Uuc3RhdHVzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IHJhdyA9IGRhdGEuY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQudHJpbSgpO1xuICAgIGNvbnN0IGNsZWFuZWQgPSByYXcucmVwbGFjZSgvYGBganNvbnxgYGAvZywgJycpLnRyaW0oKTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShjbGVhbmVkKTtcbiAgfVxuXG4gIGRldGVjdE5ld0RpbWVuc2lvbnMoc2NvcmVzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHByZXZpb3VzbHlTY29yZWQgPSBuZXcgU2V0KFxuICAgICAgdGhpcy53aWNEYXRhLmVudHJpZXMuZmxhdE1hcChlID0+IE9iamVjdC5rZXlzKGUuc2NvcmVzKSlcbiAgICApO1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY29yZXMpLmZpbHRlcihcbiAgICAgIGlkID0+IHNjb3Jlc1tpZF0gPiA0ICYmICFwcmV2aW91c2x5U2NvcmVkLmhhcyhpZClcbiAgICApO1xuICB9XG5cbiAgZ2V0V0lDVmlldygpOiBXSUNWaWV3IHwgbnVsbCB7XG4gICAgY29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoV0lDX1ZJRVdfVFlQRSlbMF07XG4gICAgcmV0dXJuIGxlYWYgPyAobGVhZi52aWV3IGFzIFdJQ1ZpZXcpIDogbnVsbDtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICBjb25zdCBzYXZlZCA9IGF3YWl0IHRoaXMubG9hZERhdGEoKTtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgc2F2ZWQpO1xuICAgIGlmICghdGhpcy5zZXR0aW5ncy5kaW1lbnNpb25zIHx8IHRoaXMuc2V0dGluZ3MuZGltZW5zaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZGltZW5zaW9ucyA9IERFRkFVTFRfRElNRU5TSU9OUztcbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRXSUNEYXRhKCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFdJQ19EQVRBX0ZJTEUpO1xuICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICBjb25zdCByYXcgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICB0aGlzLndpY0RhdGEgPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLndpY0RhdGEgPSB7IGVudHJpZXM6IFtdLCBkaW1lbnNpb25zOiBbXSB9O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNhdmVXSUNEYXRhKCkge1xuICAgIGNvbnN0IHJhdyA9IEpTT04uc3RyaW5naWZ5KHRoaXMud2ljRGF0YSwgbnVsbCwgMik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoV0lDX0RBVEFfRklMRSk7XG4gICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCByYXcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKFdJQ19EQVRBX0ZJTEUsIHJhdyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcignV0lDOiBjb3VsZCBub3Qgc2F2ZSBkYXRhJywgZSk7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFdJQ1NldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBXSUNQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogV0lDUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdFeENvbVMgVy5JLkMgU2V0dGluZ3MnIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge1xuICAgICAgdGV4dDogJ1dyaXRpbmcgSW50ZWxsaWdlbmNlIENvbXBhbmlvbiBcdTIwMTQgeW91ciB3cml0aW5nLCB1bmRlcnN0b29kLicsXG4gICAgICBjbHM6ICdzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb24nXG4gICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdPcGVuQUkgQVBJIEtleScpXG4gICAgICAuc2V0RGVzYygnWW91ciBPcGVuQUkgQVBJIGtleS4gRmluZCBpdCBhdCBwbGF0Zm9ybS5vcGVuYWkuY29tLiBOZXZlciBzaGFyZWQgb3Igc3RvcmVkIGV4dGVybmFsbHkuJylcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ3NrLS4uLicpXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlLZXkpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlLZXkgPSB2YWx1ZS50cmltKCk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ01vZGVsJylcbiAgICAgIC5zZXREZXNjKCdncHQtNG8tbWluaSBpcyBmYXN0IGFuZCBhZmZvcmRhYmxlLiBncHQtNG8gaXMgbW9yZSBhY2N1cmF0ZSBmb3IgY29tcGxleCBvciBzdWJ0bGUgd3JpdGluZy4nKVxuICAgICAgLmFkZERyb3Bkb3duKGRyb3AgPT4gZHJvcFxuICAgICAgICAuYWRkT3B0aW9uKCdncHQtNG8tbWluaScsICdHUFQtNG8gTWluaSAocmVjb21tZW5kZWQpJylcbiAgICAgICAgLmFkZE9wdGlvbignZ3B0LTRvJywgJ0dQVC00byAobW9yZSBhY2N1cmF0ZSknKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubW9kZWwpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdZb3VyIERpbWVuc2lvbnMnIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge1xuICAgICAgdGV4dDogdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGltZW5zaW9ucy5sZW5ndGggKyAnIGRpbWVuc2lvbnMgYWN0aXZlLiBFZGl0IGxhYmVscyBvciByZW1vdmUgZGltZW5zaW9ucyB0byBwZXJzb25hbGlzZSB5b3VyIHRheG9ub215LicsXG4gICAgICBjbHM6ICdzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb24nXG4gICAgfSk7XG5cbiAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kaW1lbnNpb25zLmZvckVhY2goKGRpbSwgaW5kZXgpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShkaW0uaWQpXG4gICAgICAgIC5zZXREZXNjKCdDYXRlZ29yeTogJyArIGRpbS5jYXRlZ29yeSlcbiAgICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgICAgLnNldFZhbHVlKGRpbS5sYWJlbClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kaW1lbnNpb25zW2luZGV4XS5sYWJlbCA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSkpXG4gICAgICAgIC5hZGRCdXR0b24oYnRuID0+IGJ0blxuICAgICAgICAgIC5zZXRCdXR0b25UZXh0KCdSZW1vdmUnKVxuICAgICAgICAgIC5zZXRXYXJuaW5nKClcbiAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kaW1lbnNpb25zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICAgIH0pKTtcbiAgICB9KTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFBNkc7QUFFN0csSUFBTSxnQkFBZ0I7QUFDdEIsSUFBTSxnQkFBZ0I7QUFFdEIsSUFBTSxxQkFBcUI7QUFBQSxFQUN6QixFQUFFLElBQUksWUFBWSxVQUFVLE9BQU8sT0FBTyxPQUFPO0FBQUEsRUFDakQsRUFBRSxJQUFJLGVBQWUsVUFBVSxPQUFPLE9BQU8sVUFBVTtBQUFBLEVBQ3ZELEVBQUUsSUFBSSxlQUFlLFVBQVUsT0FBTyxPQUFPLFVBQVU7QUFBQSxFQUN2RCxFQUFFLElBQUksY0FBYyxVQUFVLE9BQU8sT0FBTyxTQUFTO0FBQUEsRUFDckQsRUFBRSxJQUFJLGFBQWEsVUFBVSxPQUFPLE9BQU8sUUFBUTtBQUFBLEVBQ25ELEVBQUUsSUFBSSxhQUFhLFVBQVUsT0FBTyxPQUFPLFFBQVE7QUFBQSxFQUNuRCxFQUFFLElBQUksaUJBQWlCLFVBQVUsT0FBTyxPQUFPLFlBQVk7QUFBQSxFQUMzRCxFQUFFLElBQUksZUFBZSxVQUFVLFFBQVEsT0FBTyxTQUFTO0FBQUEsRUFDdkQsRUFBRSxJQUFJLHVCQUF1QixVQUFVLFFBQVEsT0FBTyxpQkFBaUI7QUFBQSxFQUN2RSxFQUFFLElBQUksaUJBQWlCLFVBQVUsUUFBUSxPQUFPLFdBQVc7QUFBQSxFQUMzRCxFQUFFLElBQUksaUJBQWlCLFVBQVUsUUFBUSxPQUFPLFdBQVc7QUFBQSxFQUMzRCxFQUFFLElBQUksb0JBQW9CLFVBQVUsT0FBTyxPQUFPLGVBQWU7QUFBQSxFQUNqRSxFQUFFLElBQUksZ0JBQWdCLFVBQVUsT0FBTyxPQUFPLFdBQVc7QUFBQSxFQUN6RCxFQUFFLElBQUksbUJBQW1CLFVBQVUsT0FBTyxP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
