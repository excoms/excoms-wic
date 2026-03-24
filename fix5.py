with open('main.ts', 'r') as f:
    content = f.read()

old = '''    } catch (err: any) {
      if (wicView) wicView.setLoading(false);
      new Notice('Analysis failed: ' + err.message);
      console.error('WIC Error:', err);
    }'''

new = '''    } catch (err: any) {
      const wicViewErr = this.getWICView();
      if (wicViewErr) wicViewErr.setLoading(false);
      new Notice('Analysis failed: ' + err.message);
      console.error('WIC Error:', err);
    }'''

if old in content:
    content = content.replace(old, new)
    with open('main.ts', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND - searching for actual catch block...')
    idx = content.find('Analysis failed')
    if idx > -1:
        print('Found at position', idx)
        print(repr(content[idx-200:idx+200]))
