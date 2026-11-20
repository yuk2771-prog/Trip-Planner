/* Trip Planner 오프라인 지원
   - 앱 파일(index.html, 아이콘 등)을 기기에 저장해 두고, 인터넷이 없으면 저장본으로 열기
   - 인터넷이 있으면 항상 최신 index.html을 먼저 받아서 업데이트가 바로 반영되게 함 (network-first)
   - 테마 글꼴(Google Fonts)은 한 번 받으면 기기에 저장해서 오프라인에서도 같은 글꼴로 보이게 함
   - 여행 데이터는 여기가 아니라 브라우저 localStorage / IndexedDB(사진)에 있음 */
const CACHE = 'trip-planner-v2';
const FONT_CACHE = 'trip-planner-fonts';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 글꼴: 저장본을 바로 쓰고, 인터넷이 되면 뒤에서 새로 받아 둠
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== location.origin) return;          // 환율 API 같은 외부 요청은 건드리지 않음

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isPage) {
    // 최신 페이지 우선, 실패하면(오프라인) 저장본
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // 아이콘 등: 저장본 우선
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
