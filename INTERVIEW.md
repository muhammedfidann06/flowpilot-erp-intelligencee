# Üniversite mülakatı: 6 dakikalık sunum akışı

Bu metin ezberlenecek bir başarı iddiası değil, kodu anlayarak gösterebilmen için rehberdir. Gerçek SAP bağlantısı veya ticari müşteri kullandığını söyleme. Kullanılan geliştirme yardımlarını ve kişisel katkını dürüstçe anlat.

## 0:00–0:45 · Problem

“Üretim şirketlerinde sipariş, stok ve teslimat verileri bulunuyor; fakat bir yöneticinin hangi soruna önce bakacağını anlaması zor. FlowPilot'ta kayıtları ortak bir veri modeliyle bağlayıp açıklanabilir kurallarla öncelik üretiyorum.”

Genel bakışı aç. Veri kümesinin sentetik ve tarihinin sabit olduğunu belirt. Gelirin teslim edilmiş siparişlerden geldiğini, stok değerinin ise anlık veri olduğunu göster.

## 0:45–2:00 · Kanıta in

İş içgörüleri ekranında bir **tedarikçi teslimat riski** seç. Stok bulguları üstte olabilir; tedarikçi bulgusuna kaydır. Bulgunun oranını, geçmiş dönem karşılaştırmasını ve geciken satın alma siparişlerini aç.

“Bu sonuç bir chatbot cevabı değil; tarihlerden hesaplanan bir iş kuralı. Gecikme maliyeti de gerçek zarar değil, belgelenmiş günlük %0,5 planlama varsayımı. Katkı analizi ile nedensellik arasındaki farkı özellikle belirtiyorum.”

## 2:00–3:00 · Operasyonel aksiyon

Bulguya dön, aksiyon oluştur. Sorumlu, hedef tarih ve not gir; durumu “Devam ediyor” yap. Aksiyonlar ekranında kaydı göster.

“Takip işlemi kaynak ERP kaydını değiştirmiyor. Bu sürüm tarayıcıda saklıyor; gerçek şirket sürümünde merkezi veritabanı, kullanıcı yetkisi ve audit log gerekecek.”

## 3:00–4:00 · Veri yeteneği

Veri gezgininde açık siparişleri ve bir bölgeyi filtrele. Bir sütunu gizle, tutara göre sırala, CSV indir. Global aramada bir sipariş kimliği ara. Dili Almanca yap; sayılar, tarihler ve metinler değişsin.

“Filtreler AND mantığıyla birleşiyor. CSV tüm filtrelenmiş kayıtları aynı sıralamayla alıyor. Sadece görünür ilk sayfa export edilmiyor.”

## 4:00–5:00 · Mühendislik

Mimari ekranını ve repoda `engine.js` ile testleri göster.

“Sunum, hesaplama ve veri erişimini ayırdım. Aynı analiz motorundan API anlık sonuçları üretiliyor; Python ve JavaScript'te iki farklı formül tutmuyorum. Tekrarlanabilir örnek veri ve ilişki testleriyle sonuçları denetlenebilir yaptım.”

## 5:00–6:00 · Dürüst değerlendirme

“Doğrudan GitHub Pages'te yayın hedefi nedeniyle sunucu gerektirmeyen modüler JavaScript seçtim. React'e geçiş mümkün, ama şu anki ürün için asıl mühendislik değeri açıklanabilir iş mantığı ve veri tutarlılığı. Sonraki adımım gerçek ERP adaptörü, kimlik doğrulama ve merkezi depolama olurdu.”

## Sorulabilecek sorular

| Soru                                              | Açıklaman gereken nokta                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| SAP'ye bağlı mı?                                  | Hayır. Mock ERP kayıtları ve ayrı REST sınırı var. Gerçek bağlantı için yetkili sunucu adaptörü gerekir.                                   |
| Neden React değil?                                | ZIP'ten kurulum yapmadan statik yayın önceliği; modüler yapı ileride framework'e taşınabilir.                                              |
| Root cause gerçekten nedensellik mi?              | Hayır. Gözlenen katkı / kanıt analizi. BOM ve üretim olayları olmadan nedensellik iddia etmiyor.                                           |
| Stok devri neden tahmin?                          | Tarihsel ortalama stok yok; aylık yaklaşık COGS ×12 / mevcut stok kullanılıyor.                                                            |
| Az sayıda tedarikçi teslimiyle risk güvenilir mi? | Demo küçük örneklemli; üretimde daha uzun pencere ve asgari örneklem / güven aralığı gerekir.                                              |
| İşlemler güvenli mi?                              | Sentetik veriler açık. XSS kaçışı ve girdi doğrulama var; gerçek auth / tenant güvenliği uygulanmış değil.                                 |
| Tamamlandı butonu neyi değiştirir?                | Sadece tarayıcıdaki görev durumunu; ERP siparişini veya stoğu değiştirmez.                                                                 |
| Binlerce kullanıcıya ölçeklenir mi?               | Statik istemci kolay sunulur, ancak veri ve aksiyon katmanı tek kullanıcı demosudur. Sunucu analitiği ve çok kullanıcılı depolama gerekir. |
| Test kapsamı ne?                                  | İş mantığı / veri, DOM etkileşimleri, gerçek HTTP endpointleri; gerçek tarayıcı görsel testi ve Docker testi yok.                          |

## Mülakat öncesi kendi hazırlığın

- Kendi GitHub Pages adresini açıp demo akışını baştan sona uygula.
- `metrics()`, `inventoryRow()`, `insights()` ve `toCSV()` fonksiyonlarını açıklayabildiğinden emin ol.
- Bir örnek siparişin miktar × birim fiyat hesabını elle doğrula.
- Ağ yoksa yerel HTTP sunucusunu kullan; dosyayı çift tıklamak yeterli değildir.
- Şirketlerin gerçekten ödediği bir ticari ürün gibi tanıtma; mühendislik kararlarını göster.
