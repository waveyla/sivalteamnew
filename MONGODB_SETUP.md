# MongoDB Atlas Kurulum Rehberi

## 1. MongoDB Atlas Hesabı Oluşturma

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) sitesine gidin
2. "Try Free" butonuna tıklayın
3. Google hesabınızla veya email ile kayıt olun

## 2. Ücretsiz Cluster Oluşturma

1. "Build a Database" seçeneğine tıklayın
2. **M0 FREE** planını seçin (512MB depolama alanı)
3. Cloud Provider olarak AWS, Google Cloud veya Azure seçin
4. Size en yakın bölgeyi seçin (örn: Frankfurt)
5. Cluster adını belirleyin (varsayılan: Cluster0)
6. "Create" butonuna tıklayın

## 3. Veritabanı Kullanıcısı Oluşturma

1. Sol menüden "Database Access" seçin
2. "Add New Database User" tıklayın
3. Authentication Method: Password
4. Username: `sivalteam` (veya istediğiniz bir isim)
5. Password: Güçlü bir şifre belirleyin
6. Database User Privileges: "Read and write to any database"
7. "Add User" tıklayın

## 4. IP Whitelist Ayarlama

1. Sol menüden "Network Access" seçin
2. "Add IP Address" tıklayın
3. "Allow Access from Anywhere" seçin (0.0.0.0/0)
   - Not: Production için sadece Render IP'lerini ekleyin
4. "Confirm" tıklayın

## 5. Connection String Alma

1. "Database" bölümüne dönün
2. Cluster'ınızda "Connect" butonuna tıklayın
3. "Connect your application" seçin
4. Driver: Node.js, Version: 5.5 or later
5. Connection string'i kopyalayın:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## 6. Connection String'i Düzenleme

1. `<username>` yerine oluşturduğunuz kullanıcı adını yazın
2. `<password>` yerine belirlediğiniz şifreyi yazın
3. `/?` kısmını `/sivalteam?` olarak değiştirin (veritabanı adı)

Örnek:
```
mongodb+srv://sivalteam:MyPassword123@cluster0.abcde.mongodb.net/sivalteam?retryWrites=true&w=majority
```

## 7. Render'da Environment Variable Ekleme

1. [Render Dashboard](https://dashboard.render.com) açın
2. Bot servisinizi seçin
3. "Environment" sekmesine gidin
4. "Add Environment Variable" tıklayın
5. Şu değişkenleri ekleyin:
   - Key: `MONGODB_URI` 
   - Value: MongoDB connection string'iniz
   - Key: `BOT_TOKEN`
   - Value: Telegram bot token'ınız
6. "Save Changes" tıklayın

## 8. Deploy Etme

1. GitHub'a yeni değişiklikleri push'layın:
   ```bash
   git add .
   git commit -m "Add MongoDB support"
   git push origin main
   ```

2. Render otomatik olarak yeni versiyonu deploy edecek

## 9. Test Etme

1. Telegram'da botunuza `/start` yazın
2. Kullanıcı verilerinin kaydedildiğini kontrol edin
3. MongoDB Atlas Dashboard'da verileri görüntüleyin

## Sorun Giderme

### Bağlantı Hatası
- IP whitelist'i kontrol edin (0.0.0.0/0 eklenmiş mi?)
- Kullanıcı adı ve şifre doğru mu?
- Connection string'de özel karakterler varsa URL encode edin

### Veri Kaydetme Sorunu
- Database adı doğru mu? (sivalteam)
- Kullanıcının write yetkisi var mı?
- Cluster active durumda mı?

### Render'da Hata
- Environment variable'lar doğru eklenmiş mi?
- Build log'larını kontrol edin
- MongoDB URI'nin tırnak içinde olmadığından emin olun

## Önemli Notlar

- Ücretsiz M0 planı 512MB veri limiti var
- Maksimum 100 bağlantı limiti var
- 3 ücretsiz cluster hakkınız var
- Production için M10 veya üzeri plan önerilir

## Veri Yedekleme

Bot otomatik olarak her 1 saatte bir JSON formatında yedek alır ve `backups/` klasörüne kaydeder.