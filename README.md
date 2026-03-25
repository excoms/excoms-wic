# ExComS W.I.C — Writing Intelligence Companion

> Your writing, understood.

ExComS W.I.C is an Obsidian plugin that analyses your notes, diary entries, and poems using AI — and maps the neural landscape of your mind. Discover your emotional patterns, philosophical leanings, and cognitive tendencies through the words you already write.

## What it does

- **Analyses any note** with one click using OpenAI
- **Scores your writing** across personalised dimensions — emotions, philosophy, cognition, personality, and more
- **Tracks trends** over time — see which dimensions are rising, falling, or stable
- **Detects new dimensions** automatically as your writing evolves
- **Network visualisation** — a full-screen interactive graph showing how your dimensions relate to each other, powered by D3.js
- **Writings inclusion panel** — choose which analysed notes are included in the network, with persistent include/exclude state
- **Data management** — export backups, clear data, or fully reset from settings with automatic safety backups
- **Saves everything locally** — your data never leaves your vault without your permission

## How to use

1. Open any note — a diary entry, poem, or personal reflection
2. Click the **brain icon** in the left ribbon to open the W.I.C panel
3. Click **Analyse this note**
4. Your dimension scores appear instantly in the sidebar

## Network view

Click the **fork icon** in the left ribbon (or use the command "Open W.I.C Network") to open the network visualisation as a full-width tab.

- **Dimension nodes** sized by average score, coloured by category
- **Edges** show co-occurrence strength — dimensions that score high together are connected
- **Category filter chips** at the top to show/hide EMO, PHIL, COG, PERS, or BRAIN
- **Click any node** to see its score history across all analysed notes
- **Timeline scrubber** at the bottom to filter the graph by date range
- **Writings panel** — expand to see all analysed notes with checkboxes; uncheck a note to exclude it from the network. State persists in wic-data.json
- **Include in network toggle** in the sidebar panel to quickly include or exclude the current note

## Data management

Found in Settings → ExComS W.I.C under the Data Management section:

- **Export data** — saves a dated backup of wic-data.json to your vault root
- **Clear all data** — deletes all entries but keeps your dimension taxonomy. A backup is saved automatically before clearing
- **Full reset** — deletes all entries and resets dimensions to the 18 defaults. A backup is saved automatically before resetting

## Setup

1. Install the plugin from the Obsidian Community Plugins directory
2. Go to Settings → ExComS W.I.C
3. Enter your OpenAI API key (get one at platform.openai.com)
4. Choose your model — GPT-4o Mini is recommended for speed and cost

## Default dimensions

W.I.C comes with 18 starter dimensions across 5 categories:

- **EMO** — Love, Longing, Anxiety, Wonder, Peace, Grief, Gratitude
- **PHIL** — Sufism, Existentialism, Buddhism, Stoicism
- **COG** — Metaphorical, Abstract, Paradoxical
- **PERS** — Openness, Creativity
- **BRAIN** — Default Mode Network, Amygdala

You can edit, rename, or remove any dimension in Settings to build your own personal taxonomy.

## Privacy

Your raw writing is sent to OpenAI for analysis only when you click Analyse. No data is stored on external servers. All scores are saved locally in your vault as `wic-data.json`.

## Part of the ExComS Intelligence Suite

W.I.C is part of the ExComS Innovation Center suite of AI tools. Learn more at [excoms.ai](https://excoms.ai)

## Support

For questions or feedback: coding@excoms.com
