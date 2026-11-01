// events/indonesia-only.js — hanya respon nomor +62 (Indonesia)
// Dipakai di socket.js: kalau pengirim BUKAN +62, sapa + AI di-skip.
// Alasan: pelanggan Apexel semuanya +62; nomor layanan luar (notif IG/FB/dll)
// umumnya bukan +62. Pelanggan yang pakai WA Bisnis +62 TETAP dilayani.
//
// Resolusi nomor:
//  1. JID @s.whatsapp.net langsung = nomor HP.
//  2. JID @lid -> pakai remoteJidAlt (JID nomor HP) kalau ada.
//  3. Kalau tidak ada -> resolve via sock.findUserId(lid).
// Kalau nomor tidak bisa diverifikasi (error), ANGGAP +62 (jangan sampai
// pelanggan asli ke-skip gara-gara glitch resolusi).

export async function isIndonesianNumber(sock, message) {
  const jid = message?.key?.remoteJid;
  if (!jid) return true;

  // Hanya chat pribadi — grup bukan urusan sapa/AI
  const isPrivate = jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
  if (!isPrivate) return true;

  let number = null;

  if (jid.endsWith('@s.whatsapp.net')) {
    number = jid.split('@')[0].split(':')[0];
  } else {
    const alt = message?.key?.remoteJidAlt;
    if (alt && alt.endsWith('@s.whatsapp.net')) {
      number = alt.split('@')[0].split(':')[0];
    } else {
      try {
        const res = await sock.findUserId(jid);
        const phone = res?.phoneNumber || '';
        if (phone) number = phone.split('@')[0].split(':')[0];
      } catch (e) {
        // Gagal resolve — anggap +62, jangan blokir
        return true;
      }
    }
  }

  if (!number) return true;
  const ok = number.startsWith('62');
  if (!ok) console.log('[NON-ID-SKIP] ' + jid + ' — bukan +62, sapa + AI di-skip');
  return ok;
}
