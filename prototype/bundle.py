#!/usr/bin/env python3
"""Bundle the dependency-free Carter demo into one offline HTML file."""
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=Path(__file__).with_name('carter.html'))
args = parser.parse_args()
root = Path(__file__).resolve().parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '\n</style>')
for name in ('model.js', 'app.js'):
    script = (root / name).read_text().replace('</script', '<\\/script')
    html = html.replace('<script src="' + name + '"></script>', '<script>\n' + script + '\n</script>')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(html)
print('Wrote ' + str(args.output.resolve()))
