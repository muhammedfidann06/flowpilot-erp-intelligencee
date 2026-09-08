# PWA uygulama rehberi

## Amaç ve tasarım

Mülakatta bağlantı kesildiğinde demo ekranlarının açılabilmesini ve uygulamanın cihazdan bağımsız bir pencerede başlatılmasını sağlar. Çevrimdışı veriler sentetiktir; canlı ERP kaydı değildir.

`manifest.webmanifest`: ad, başlangıç adresi, kapsam, pencere modu ve ikonlar. `id`, `scope` ve `start_url` göreli tutulur; depo adı kodda sabitlenmez. `src/pwa.js` iş mantığından bağımsız, ayrı bir HTML bölgesinde durum ve kurulum kontrollerini yönetir. Dil değişimini özel olay ile dinler.

`scripts/sw-template.js`: service worker kaynağı. `npm run build` tüm yayın dosyalarının ve SW şablonunun SHA-256 özetinden bir sürüm belirler, `sw.js` üretir ve kamuya açık dosyaları `dist/` içine kopyalar. Kaynakları düzenledikten sonra build çalıştırmak zorunludur. ZIP hazır oluşturulduğu için ilk yayında Node gerekmez.

Kurulumda tüm dosyalar tek `cache.addAll` ile alınır; bir dosya yoksa yeni kurulum başarısız olur. Etkin sürüm yalnızca bilinen statik dosyaları ve giriş sayfasını cache-first sunar. API, başka alan adları, POST ve bilinmeyen dosyalar yakalanmaz. Önbellek adında tam service-worker kapsamı bulunur; başka projelerin önbellekleri silinmez. Yeni worker otomatik `skipWaiting` çağırmaz; kullanıcı açık formunu kaydedip güncellemeyi onaylar. İlk kurulum `clients.claim` ile sayfayı kontrol edebilir; kendiliğinden yenilemez.

İkonlar mevcut SVG marka işaretinden türetilmiştir. İsteğe bağlı yeniden üretim: Pillow kurulu Python ile `python scripts/icons.py`; sonra `npm run build`. Normal kurulumda Pillow gerekmez.

## Gerçek cihazda kontrol

1. HTTPS üzerinden siteyi aç; footer sürümü v1.1.0 olmalı.
2. Sayfa altındaki PWA bölümünü aç. “Çevrimdışı kullanım hazır” durumunu bekle. Bu hazır durum görünmeden bağlantıyı kesme.
3. Tarayıcı yükleme seçeneğini kullan. iPhone/iPad için Paylaş → Ana Ekrana Ekle. Menü görünürlüğü tarayıcıya bağlıdır.
4. İnterneti kapatıp aynı adresi veya kurulu uygulamayı yeniden aç. Ekranlar, demo verileri ve yerel aksiyonlar görünmeli. İnternet olmadan ilk kez kurulum yapılamaz.
5. Bağlantı geri geldiğinde yeni sürüm yayınla, uygulamayı yeniden aç; güncelleme bildirimi geldiğinde formunu kaydet ve onayla.

Bunlar tekrarlanabilir manuel adımlardır; fiziksel cihazlarda bu teslimat sırasında yapılmış testler olarak sunulmaz. Tarayıcı depolamasını temizlemek aksiyonları ve çevrimdışı verileri siler; normal güncelleme için bu işlem gerekli değildir.

## Başvuru kaynakları

- [MDN: PWA kurulabilirlik koşulları](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN: Service worker kullanımı](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

Kontrol tarihi: 8 Eylül 2026. HTTPS, manifest ve tarayıcı kurulum davranışı bu resmi teknik belgelerden kontrol edildi.
