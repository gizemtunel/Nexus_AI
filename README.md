# NEXUS_AI: Bilişsel Kapsayıcılık Motoru

##  Proje Hakkında
Nexus_AI, uzun ve karmaşık metinleri DEHB ve Disleksi gibi farklı bilişsel profillere sahip bireyler için anında uyarlayan ve daha erişilebilir kılan bir yapay zeka asistanıdır. 

Sistem, metnin okunabilirliğini ve bilişsel yükünü algoritmalarla analiz eder ve Büyük Dil Modelleri (LLM) yardımıyla metni hedef kitleye en uygun formatta yeniden yapılandırır.

##  Ekip Rolleri ve İş Bölümü
* **Veri Bilimi Odaklı Görevler:** Girdi metinlerinin istatistiksel analizi, bilişsel yük skorlaması ve veri seti hazırlığı.
* **Yapay Zeka Odaklı Görevler:** Analiz skorlarına göre LLM entegrasyonu, prompt mühendisliği ve arka plan (API) mimarisinin kurulması.

##  Proje Yapısı
* `data/` : Kullanılacak veri setleri ve metin örnekleri.
* `notebooks/` : Keşifçi veri analizi (EDA) ve model denemeleri.
* `models/` : Eğitilmiş ağırlıklar ve model dosyaları.
* `src/` : API ve ana uygulama kodları.
* `ui/` : Kullanıcı arayüzü bileşenleri.

## Çalıştırma

Bu demo için FastAPI seçildi. Django burada gereğinden ağır kalırdı; tek ekranlık okunabilirlik arayüzü ve ileride eklenecek metin işleme endpoint'i için FastAPI daha uygun.

Kurulum:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.app:app --reload
```

Tarayıcıdan `http://127.0.0.1:8000` adresini açın.
