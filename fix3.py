with open('main.ts', 'r') as f:
    content = f.read()

old = '''    try {
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
    }'''

new = '''    try {
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

if old in content:
    content = content.replace(old, new)
    with open('main.ts', 'w') as f:
        f.write(content)
    print('SUCCESS - fixed')
else:
    print('PATTERN NOT FOUND')
