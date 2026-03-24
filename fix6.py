with open('main.ts', 'r') as f:
    content = f.read()

old = '''  async activateView() {
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

new = '''  async activateView() {
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
  }'''

if old in content:
    content = content.replace(old, new)
    with open('main.ts', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
    idx = content.find('activateView')
    print(repr(content[idx:idx+400]))
