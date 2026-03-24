with open('main.ts', 'r') as f:
    content = f.read()

old = '''    const activeLeaf = this.app.workspace.activeLeaf;
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

new = '''    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) { new Notice('Please open a note first'); return; }

    let content = '';
    let title = 'Untitled';

    try {
      const view = activeLeaf.view as any;
      title = view?.file?.basename || view?.getDisplayText() || 'Untitled';
      if (view?.editor) {
        content = view.editor.getValue();
      } else if (view?.data) {
        content = view.data;
      } else if (view?.currentMode?.get) {
        content = view.currentMode.get();
      } else {
        const file = view?.file;
        if (file) {
          content = await this.app.vault.read(file);
        }
      }
    } catch(e) {
      new Notice('Could not read note — please click into the note text and try again');
      return;
    }

    if (!content || content.trim().length === 0) {
      new Notice('Note appears empty');
      return;
    }'''

if old in content:
    content = content.replace(old, new)
    with open('main.ts', 'w') as f:
        f.write(content)
    print('SUCCESS - fixed')
else:
    print('PATTERN NOT FOUND')
