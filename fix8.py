with open('main.ts', 'r') as f:
    content = f.read()

old = '''    const wicView = this.getWICView();
    if (wicView) wicView.setLoading(true);
    new Notice('W.I.C is analysing your writing...');'''

new = '''    const wicView = this.getWICView();
    if (wicView && typeof wicView.setLoading === 'function') wicView.setLoading(true);
    new Notice('W.I.C is analysing your writing...');'''

if old in content:
    content = content.replace(old, new)
    with open('main.ts', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
