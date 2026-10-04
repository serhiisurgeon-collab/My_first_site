import argparse, json
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description='Local existing article pages; no cloud writes at startup')
parser.add_argument('--site-dir', required=True)
parser.add_argument('--web-config', help='Public config of serhii-comments-test; omit to use emulators')
parser.add_argument('--port', type=int, default=8133)
args = parser.parse_args()
site = Path(args.site_dir).resolve()
for name in ['article.html', 'en/article-en.html', 'js/comments/index.js', 'js/comments/api.js', 'js/comments/firebase-sdk.js', 'css/pages/comments.css', 'firebase/article-map.json']:
    if not (site / name).is_file():
        parser.error('Missing prepared site file: ' + name)
if args.web_config:
    data = json.loads(Path(args.web_config).read_text(encoding='utf-8-sig'))
    if data.get('projectId') != 'serhii-comments-test' or data.get('authDomain') != 'serhii-comments-test.firebaseapp.com':
        parser.error('Only serhii-comments-test config is allowed')
    for field in ['apiKey', 'appId']:
        if not isinstance(data.get(field), str) or not data[field].strip() or 'PASTE_' in data[field]:
            parser.error('Missing public web config field: ' + field)
    firebase = {key:data[key] for key in ['apiKey','appId','projectId','authDomain']}
    emulators = None
    mode = 'real test project; cloud enabled:false is respected'
else:
    firebase = {'apiKey':'demo-key','projectId':'demo-serhii-comments','authDomain':'demo-serhii-comments.firebaseapp.com'}
    emulators = {'auth':'http://127.0.0.1:9099','firestoreHost':'127.0.0.1','firestorePort':8080}
    mode = 'loopback Auth/Firestore emulators'
config = {'enabled':True,'firebase':firebase,'pageSize':20,'emulators':emulators}
module = ('export const commentsConfig = '+json.dumps(config)+';\n'
          "if (!['localhost','127.0.0.1'].includes(location.hostname)) { commentsConfig.enabled=false; commentsConfig.firebase=null; }\n").encode()
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == '/js/comments/config.js':
            self.send_response(200)
            self.send_header('Content-Type','application/javascript; charset=utf-8')
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(module)))
            self.end_headers()
            self.wfile.write(module)
        else:
            super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
print('Mode:', mode, flush=True)
print('UA: http://localhost:'+str(args.port)+'/article.html?article=how-kaolin-works', flush=True)
print('EN: http://localhost:'+str(args.port)+'/en/article-en.html?article=how-kaolin-works-en', flush=True)
print('Existing config.js is not edited; no Rules/settings writes at startup.',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(site))).serve_forever()
