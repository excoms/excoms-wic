import re

with open('main.ts', 'r') as f:
    content = f.read()

old = '''  async analyseActiveNote() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) { new Notice('Please open a note first'); return; }
    if (!this.settings.apiKey) { new Notice('Please add your OpenAI API key in W.I.C settings'); return; }

    const content = view.editor.getValue();
    const title = view.file?.basename || 'Untitled';'''

new = '''  async analyseActiveNote() {
    if (!this.settings.apiKey) { new Notice('Please add your OpenAI API key in W.I.C settings'); return; }

    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) { new Notice('Please open a note first'); return; }

    const view = activeLeaf.view;
    if (!view || view.getViewType() !== 'markdown') { new Notice('Please open a markdown note first'); return; }

    const mdView = view as MarkdownView;
    const content = mdView.editor ? mdView.editor.getValue() : (mdView as any).data || '';
    const title = (view as any).file?.basename || activeLeaf.getDisplayText() || 'Untitled';

    if (!content || content.trim().length === 0) {
      new Notice('Note appears empty — please click into the note text first');
      return;
    }'''

if old in content:
    content = content.replace(old, new)
    with open('main.ts', 'w') as f:
        f.write(content)
    print('Fixed successfully')
else:
    print('Pattern not found - will try alternate approach')
