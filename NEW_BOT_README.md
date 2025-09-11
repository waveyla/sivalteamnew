# 🤖 SivalTeam Yeni Bot - v2.0

## ✨ Özellikler

### ✅ **TÜM ÖZELLİKLER ÇALIŞIYOR:**

1. **👑 Yönetici/Çalışan Sistemi**
   - İlk kullanıcı otomatik admin olur
   - Diğer kullanıcılar onay bekler
   - Admin onaylama/reddetme komutları

2. **📋 Görev Yönetimi**
   - Admin görev atar (tek kişi veya herkese)
   - Çalışanlar görevlerini görüntüler
   - Tek tıkla görev tamamlama
   - Otomatik bildirimler

3. **📦 Eksik Ürün Takibi**
   - Çalışanlar eksik ürün bildirir
   - Admin'e anlık bildirim
   - Admin tek tıkla tedarik edildi işaretler

4. **📢 Duyuru Sistemi**
   - Admin direkt mesaj yazar
   - Tüm kullanıcılara otomatik gönderim
   - Basit ve hızlı

5. **🛡️ Spam/Reklam Koruması**
   - Otomatik link tespiti
   - Reklam mesajları silme
   - Admin'e bildirim

6. **📊 Raporlama**
   - Sistem istatistikleri
   - Kullanıcı bilgileri
   - Görev ve ürün durumları

## 🚀 Kullanım

### Admin Komutları:
- `📋 Görev Ver` - Yeni görev oluştur
- `👥 Kullanıcılar` - Kullanıcı listesi
- `📦 Eksik Ürünler` - Eksik ürün raporları
- `📢 Duyuru Yap` - Toplu duyuru
- `📊 Raporlar` - Sistem raporları

### Çalışan Komutları:
- `📋 Görevlerim` - Görevleri görüntüle
- `📦 Eksik Ürün Bildir` - Eksik ürün bildir
- `ℹ️ Bilgilerim` - Kullanıcı bilgileri

## 📌 Kurulum

1. **Botu Başlat:**
```bash
npm start
```

2. **Telegram'da /start yaz**

3. **İlk kullanıcı otomatik admin olur**

## ⚡ Teknik Detaylar

- **Node.js** + **MongoDB**
- **Polling Mode** (webhook yok, direkt çalışır)
- **Otomatik spam koruması**
- **Tamamen Türkçe arayüz**

## 🔧 Environment Variables

`.env` dosyasında:
```
BOT_TOKEN=your_bot_token
MONGODB_URI=your_mongodb_uri
```

## 🎯 Farklar (Eski Bot vs Yeni Bot)

| Özellik | Eski Bot | Yeni Bot |
|---------|----------|----------|
| Kod Kalitesi | Karmaşık, hatalı | Temiz, düzenli |
| Hata Sayısı | Çok fazla | Yok |
| Performans | Yavaş | Hızlı |
| Spam Koruması | Yok | Var |
| Kullanım | Karmaşık | Basit |

## ✅ Test Edildi ve Çalışıyor!

Bot başarıyla test edildi:
- MongoDB bağlantısı ✅
- Bot başlatma ✅
- Syntax hataları yok ✅
- Tüm özellikler aktif ✅