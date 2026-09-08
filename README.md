# FlowPilot

**ERP Process Intelligence · Türkçe / English / Deutsch**

FlowPilot, üretim şirketinin satın alma, stok, satış ve teslimat kayıtlarını **kanıtı incelenebilen operasyonel önceliklere** dönüştüren, çalışan bir portföy uygulamasıdır. Üniversite mülakatı ve IT / ERP kariyer portföyü için hazırlanmıştır.

> **Projenin gerçek sınırı:** Bu sürüm, sentetik verili ve GitHub Pages üzerinde çalışan bir uygulamadır. Gerçek SAP entegrasyonu, kurumsal kimlik doğrulama veya canlı müşteri verisi içermez. Aksiyonlar tarayıcıda saklanır. Üretim ortamına hazır çok kullanıcılı bir ERP hizmeti olduğu iddia edilmez.

[English](docs/README.en.md) · [Deutsch](docs/README.de.md) · [Mimari](ARCHITECTURE.md) · [API](API.md) · [Veritabanı](DATABASE.md) · [Mülakat rehberi](docs/INTERVIEW.md) · [Test raporu](docs/TESTING.md)

## Problem

ERP sistemleri kayıt tutar; bir operasyon yöneticisinin ihtiyacı ise nerede sorun olduğunu, hangi kayıtların bu sonucu desteklediğini ve hangi aksiyonun değerlendirilmesi gerektiğini bilmektir. Ayrı raporlardaki tedarikçi, stok ve sipariş sayıları bu soruları tek başına cevaplamaz.

## Çözüm

FlowPilot aşağıdaki izlenebilir akışı uygular:

**Kaynak kayıt → iş kuralı → KPI / risk → gözlenen katkı → tahmini etki → önerilen aksiyon → takip**

Örneğin bir tedarikçinin teslimat riski açıldığında gerçek örnek satın alma siparişleri, planlanan ve gerçekleşen tarihler, dönem karşılaştırması, tahmini etki formülü ve önerilen aksiyon görünür. Bir stok bulgusu ise kullanılabilir stok ve yeniden sipariş noktasına dayanır. Etki tutarları muhasebeleşmiş zarar gibi sunulmaz.

## Hızlı yayın: ZIP'ten GitHub Pages'e

1. ZIP'i bilgisayarında çıkar. **ZIP dosyasını yüklemek yerine içindeki dosya ve klasörleri yükle.** `index.html`, `src/`, `icons/`, `data.json`, `manifest.webmanifest`, `sw.js` ve diğer proje dosyaları repo kökünde olmalı; fazladan bir üst klasör içinde kalmamalı.
2. GitHub'da örneğin `flowpilot` adlı bir public repository oluştur ve dosyaları `main` dalına yükle.
3. **Settings → Pages → Build and deployment → Source → Deploy from a branch** seç.
4. Dal: **main**, klasör: **/ (root)** seç ve kaydet.
5. GitHub'ın oluşturduğu Pages adresini aç. Repo adının `flowpilot` olması zorunlu değildir; tüm uygulama dosyaları göreli yollar kullanır.

Node, Python, veritabanı veya API anahtarı web sitesini yayınlamak için gerekmez. Repo kökündeki giriş dosyası `src/` içindeki kaynakları kullanır. Hash tabanlı gezinme sayesinde `#inventory` gibi bağlantılar yenilendiğinde özel sunucu yönlendirmesi gerekmez.

GitHub'ın resmi açıklaması: [Publishing source yapılandırması](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Menü adları İngilizce GitHub arayüzüne göredir; kontrol tarihi 7 Eylül 2026.

### İsteğe bağlı GitHub Actions yayınlama

Kök klasördeki geliştirme belgelerinin de statik olarak sunulmasını istemiyorsan, **Settings → Pages → Source → GitHub Actions** seç. Ardından **Actions → Publish FlowPilot to Pages → Run workflow** çalıştır. Bu yöntem yalnızca `dist/` klasörünü yayınlar ve önce testleri çalıştırır. Sağlanan yayın workflow'u manuel tetiklenir; otomatik yayın davranışı yoktur. CI workflow'u `main` push ve pull request üzerinde otomatik çalışır.

GitHub web yüklemesinde noktayla başlayan `.github/` klasörü gizli kalabilir. Branch üzerinden hızlı yayın için gerekli değildir; CI ve Actions istiyorsan bu klasörün de repoda bulunduğunu doğrula.

## v1.1.0: yayın düzeltmesi ve PWA

8 Eylül 2026 kontrolünde yayınlanan HTML 200, çağırdığı `dist/src/styles.css` ve `dist/src/main.js` dosyaları 404 döndü. Bu nedenle sayfa yükleniyor metninde kalıyordu. Yeni paket kökte doğrudan `src/` kullanır; kaynak ve yayın klasörü yapısı aynıdır. Hem kök alan adı hem `/flowpilot-erp-intelligence/` alt yolu HTTP testleriyle kontrol edilir.

**Güncelleme:** ZIP'in tamamını çıkarıp içeriğini mevcut deponun köküne yükle; aynı isimli dosyaları yeni sürümle değiştir. Yalnızca `index.html` yükleme. GitHub dosya listesinde `src/`, `icons/`, `data.json`, `manifest.webmanifest` ve `sw.js` görünmelidir. Branch yayını için Pages kaynağı `main / (root)` olmalı. Actions yayını seçiliyse bu paketin manuel yayın workflow'unu çalıştır. Yayın tamamlandıktan sonra sayfayı Ctrl+Shift+R ile aç. Footer'da **v1.1.0** görünür.

- Kurulabilir manifest, bağımsız pencere, 192/512 PNG ikonları, maskable ikon ve Apple dokunmatik ikonu.
- Sayfa altındaki **Uygulama ve çevrimdışı erişim** bölümünde TR/EN/DE kurulum yönergeleri; tarayıcı uygunluk olayı verdiğinde yükleme düğmesi.
- İlk başarılı çevrimiçi önbelleklemeden sonra uygulama, grafikler, tablolar ve demo JSON verisi çevrimdışı açılabilir. Aksiyonlar aynı tarayıcının yerel depolamasında kalır; sunucuya senkronize edilmez.
- Bağlantı kaybı bildirimi ve hazır olduğunda kullanıcı onayıyla sürüm güncelleme. Açık formu kaydettikten sonra **Kaydettim, güncelle** seçilir.
- Her yayın için içerik özetli önbellek. Aynı GitHub alanındaki başka depoların önbelleğine dokunulmaz. Yeni sürümün tek dosyası bile eksikse eksik sürüm etkinleştirilmez.

Kurulum ve service worker için HTTPS veya localhost gerekir; `file://` ile çalıştırma. İlk çevrimdışı ziyaret desteklenmez. Tarayıcı depolamayı silebilir; bu bir yedekleme sistemi değildir. PWA ekleri mağaza paketi, push servisi veya SAP senkronizasyonu sağlamaz. Ayrıntılar: [PWA teknik rehberi](docs/PWA.md).

## Yerel çalıştırma

Dosyayı çift tıklayıp `file://` üzerinden açma: ES modules ve JSON yükleme HTTP gerektirir. Python 3 yüklüyse repo kökünde:

```bash
python -m http.server 8080
```

Ardından `http://localhost:8080` adresini aç. `dist/` tek başına da herhangi bir statik HTTP sunucusunda çalışır. Terminali kapatmak sunucuyu durdurur.

## Ekranlar ve sundukları

| Ekran         | Çalışan özellikler                                                                                           | İş sorusu                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Genel bakış   | Hesaplanan 6 KPI, dönem karşılaştırması, öncelik listesi, haftalık gelir ve tedarikçi gecikme grafikleri     | Önce neye bakmalıyım?                            |
| Satın alma    | 30 tedarikçi, satın alma siparişleri, harcama, zamanında teslimat, ortalama gecikme, risk ve kayıt detayları | Hangi tedarikçi performansı düşürüyor?           |
| Stok yönetimi | Mevcut, rezerve ve kullanılabilir miktar; günlük talep, kapsama süresi, ikmal noktası, fazla / talepsiz stok | Hangi ürüne ne kadar ikmal gerekir?              |
| Satış         | Teslim edilmiş siparişlerden gelir; ortalama sipariş değeri; müşteri ve ürün katkısı; dönem grafiği          | Geliri hangi müşteri ve ürün oluşturuyor?        |
| Lojistik      | Taşıyıcı ve bölge bazında performans; geciken teslimatlar; sevk, plan ve teslim tarihleri                    | Teslimat aksaması nerede yoğunlaşıyor?           |
| İş içgörüleri | Kurallardan üretilen bulgular, kanıt bağlantıları, hesaplama varsayımları, aksiyon önerileri                 | Bu sonuç neden üretildi?                         |
| Veri gezgini  | Tarih, tedarikçi, ürün, kategori, bölge, durum, stok riski; sıralama, sütun seçimi, sayfalama, CSV           | Belirli bir sipariş grubunu inceleyebilir miyim? |
| Aksiyonlar    | İçgörüden oluşturma; sorumlu, hedef tarih, not, durum; onaylı silme; tarayıcıda saklama                      | İnceleme sonrasında hangi iş yapılacak?          |
| Mimari        | Çalışan mimari ve üretime geçiş sınırları; yerel çalışma sıfırlama                                           | Sistem nasıl tasarlandı?                         |
| Ürün tanıtımı | Problem, çözüm akışı, modüller, gerçek hesaplanmış örnek bulgu, veri sınırları                               | Ürün ne işe yarıyor?                             |

### Ortak işlevler

- **TR / EN / DE**: Tüm ürün metinleri tek sözlükten; para, sayı ve tarihler yerelleştirilir. Şirket, ürün ve taşıyıcı adları özel ad olduğu için çevrilmez. Kod yorumları İngilizcedir; ana README Türkçedir.
- **Ctrl+K / Cmd+K**: Komut paleti ve gruplu arama. Tedarikçi, ürün, müşteri, satış siparişi ve satın alma siparişi kayıtlarına erişim.
- **Dönem**: Ağustos / Eylül 2026. İşlemler farklı tarih temellerine göre gruplanır; formüller aşağıdadır.
- **Bildirimler**: Yalnızca yüksek riskli bulgular; okundu işaretleme kalıcıdır. ERP alarmı veya push servisi değildir.
- **CSV**: Seçili modüldeki / sekmedeki filtrelenmiş tüm satırları, mevcut sıralamayla dışa aktarır. Veri gezgininde seçilen sütunlar kullanılır; yalnızca ekrandaki 10 satırla sınırlı değildir. UTF-8 BOM, standart alan kaçışları ve formül enjeksiyonu önlemi içerir.
- **Erişilebilirlik**: Anlamsal HTML, etiketli kontroller, görünür odak, yerel `<dialog>`, Escape, klavyeyle sekme seçimi, canlı bildirim alanı, azaltılmış hareket tercihi. Tam WCAG uygunluk sertifikası iddia edilmez.
- **Duyarlı tasarım**: Masaüstünde sabit yan menü, küçük ekranlarda açılabilir menü; yeniden düzenlenen kartlar. Yoğun tablolarda kontrollü yatay kaydırma vardır.
- **Durumlar**: Yükleniyor, yükleme hatası / tekrar dene, boş filtre sonucu, başarı bildirimi, yerel kayıt hatası ve silme onayı.

## Demo veri modeli

Veri kümesi `scripts/generate.mjs` ile sabit tohumdan (`87261`) üretilir:

| Varlık              |       Adet | İlişki                                     |
| ------------------- | ---------: | ------------------------------------------ |
| Tedarikçi           |         30 | Ürün ve satın alma siparişi                |
| Ürün                |        120 | Tek ana tedarikçi, stok anlık kaydı        |
| Müşteri             |         24 | Satış siparişi                             |
| Satış siparişi      |        360 | Ürün, müşteri, tedarikçi                   |
| Satın alma siparişi |        120 | Ürün, tedarikçi                            |
| Teslimat            | Hesaplanan | Tamamlanmış satış veya satın alma siparişi |

Şirket: **Demo Manufacturing GmbH**. Para birimi: **EUR**. Kayıt dönemi Ağustos–Eylül 2026; veri anlık tarihi **30 Eylül 2026**. Bu, gelecekteki bir ay sonunu temsil eden sentetik senaryodur; gerçek zamanlı işletme verisi değildir. Anlık tarihten sonraki planlı teslimatlar tamamlanmış sayılmaz.

Ürün başına tek ana tedarikçi ve sipariş başına tek ürün satırı kullanılır. Kısmi sevkiyat, iade, iptal, vergi, iskonto, döviz ve finansal defter kaydı bu sürümün modelinde yoktur.

## Hesaplamalar: sayıların anlamı

| Gösterge                  | Formül / zaman temeli                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gerçekleşen gelir         | Seçili ayda **teslim edilmiş** satış siparişleri için Σ miktar × satış birim fiyatı                                                                         |
| Açık siparişler           | Seçili ayda **oluşturulmuş**, anlık tarihte teslim edilmemiş satış siparişleri                                                                              |
| Stok değeri               | 30 Eylül anlık kaydı için Σ mevcut stok × birim maliyet; ay değişince değişmez                                                                              |
| Kullanılabilir stok       | max(0, mevcut − rezerve)                                                                                                                                    |
| Stok yeterliliği          | Kullanılabilir stok / günlük talep tahmini; talep 0 ise belirsiz (`—`)                                                                                      |
| Yeniden sipariş noktası   | Üreticide günlük talep × (tedarikçi temel teslim süresi + 4 günlük güvenlik payı)                                                                           |
| Stok riski                | Talep 0: talepsiz; kapsama <7 gün: yüksek; kullanılabilir < ikmal noktası: orta; kapsama >90 gün: fazla; diğer: düşük                                       |
| Zamanında teslimat (OTD)  | Seçili ayda gerçek teslimi olan kayıtlarda, teslim ≤ plan olanların oranı. Genel bakış / lojistik: müşteri teslimatları; tedarikçi: satın alma teslimatları |
| Tedarikçi riski           | Tamamlanan teslimat varsa OTD <%70: yüksek, <%90: orta, diğer: düşük. Hiç teslimat yoksa oran `—`; risk alarmı üretilmez                                    |
| Ortalama gecikme          | Tamamlanan tüm teslimatlarda max(0, gerçek − plan) gün ortalaması; yalnızca gecikenlerin ortalaması değildir                                                |
| Satın alma tutarı         | Seçili ayda oluşturulmuş satın alma siparişleri için Σ miktar × maliyet; ödeme veya gerçekleşmiş gider değildir                                             |
| Stok devri                | Seçili ayda teslim edilmiş satışların yaklaşık maliyeti × 12 / mevcut stok değeri. Ortalama stok bulunmadığı için **yıllıklandırılmış tahmin**              |
| Ortalama sipariş değeri   | Gerçekleşen gelir / seçili ayda teslim edilmiş satış siparişi adedi                                                                                         |
| Gecikmenin tahmini etkisi | Σ gecikme günü × satın alma miktarı × birim maliyet × **günlük %0,5 varsayımı**                                                                             |
| Stok ikmal bütçesi        | max(0, ikmal noktası − kullanılabilir) × birim maliyet                                                                                                      |
| Gelir bulgusu             | Önceki aya göre mutlak gelir değişimi >%10. Önceki ay verisi 0 ise oran ve bulgu üretilmez                                                                  |

OTD farkı **yüzde puan**, gelir değişimi **yüzde** olarak gösterilir. Yüksek riskli bulgular stok ve tedarikçi bulgularının adedidir; tekil sipariş adedi değildir. Risk listesinde önce önem seviyesi, sonra aynı seviyedeki tahmini tutar kullanılır. İkmal bütçesi ile gecikme tahmini farklı anlam taşır; toplam zarar olarak toplanmaz.

**Nedensellik sınırı:** Tedarikçi performansına katkıda bulunan geç satın alma kayıtları gösterilir. Sistem “bu tedarikçi müşteri teslimatını kesin olarak geciktirdi” iddiasında bulunmaz. Üretim planı / BOM bağlantısı olmadan böyle bir çıkarım güvenilir olmaz.

**Tarihsel stok grafiği yoktur:** Yalnızca bir stok anlık görüntüsü bulunduğu için stok değeri trendi uydurulmaz. Günlük talep örnek veri içindeki tahmindir; bu sürüm onu geçmiş siparişlerden öğrenmez.

## Mimari ve teknoloji seçimi

**ERP Integration Ready Architecture**

- **İstemci:** Standart HTML, CSS, native ES modules. Çalışma zamanında npm bağımlılığı, CDN fontu veya üçüncü taraf script yok.
- **Sunum:** `main.js`; ortak tablo, grafik, form, modal ve gezinme bileşenleri.
- **İş mantığı:** `engine.js`; DOM'dan bağımsız saf hesaplama fonksiyonları.
- **Veri sınırı:** `data.js`; yükleme, doğrulama ve yerel kayıt yardımcıları.
- **Dil:** `i18n.js`; üç tam sözlük ve Intl biçimlendirme.
- **Mock API:** Python standart kütüphanesiyle salt okunur REST; OpenAPI 3.1 sözleşmesi. Web sitesi bu API'nin çalışmasına bağlı değildir.
- **Analiz paylaşımı:** API için önceden hesaplanan anlık sonuçlar aynı JS motorundan üretilir; Python'da ikinci bir formül implementasyonu tutulmaz.
- **Veritabanı:** PostgreSQL için ilişkisel referans DDL; bu sürümde çalışan veritabanı bağlantısı yok.
- **Test:** Node `node:test`, jsdom DOM entegrasyonu ve Python `unittest` HTTP testleri.

React / Next.js, FastAPI ve PostgreSQL başlangıç metninde tercih olarak verilmişti. ZIP'ten doğrudan GitHub Pages'e yayın hedefi nedeniyle framework derlemesi ve sürekli çalışan sunucu zorunluluğu kaldırıldı. Bu seçim gereksiz kurulum ihtiyacını azaltır; büyüyen bir ürün için route bileşenleri ve veri sınırı korunarak framework'e geçilebilir. Şu anki istemci modülleri derlenmiş veya küçültülmüş dosyalar değildir; okunabilir kaynak koddur.

## Dosya rehberi

| Dosya / klasör           | Amaç                                                                              |
| ------------------------ | --------------------------------------------------------------------------------- |
| `index.html`             | GitHub Pages branch / root giriş dosyası                                          |
| `dist/index.html`        | Bağımsız statik yayın girişi                                                      |
| `src/main.js`            | Sayfalar, yeniden kullanılan sunum bileşenleri, olaylar ve yerel aksiyon akışı    |
| `src/engine.js`          | KPI, risk, filtre ve CSV iş kuralları                                             |
| `src/data.js`            | Veri doğrulama / yükleme; tarayıcı kayıt sınırı                                   |
| `src/i18n.js`            | Türkçe, İngilizce, Almanca ürün metinleri                                         |
| `src/styles.css`         | Tasarım tokenları, ortak bileşenler, responsive / print / reduced-motion stilleri |
| `data.json`              | Birbiriyle ilişkili sentetik kaynak kayıtlar                                      |
| `backend/server.py`      | Opsiyonel salt okunur mock ERP API                                                |
| `backend/analytics.json` | Aynı analiz motorundan üretilen API anlık sonuçları                               |
| `backend/openapi.json`   | API sözleşmesi                                                                    |
| `backend/schema.sql`     | Gelecekteki PostgreSQL adaptörü için DDL                                          |
| `scripts/`               | Tekrarlanabilir veri üretimi, analiz materializasyonu, yayın doğrulama            |
| `tests/`                 | Veri, iş mantığı, DOM etkileşimleri ve HTTP sözleşmesi testleri                   |
| `.github/workflows/`     | CI ve opsiyonel manuel Pages yayını                                               |
| `docs/`                  | Dil özetleri, mülakat akışı, test raporu                                          |

Kod yorumları sorumluluk, varsayım ve nedenleri anlatır; her sözdizimi satırını tekrar eden yorumlardan kaçınılmıştır. Sayısal iş kuralları UI şablonlarına gömülmemiştir.

## Geliştirme ve test

Node.js 22.12+ ve Python 3.10+ gerekir. npm yalnızca geliştirme / test araçlarını kurar. İsteğe bağlı Vite önizlemesi `npm run dev` ile başlatılabilir; statik yayın için build gerekmez.

```bash
npm ci
npm run build
npm run validate
npm test
python -m unittest discover -s tests -p 'test_*.py' -v
```

Örnek veriyi yeniden üretmek:

```bash
npm run generate
```

Bu komut ham veriyi ve API analiz anlık sonuçlarını birlikte yeniler. Kaynak dosyaları biçimlendirmek için `npm run format` kullanılabilir. Test ve API komutları proje kökünde çalıştırılmalıdır.

## API'yi ayrı çalıştırma

```bash
python backend/server.py
```

- `http://localhost:8000/health`
- `http://localhost:8000/api/orders?period=2026-09&limit=10`
- `http://localhost:8000/api/insights?period=2026-09`
- `http://localhost:8000/openapi.json`

Alternatif: `docker compose up --build`. Docker yapılandırması sağlanmıştır; bu teslimatta Docker daemon üzerinde çalıştırılmamıştır. Ayrıntılar [API.md](API.md).

## Güvenlik ve veri gizliliği

Örnek veriler halka açıktır; gerçek ticari kayıtları bu statik pakete eklemeyin. Gizli anahtar, token veya parola bulunmaz. `.env.example` yalnızca gelecekteki sunucu adaptöründe düşünülebilecek alan adlarını açıklar; mevcut kod bu alanları okumaz.

Dinamik metinler HTML'e eklenmeden kaçışlanır. Kullanıcı notları için uzunluk sınırları vardır. CSV alanları tırnaklanır, formül başlangıçları etkisizleştirilir. Mock API sadece tanımlı kaynakları okur, sorgu parametrelerini sınırlar, dosya yolu oluşturmak için istemci girdisi kullanmaz. API varsayılan olarak loopback adresine bağlanır; CORS açılmaz.

Tarayıcıdaki aksiyonlar kimlik doğrulanmış / şifreli ortak kayıt değildir. Aynı tarayıcı profilini kullanan kişiler bu kayıtlara erişebilir. Tamamlama işlemi ERP verisini değiştirmez. Bildirim okuma durumu da tarayıcıya özeldir. Gizli müşteri notlarını bu portföy sürümüne yazmayın.

## Ekran görüntüleri ve demo

Ayrı bir canlı adres bu pakette oluşturulmadı; yayın adresini kendi GitHub hesabın belirler. Önerilen giriş genel bakıştır. Tanıtım ekranı `#home`, mimari ekranı `#architecture` yolundadır.

Gerçek Chrome tarayıcısında masaüstü görünümü, 390 px genişliğindeki mobil çerçeve, modül geçişleri, dil seçimi, filtre ve aksiyon kaydetme akışı incelendi. Mobil kontrol gerçek telefon testi değildir.

![FlowPilot gerçek masaüstü ekranı](docs/screenshots/overview.jpg)

Güncel kapsam ve sınırlar [test raporunda](docs/TESTING.md). **v1.1.0 toplam 213 otomatik test içerir (209 Node + 4 Python).**

## Gelecek geliştirmeler

1. Yetkili SAP S/4HANA OData / REST adaptörü; kaynak olay kimliği ve senkronizasyon izleri.
2. OIDC oturumları, rol bazlı sunucu yetkilendirmesi, tenant izolasyonu ve audit log.
3. PostgreSQL depolama, göçler ve merkezi çok kullanıcılı aksiyon iş akışı.
4. Gerçek stok anlık geçmişi, ortalama stokla devir hesabı, tahmin doğrulaması.
5. Çok satırlı siparişler, kısmi sevkiyat, iade, iptal ve çoklu para birimi.
6. BOM / üretim planı / teslimat olaylarıyla daha güçlü süreç madenciliği; şu anki katkı analizinin ötesinde nedensel değerlendirme.
7. Gerçek tarayıcı E2E, görsel regresyon, ekran okuyucu ve yük testleri.

## Katkı ve lisans

[CONTRIBUTING.md](CONTRIBUTING.md) katkı kuralları ve doğrulama komutlarını; [LICENSE](LICENSE) MIT lisansını içerir. Portföy sahibi: Muhammet Fidan. Mülakatta üretim kapsamını ve yardım alınan geliştirme araçlarını dürüstçe açıklayın; önemli olan sistemi anlayarak savunabilmektir.
