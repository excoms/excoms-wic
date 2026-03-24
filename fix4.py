with open('main.ts', 'r') as f:
    content = f.read()

# Fix 1: activateView null leaf crash
old1 = '''  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(WIC_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false) as WorkspaceLeaf;
      await leaf.setViewState({ type: WIC_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }'''

new1 = '''  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(WIC_VIEW_TYPE)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({ type: WIC_VIEW_TYPE, active: true });
      } else {
        leaf = workspace.getLeaf('split');
        await leaf.setViewState({ type: WIC_VIEW_TYPE, active: true });
      }
    }
    if (leaf) workspace.revealLeaf(leaf);
  }'''

# Fix 2: view is not defined - rename inner variable
old2 = '''    try {
      const view = activeLeaf.view as any;
      title = view?.file?.basename || view?.getDisplayText() || 'Untitled';

      const file = view?.file || this.app.workspace.getActiveFile();
      if (file) {
        content = await this.app.vault.read(file);
      } else if (view?.editor) {
        content = view.editor.getValue();
      } else if (view?.data) {
        content = view.data;
      }
    } catch(e) {
      new Notice('Could not read note — please click into the note text and try again');
      return;
    }'''

new2 = '''    try {
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
    }'''

fixed = 0
if old1 in content:
    content = content.replace(old1, new1)
    fixed += 1
    print('Fix 1 applied: activateView crash')
else:
    print('Fix 1 NOT FOUND')

if old2 in content:
    content = content.replace(old2, new2)
    fixed += 1
    print('Fix 2 applied: view variable conflict')
else:
    print('Fix 2 NOT FOUND')

if fixed > 0:
    with open('main.ts', 'w') as f:
        f.write(content)
    print(f'SUCCESS - {fixed} fixes applied')
