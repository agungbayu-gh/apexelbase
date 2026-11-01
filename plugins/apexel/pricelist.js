const PRICELIST_TEXT = `*Pricelist Apexel Caruban* ✅

• *PAKET A* — Rp30.000/hari  
  - Lensa Apexel, Remote Bluetooth  

• *PAKET B* — Rp50.000/hari  
  - Lensa Apexel, Remote Bluetooth, Tripod 2 Meter  

• *PAKET C* — Rp70.000/hari  
  - Lensa Apexel, Remote Bluetooth, Tripod 2 Meter, Kursi Lipat 2 pcs  

• *PAKET LENGKAP* — Rp75.000/hari  
  - Lensa Apexel, Remote Bluetooth, Tripod 2 Meter, Kursi Lipat 2 pcs, Meja Lipat  

• *PAKET 1* — Rp20.000/hari  
  - Kursi Lipat 2 pcs  

• *PAKET 2* — Rp25.000/hari  
  - Kursi Lipat 2 pcs, Meja Lipat  

• *PAKET 3* — Rp30.000/hari  
  - Kursi Lipat 2 pcs, Meja Lipat, Tripod 2 Meter  

• *TIKAR PIKNIK* — Rp15.000/hari  
  - Ukuran 200x200cm, muat 6–8 orang  

• *KOMPOR PORTABLE* — Rp50.000/hari  
  - Include gas, koper, wajan anti lengket, capit, & sumpit  

• *SEWA SATUAN* (per hari)  
  - Quadpod Mixio — Rp20.000  
  - Tripod 2m — Rp10.000  
  - Kursi Lipat — Rp12.000  
  - Meja Lipat — Rp8.000  
  - Kacamata — Rp5.000  
  - Topi Bucket — Rp5.000  
  - Keranjang Piknik — Rp10.000

_Piknik Jadi Makin Aesthetic✨_`

export default {
   command: 'pricelist',
   hidden: ['price', 'harga', 'menu'],
   category: 'info',

   async run(m, {
      sock,
      footer
   }) {

      const jid = m.key.remoteJid

      await sock.sendMessage(jid, {
         text: PRICELIST_TEXT
      }, {
         quoted: m
      })

      await new Promise(r =>
         setTimeout(r, 800)
      )

      await sock.sendMessage(jid, {
         text:
'Pilih paket yang ingin disewa.\n\nSistem akan otomatis membuat invoice QRIS.',
         footer: footer,
         title: 'Menu Rental Apexel',
         buttonText: 'Klik Untuk Memilih',

         sections: [
            {
               title: '📸 PAKET FOTOGRAFI',
               rows: [
                  {
                     title: 'Paket A',
                     description:
'🏷️ Rp30rb | Lensa + Remote',
                     rowId:
`.bayar 30000 Paket_A`
                  },
                  {
                     title: 'Paket B',
                     description:
'🏷️ Rp50rb | Lensa + Remote + Tripod',
                     rowId:
`.bayar 50000 Paket_B`
                  },
                  {
                     title: 'Paket C',
                     description:
'🏷️ Rp70rb | Lensa + Tripod + 2 Kursi',
                     rowId:
`.bayar 70000 Paket_C`
                  },
                  {
                     title: 'Paket Lengkap',
                     description:
'🏷️ Rp75rb | Full Set Aesthetic',
                     rowId:
`.bayar 75000 Paket_Lengkap`
                  }
               ]
            },

            {
               title: '⛺ PAKET CAMPING / PIKNIK',
               rows: [
                  {
                     title: 'Paket 1',
                     description:
'🏷️ Rp20rb | 2 Kursi Lipat',
                     rowId:
`.bayar 20000 Paket_1`
                  },
                  {
                     title: 'Paket 2',
                     description:
'🏷️ Rp25rb | 2 Kursi + Meja',
                     rowId:
`.bayar 25000 Paket_2`
                  },
                  {
                     title: 'Paket 3',
                     description:
'🏷️ Rp30rb | 2 Kursi + Meja + Tripod',
                     rowId:
`.bayar 30000 Paket_3`
                  }
               ]
            },

            {
               title: '🍳 MASAK & ALAS',
               rows: [
                  {
                     title: 'Kompor Portable',
                     description:
'🏷️ Rp50rb | Set Lengkap + Gas',
                     rowId:
`.bayar 50000 Kompor_Portable`
                  },
                  {
                     title: 'Tikar Piknik',
                     description:
'🏷️ Rp15rb | 200x200cm',
                     rowId:
`.bayar 15000 Tikar_Piknik`
                  }
               ]
            },

            {
               title: '🛡️ SEWA SATUAN',
               rows: [
                  {
                     title: 'Quadpod Mixio',
                     description:
'🏷️ Rp20.000',
                     rowId:
`.bayar 20000 Quadpod_Mixio`
                  },
                  {
                     title: 'Kursi Lipat',
                     description:
'🏷️ Rp12.000',
                     rowId:
`.bayar 12000 Kursi_Lipat`
                  },
                  {
                     title: 'Tripod 2m',
                     description:
'🏷️ Rp10.000',
                     rowId:
`.bayar 10000 Tripod_2m`
                  },
                  {
                     title: 'Meja Lipat',
                     description:
'🏷️ Rp8.000',
                     rowId:
`.bayar 8000 Meja_Lipat`
                  },
                  {
                     title: 'Keranjang Piknik',
                     description:
'🏷️ Rp10.000',
                     rowId:
`.bayar 10000 Keranjang_Piknik`
                  },
                  {
                     title: 'Kacamata',
                     description:
'🏷️ Rp5.000',
                     rowId:
`.bayar 5000 Kacamata`
                  },
                  {
                     title: 'Topi Bucket',
                     description:
'🏷️ Rp5.000',
                     rowId:
`.bayar 5000 Topi_Bucket`
                  }
               ]
            }
         ]
      }, {
         quoted: m
      })
   },

   group: false,
   private: false,
   owner: false,
   partner: false,
   admin: false,
   botAdmin: false,
   limit: 1
}
