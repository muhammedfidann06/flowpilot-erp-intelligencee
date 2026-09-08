# FlowPilot v1.1.0 — Doğrulama raporu

Son paket kontrolü: **8 Eylül 2026**. Önceki kapsamlı tarayıcı incelemesi 7 Eylül; yayın düzeltmesi ve PWA arayüzü incelemesi 8 Eylül 2026’da yapıldı. Sentetik veri anlık tarihi 30 Eylül 2026'dır.

## Tekrarlanabilir otomatik testler

| Grup                               |    Adet | Kapsam                                                                                                                                                               |
| ---------------------------------- | ------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| İş mantığı ve veri                 |      12 | İlişkiler, adetler, OTD, sıfır talep, takvim, gelir tanıma, grafik mutabakatı, risk tutarı, filtreler, CSV, çeviriler, API analitik eşitliği                         |
| Veri sınırı ve güvenli yardımcılar |     166 | Eksik / bozuk koleksiyonlar, kimlikler, fiyatlar, miktarlar, tarihler, referanslar, teslimat bütünlüğü, CSV formül başlangıçları, güvenli aksiyon kimliği            |
| DOM etkileşimleri                  |      13 | 10 ekran × 3 dil, tablolar, filtreler, sütunlar, arama, aksiyon döngüsü, bildirim, dönem, sekme klavyesi, dialog etiketi, mobil menü, CSV boş değer, depolama hatası |
| Yükleme / kurtarma                 |       3 | HTTP hatası → tekrar dene → düzelme; bozuk veride hata ekranı; boş veriyle 10 ekran                                                                                  |
| Gerçek HTTP API                    |       4 | Kaynaklar, sayfalama, filtre, tekil kayıt, hatalı sorgu, 404, salt okunur yöntemler, health ve OpenAPI                                                               |
| PWA davranışı                      |      11 | Çevrimdışı shell/veri, kapsam izolasyonu, eksik önbellek, güncelleme onayı, diller, bağlantı ve kurulum olayları                                                     |
| Statik yayın HTTP                  |       4 | Kök ve dist × alan adı kökü ve depo alt yolu; gerçek dosya yanıtları, MIME ve 404                                                                                    |
| **Toplam**                         | **213** | Son pakette tümü geçti                                                                                                                                               |

Ayrıca `npm run validate`: JavaScript sözdizimi, kök / dist girişleri, göreli kaynak yolları, çeviri anahtarları, veri ilişkileri ve anlık tarih sınırları doğrulanır. Bunlar 213 sayısına dahil değildir. Testler aynı senaryonun 100 kez tekrarı değildir; farklı davranışları ve geçersiz girdileri kapsar.

```bash
npm ci
npm run build
npm run validate
npm test
python -m unittest discover -s tests -p 'test_*.py' -v
```

Node 24 ortamında çalıştırıldı; Node 22.12+ gereksinimi ve Node 22 CI yapılandırması sağlandı. Python testleri standart kütüphaneyi kullanır.

## Gerçek Chrome incelemesi

- Sekiz operasyon modülü gerçek tarayıcıda açıldı; masaüstü yerleşimi incelendi.
- Tedarikçi detayı, bağlı satın alma kayıtları, Escape ile kapatma ve tarayıcı geri gezinmesi doğrulandı.
- Risk → aksiyon oluştur → sorumlu / tarih / not / durum kaydet akışı tamamlandı. Yenileme sonrasında kayıt görünmeye devam etti.
- 390 px genişliğindeki gerçek tarayıcı iframe'inde responsive yerleşim, mobil menü, stok ekranı, yüksek risk filtresi ve Almanca / İngilizce seçimi denendi. Bu, fiziksel telefon testi değildir.
- `docs/screenshots/overview.jpg` gerçek uygulama ekran görüntüsüdür.

## Düzeltilen hatalar

1. Yerel HTTP'de `crypto.randomUUID` bulunmadığında aksiyon oluşturma duruyordu. `getRandomValues` ile 128 bit kimlik üretimine geçildi; tarayıcıda tekrar doğrulandı.
2. Gezinme her seferinde geçmişi değiştiriyor ve geri düğmesinin beklenen akışını bozuyordu. Ekran geçişleri geçmişe ekleniyor; geri / ileri olayları tekrar giriş üretmiyor.
3. Depolama hatası sonraki başarı bildirimiyle örtülebiliyordu. Kalıcı uyarı ve başarısız kayıt takibi eklendi.
4. Boş talep kapsamı CSV'ye `Infinity` çıkabiliyordu. Boş alan olarak aktarılıyor; sıralamada eksik değerler sona gidiyor.
5. Doğrulamada eksik fiyat, imkânsız takvim tarihi ve tutarsız teslimat ilişkileri geçebiliyordu. Katı şema / ilişki kontrolü eklendi.
6. Açık teslimat kayıtları doğrudan analitik yardımcıya verilirse OTD'yi şişirebiliyordu. Tamamlanmış teslimatlar ayrı filtreleniyor.
7. Şubat grafiğinde gereksiz 29–28 aralığı oluşabiliyordu. Hafta sayısı ayın gerçek uzunluğundan hesaplanıyor.
8. CSV'de boşlukla başlayan formül metinleri için koruma genişletildi.
9. Dialog erişilebilir adı, odak geri dönüşü ve kapalı mobil menünün klavye sırası düzeltildi.
10. Veri yükleme hatası, tekrar deneme ve tamamen boş veri ekranları ek testlerle doğrulandı.

## Sınırlar

- CSV içeriği, kaçışları, boş değerleri ve oluşturma akışı otomatik testlerde doğrulandı. Bulut tarayıcıda indirme olayını yakalayan kontrol iki kez zaman aşımına uğradı; **yerel dosya indirmesinin tamamlanması o araçla doğrulanamadı**. Bu kontrol başarılı sayılmadı.
- Fiziksel mobil cihaz, Safari / Firefox, ekran okuyucu, %200 büyütme, yük testi, penetrasyon testi ve tam WCAG denetimi yapılmadı.
- Docker image çalıştırılmadı; PostgreSQL referans DDL'si bir PostgreSQL sunucusunda uygulanmadı.
- Kullanıcının GitHub hesabında yayın yapılmadı. GitHub Pages ayarları hesapta etkinleştirilmelidir; paket tek başına hesabın ayarlarını değiştiremez.
- `npm audit` incelemesinde bildirilen açık bulunmadı. Bu, uygulamanın güvenlik denetimi veya gelecekte yeni açık bulunmayacağı garantisi değildir.
- Gerçek SAP bağlantısı, çok kullanıcılı auth ve merkezi aksiyon kaydı bu sentetik portföy sürümünün kapsamında değildir.

## v1.1.0 yayın ve PWA kontrolü

- Yayındaki HTML 200, dist/src/styles.css ve dist/src/main.js 404: kaynağın yüklenemediği doğrudan HTTP ile doğrulandı. Kullanıcı hesabındaki dosya yükleme geçmişi incelenmedi; dosyaların neden eksik olduğu varsayılmadı.
- Yeni kök girişinin CSS, JS, JSON, manifest, SW ve ikonları HTTP testinde `/` ve `/flowpilot-erp-intelligence/` altında 200; bilinmeyen dosya 404. Aynı kontrol dist çıktısında da geçti.
- PNG boyutları, manifest göreli yolları ve root/dist tüm dosya denkliği doğrulandı.
- Güncel Chrome önizlemesinde TR/EN/DE PWA metinleri ve masaüstü tasarım kontrol edildi. 390 px iframe içinde belge genişliği ile kaydırma genişliği 375 px eşit: taşma yok.
- Service worker yaşam döngüsü ve çevrimdışı yanıtlar gerçek kaynak kodunu VM içinde çalıştırarak test edildi. Bu ortamın önizleme adresi güvenli bağlam olmadığından gerçek Chrome service-worker kurulumu ve uçak modunda yeniden açılış doğrulanmadı. Fiziksel Android/iOS yükleme ve güncelleme testleri yapılmadı.
- Yeni sürüm kullanıcının GitHub hesabına gönderilmedi; canlı site üzerinde düzeltme uygulanmış sayılmamalıdır.
