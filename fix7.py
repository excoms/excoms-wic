with open('main.ts', 'r') as f:
    content = f.read()

old = '''      const entry: ScoreEntry = {
        noteTitle: title,
        notePath: view.file?.path || '',
        timestamp: Date.now(),
        scores,
        newDimensions: newDims,
      };'''

new = '''      const entry: ScoreEntry = {
        noteTitle: title,
        notePath: this.app.workspace.getActiveFile()?.path || '',
        timestamp: Date.now(),
        scores,
        newDimensions: newDims,
      };'''

if old in content:
    content = content.replace(old, new)
    with open('main.ts', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
