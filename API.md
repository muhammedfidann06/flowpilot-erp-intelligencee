# Mock ERP REST API

Python 3.10+ ile repo kökünde `python backend/server.py` çalıştırılır. Varsayılan adres `127.0.0.1:8000`; ek paket gerekmez. `--host` ve `--port` komut satırı seçenekleri kullanılabilir. Web uygulaması statik JSON kullandığından bu sunucu kapalıyken de çalışır.

## Kaynaklar

| GET endpoint           | Cevap kaynağı                                          |
| ---------------------- | ------------------------------------------------------ |
| `/health`              | Servis durumu, örnek veri modu ve anlık tarih          |
| `/openapi.json`        | OpenAPI 3.1 sözleşmesi                                 |
| `/api/suppliers`       | Tedarikçi ana kayıtları                                |
| `/api/products`        | Ürün ve stok girdi alanları                            |
| `/api/customers`       | Müşteri ana kayıtları                                  |
| `/api/orders`          | Satış siparişleri                                      |
| `/api/purchase-orders` | Satın alma siparişleri                                 |
| `/api/inventory`       | Hesaplanmış kullanılabilir stok, kapsama ve risk       |
| `/api/deliveries`      | Satış ve satın alma teslimatları; `type` ayırır        |
| `/api/insights`        | Seçili dönemin aynı JS motoruyla hesaplanmış bulguları |

Her `/api/{resource}` kaynağı için `/api/{resource}/{id}` tekil kayıt okuma da vardır. Kimlik bulunamazsa 404. Örnek: `/api/orders/SO-26001`.

## Parametreler

| Parametre                                     | Kural                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `limit`                                       | 1–500, varsayılan 100                                                       |
| `offset`                                      | Sıfır veya pozitif tamsayı, varsayılan 0                                    |
| `period`                                      | `2026-08` veya `2026-09`; insights için varsayılan Eylül                    |
| `q`                                           | En fazla 100 karakter; kayıt değerlerinde büyük / küçük harf duyarsız arama |
| `supplierId`, `productId`, `status`, `region` | İlgili alanlarda tam eşleşme; alana sahip olmayan kayıtta eşleşme olmaz     |

Sipariş / satın alma listelerinde `period` verildiğinde `date`, teslimatlarda `deliveredAt` filtrelenir. `period` verilmezse bu ham listeler tüm dönemleri döndürür. Stok her zaman 30 Eylül anlık kaydıdır. Tekil ham kayıt sorguları ay filtresinden bağımsızdır; kanıt bağlantıları böylece kararlı kalır. Insights kimlikleri döneme bağlı olduğundan ilgili dönemin `period` parametresi kullanılmalıdır.

Bilinmeyen veya tekrarlı query alanı 400; hatalı tarih dönemi veya sayfalama sınırı 400. En fazla 20 query alanı ayrıştırılır. Kayıtlar sabit sıralı gelir; sunucu sıralama parametresi yoktur. İstemcideki gelişmiş explorer filtreleri ayrı iş mantığı katmanında uygulanır.

## Cevap örneği

```json
{
  "data": [
    {
      "id": "SUP-001",
      "name": "Nordwerk GmbH",
      "region": "DACH",
      "leadTime": 7,
      "paymentDays": 30
    }
  ],
  "total": 30,
  "limit": 1,
  "offset": 0,
  "meta": {
    "company": "Demo Manufacturing GmbH",
    "asOf": "2026-09-30",
    "currency": "EUR",
    "seed": 87261,
    "synthetic": true
  }
}
```

Tekil endpoint doğrudan kayıt nesnesi döndürür; liste envelope'u kullanmaz.

```json
{ "error": "Record not found" }
```

## Yazma ve güvenlik

POST / PUT / PATCH / DELETE 405 döndürür. Gerçek işlem başlatılmaz. Parametrelerden dosya yolu oluşturulmaz. Sır, kimlik doğrulama, tenant veya veritabanı yoktur. CORS açılmaz; içerik sentetik ve kamuya açık olsa bile gerçek verili bir servise dönüştürülürken auth ve erişim kapsamları yeniden tasarlanmalıdır.

HTTP JSON cevapları UTF-8 içerik türü, `nosniff` ve `no-store` başlıklarına sahiptir. API, standart kütüphane `ThreadingHTTPServer` kullanır; bu örnek sunucu üretim yükü veya internete açık hassas servis için sertleştirilmiş bir uygulama sunucusu değildir.

## Analiz güncelliği

`analytics.json` önceden hesaplanır; API isteğinde yeniden analiz yapılmaz. Güncelleme: `npm run generate`. Bu komut kaynak JSON ve anlık analizi aynı deterministik senaryodan üretir. Harici JSON değişikliği yaptıysan `node scripts/analytics.mjs` ve testleri çalıştır. `precomputed API analytics` testi istemci motoruyla birebir eşitliği kontrol eder.

## Docker

```bash
docker compose up --build
```

Container non-root kullanıcısıyla ve salt okunur dosya sistemiyle çalışacak şekilde yapılandırılmıştır; tüm Linux capability'leri bırakılır, yeni ayrıcalık kapalıdır. Port yalnızca host loopback üzerinde yayınlanır. Docker build / run bu teslimat ortamında denenmedi. Python HTTP testleri doğrudan servisi test eder.
