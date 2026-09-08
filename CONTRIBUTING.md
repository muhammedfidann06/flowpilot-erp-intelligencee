# Katkı rehberi

## Kurulum

Node.js 22+ ve Python 3.10+ kullanın. `npm ci` kilit dosyasındaki test / biçimlendirme bağımlılıklarını kurar. Web istemcisinin çalışma zamanı npm gerektirmez.

## Değişiklik ilkeleri

1. Hesaplamayı `engine.js` içinde saf fonksiyon olarak tutun. UI'ya sabit KPI veya risk sonucu yazmayın.
2. Görünür metni `i18n.js` içindeki üç dile birlikte ekleyin. Özel adları çevirmeyin.
3. Kullanıcı / kayıt metnini HTML'e eklerken `e()` kaçışını kullanın. Dinamik metni ham HTML'e dönüştürmeyin.
4. Yeni kontrolün gerçek bir sonucu, boş / hata durumu ve klavye davranışı olmalı.
5. Tarihleri ISO tarih ve UTC ile değerlendirin. Gelir, sipariş ve teslimat dönem temellerini açık tutun.
6. Hesaplama, veri şeması veya gerçek kullanıcı akışı değişiyorsa davranışsal test ekleyin. Sadece CSS değişikliği için uygulamayı tekrar eden test üretmeyin.
7. Veri üretimi değiştiğinde `npm run generate` ile JSON ve analitik anlık sonuçları birlikte güncelleyin.
8. Yalnızca kökteki kaynakları düzenleyin. Her değişiklikten sonra `npm run build` çalıştırın; `dist/` ve `sw.js` üretilir. Kaynaklarla beraber güncel üretilen dosyaları da commit edin.
9. Gerçek müşteri / ERP verisi, `.env`, parola, token ve tarayıcı aksiyon notlarını commit etmeyin.

## Doğrulama

```bash
npm run format
npm run validate
npm test
python -m unittest discover -s tests -p 'test_*.py' -v
```

Ayrıca gerçek tarayıcıda dar ekran, %200 büyütme, Tab / Shift+Tab, Escape, sıralama, CSV açma ve uzun Almanca metinleri kontrol edin. Bu manuel liste otomatik testlerin yerine geçmez; UI motoru simülasyonu görsel doğrulama yapmaz.

## PR açıklaması

Sorunu, yapılan değişikliği, kullanıcıya etkisini ve uygulanan testleri açıklayın. Hesaplama varsayımı değiştiyse README'deki formülü de güncelleyin. “Production ready” gibi kapsamı aşan iddialardan kaçının. Üçüncü taraf katkılar MIT ile uyumlu olmalıdır.
