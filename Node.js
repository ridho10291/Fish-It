/**
 * Logika Sisi Server (Node.js) untuk mengirim notifikasi order ke Discord.
 * CATATAN PENTING: Kode ini HANYA dapat berjalan di lingkungan Node.js/server,
 * seperti Firebase Cloud Functions atau server backend kustom.
 * Kode ini TIDAK akan berjalan di browser.
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch'); // Anda mungkin perlu menginstal 'node-fetch'

// --- 1. KONFIGURASI ---
// Ganti dengan URL Webhook Discord AKTIF Anda
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1439240496705699851/7adfPjIGMaAVA2lDZcY1MuX8AEyRDeUEF_DqnW5lQ0fTqvFDxfFxiodtvnG4IuiWpPv7'; 
// Ganti dengan App ID yang Anda gunakan di aplikasi web
const YOUR_APP_ID = 'default-app-id'; 
const COLLECTION_PATH = `artifacts/${YOUR_APP_ID}/public/data/orders`;

// Inisialisasi Firebase Admin SDK
// Jika berjalan di Firebase Cloud Functions, ini akan otomatis menggunakan kredensial default.
initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

// --- 2. FUNGSI KIRIM KE DISCORD ---
/**
 * Mengirim pesan JSON terstruktur ke Discord Webhook.
 * @param {object} orderData - Data pesanan dari Firestore.
 */
async function sendToDiscord(orderData) {
    const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(orderData.price);
    
    // Payload JSON sesuai format Discord Webhook
    const payload = {
        username: "Fish It Bot Notifier 🎣",
        avatar_url: "https://placehold.co/64x64/25D366/ffffff?text=BOT",
        embeds: [{
            title: `🔔 PESANAN BARU DITERIMA - ${orderData.orderId}`,
            description: `Order baru telah dicatat di database. Mohon segera verifikasi pembayaran dan proses pesanan ini.`,
            color: 16750899, // Warna orange-pink (HEX 0xFFA503)
            fields: [
                { name: "Order ID", value: orderData.orderId, inline: true },
                { name: "Status", value: `**${orderData.status}**`, inline: true },
                { name: "---", value: "---", inline: false },
                { name: "Item Order", value: orderData.item, inline: false },
                { name: "Total Harga", value: rupiah, inline: true },
                { name: "ID Akun Pelanggan", value: orderData.userID, inline: true },
                { name: "Customer UID (DB)", value: orderData.customerUID, inline: false },
                { name: "Dibuat Pada", value: new Date().toLocaleString('id-ID'), inline: false }
            ],
            footer: {
                text: "Diproses oleh Server Notifikasi JokiFishtstore"
            }
        }]
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`[DISCORD] Notifikasi Order ${orderData.orderId} berhasil dikirim.`);
        } else {
            console.error(`[DISCORD] Gagal mengirim notifikasi. Kode Status: ${response.status}`);
        }
    } catch (error) {
        console.error("[DISCORD] Error saat melakukan fetch:", error);
    }
}

// --- 3. FIRESTORE LISTENER (Mekanisme polling/real-time) ---
function startOrderListener() {
    console.log(`Mulai memantau koleksi: ${COLLECTION_PATH}`);
    
    // Query untuk memantau koleksi
    const collectionRef = db.collection(COLLECTION_PATH);

    // Listener real-time menggunakan onSnapshot
    collectionRef.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            // Kita hanya peduli pada dokumen yang BARU ditambahkan
            if (change.type === "added") {
                const newOrder = change.doc.data();
                const docId = change.doc.id;
                
                // Panggil fungsi pengiriman notifikasi
                sendToDiscord({ ...newOrder, docId }); 
                
                console.log(`[FIRESTORE] Pesanan baru terdeteksi: ${newOrder.orderId}`);
            }
        });
    }, err => {
        console.error(`[FIRESTORE] Error dalam listener: ${err}`);
    });
}

// Jalankan listener saat server dimulai
startOrderListener();