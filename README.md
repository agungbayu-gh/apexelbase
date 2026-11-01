# Starseed Apexel — Base Bot WhatsApp Sewa

Base bot WhatsApp untuk usaha **sewa/rental** (dipakai Apexel Caruban, sewa peralatan foto & piknik di Madiun). Dibangun di atas template Starseed (@itsliaaa) + Baileys, sudah dipangkas jadi fitur inti saja.

## Fitur

- **Kartu Sapa otomatis** — pelanggan baru yang chat pertama kali disambut foto + caption layanan & cara sewa, lengkap dengan tombol **Pricelist / Lokasi / Peraturan** (throttle 6 jam per nomor, owner dikecualikan). Lihat `events/sapa.js`.
- **Pricelist** — perintah `.pricelist` dan tombol Pricelist menampilkan daftar harga sewa. Lihat `plugins/apexel/pricelist.js`.
- **Pembayaran** — perintah `.payment` mengirim foto QRIS + tombol lanjutan. Lihat `plugins/apexel/pembayaran.js`.
- **Lokasi** — perintah `.location` mengirim pin lokasi usaha. Lihat `plugins/apexel/lokasi.js`.
- **Menu Poll** — `.menupoll` mengirim poll Pricelist/Pembayaran/Lokasi, vote pelanggan otomatis dibalas. Lihat `plugins/apexel/menupoll.js`.
- **Katalog foto** — `.katalog` mengirim foto produk. **Peraturan sewa** — `.rules`.
- **Anti-405**: versi WhatsApp di-pin di `socket.js` (`version: [2, 3000, 1043857760]`). Kalau suatu saat koneksi ditolak (405), naikkan pin ini ke versi WA resmi terbaru.
- Filter nomor Indonesia (+62) saja, gerbang anti-replay untuk pesan lama saat reconnect.

## Yang sengaja TIDAK ada di base ini

AI booking, webhook pembayaran, status harian, label flow, plugin owner, dan fitur tes — semuanya sudah dibuang agar base ini ringan dan aman dibagikan.

## Cara pakai

1. `npm install`
2. Edit `config.js`: `botNumber` (nomor bot), `ownerNumber` (nomor kamu), `botName`, `footer`.
3. Edit `events/sapa.js`: `TARGET_OWNERS` → nomor owner kamu.
4. Ganti isi pricelist di `plugins/apexel/pricelist.js`, pin lokasi di `plugins/apexel/lokasi.js`, dan foto QRIS di `media/Image/qris.jpg` dengan punya kamu.
5. `node index.js` lalu pairing seperti biasa.

## Peringatan

- Jangan pernah commit folder `session/`, file `.env`, atau `database.json` — itu kredensial login WA kamu. `.gitignore` di repo ini sudah menutupnya.
- Nomor owner di repo ini sudah diganti placeholder `6280000000000`. Data yang tampil (nama usaha, pricelist, lokasi, QRIS) adalah data publik Apexel Caruban.

## Kredit

Template dasar: itsliaaa/starseed. Library: @itsliaaa/baileys (fork Baileys).
