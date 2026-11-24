# API Contract — Webhook Integrasi Modul AI Face Recognition ke Web Monitoring

Dokumen ini berisi spesifikasi endpoint **Push Webhook** pada aplikasi web **Internship Monitoring (PT Bigbox)** agar backend Python AI (`app_server.py`) dapat mengirimkan hasil deteksi kehadiran secara *real-time* ke database cloud (Supabase) tanpa perlu membuka port lokal (`5000`) ke internet.

---

## 1. Base URL & Endpoint

| Keterangan | Nilai |
|---|---|
| **Base URL (Production)** | `https://internship-monitoring-one.vercel.app` |
| **Base URL (Local Dev)** | `http://localhost:3000` |
| **Method & Endpoint** | `POST /api/presence` |
| **Content-Type** | `application/json` |

URL lengkap production:

```text
https://internship-monitoring-one.vercel.app/api/presence
```

---

## 2. Autentikasi

Setiap request **wajib** menyertakan header rahasia `X-API-Secret`:

```http
POST /api/presence HTTP/1.1
Host: internship-monitoring-one.vercel.app
Content-Type: application/json
X-API-Secret: <PRESENCE_API_SECRET>
```

> **Catatan Keamanan:**
> - Nilai `<PRESENCE_API_SECRET>` dikirim terpisah melalui chat pribadi.
> - Simpan di file `.env` (jangan di-*hardcode* atau di-*commit* ke repositori Git).

---

## 3. Format Payload Request

### Contoh Payload JSON

```json
{
  "internId": "002_Felix",
  "status": "ACTIVE",
  "timestamp": "2026-11-24T02:15:00.000Z"
}
```

### Detail Field & Aturan Validasi

| Field | Tipe | Wajib | Keterangan & Validasi |
|---|---|---|---|
| `internId` | `string` | Ya | Dapat diisi langsung dengan `personnel_id` dari engine AI (contoh: `"001_Roihan"`, `"002_Felix"`, `"Raisa"`). Sistem web otomatis menghapus prefix angka + underscore (`002_Felix` → `Felix`) untuk mencocokkan nama intern di database, dan akan otomatis membuat profil intern baru jika belum terdaftar. |
| `status` | `string` (enum) | Ya | Hanya menerima salah satu dari: `"ACTIVE"`, `"IDLE"`, atau `"AWAY"`. |
| `timestamp` | `string` (ISO 8601) | Ya | Format ISO 8601 UTC (contoh: `"2026-11-24T02:15:00.000Z"`). Wajib berada dalam rentang **24 jam terakhir** dan **tidak lebih dari 5 menit ke depan** dari waktu server. |

---

## 4. Pemetaan Status AI ke Web Monitoring

Konversikan field `status` dan `physical_state` dari engine AI sebelum dikirim ke `/api/presence`:

| `status` (AI) | `physical_state` (AI) | Nilai `status` untuk Web |
|---|---|---|
| `Out-of-Region` | `Static` / `Dynamic` / apa pun | `"AWAY"` |
| `In-Region` | `Dynamic` | `"ACTIVE"` |
| `In-Region` | `Static` | `"IDLE"` |
| Lainnya / tidak dikenal | — | `"AWAY"` |

> **Info Tambahan:** Jika peserta tidak terdeteksi lagi selama **> 5 menit**, dashboard web juga otomatis menampilkan status peserta sebagai **Tidak di Tempat (`AWAY`)**.

---

## 5. Rate Limit & Rekomendasi Pengiriman

- **Batas Server:** Maksimal **60 request per menit per IP** (`HTTP 429` jika melebihi).
- **Rekomendasi di Sisi AI (`app_server.py`):**
  1. Jalankan pengiriman webhook secara **asinkron** (*background thread*, `daemon=True`) dengan `timeout=5` detik agar tidak menghambat pemrosesan frame kamera.
  2. Terapkan **throttle minimal 5 detik per `personnel_id`** jika status hasil mapping masih sama dengan yang terakhir dikirim. Jika status berubah (misalnya `ACTIVE` → `IDLE` atau `In-Region` → `Out-of-Region`), kirim langsung tanpa menunggu 5 detik.

---

## 6. Format Response & Kode Status HTTP

### `201 Created` — Log Berhasil Disimpan

```json
{
  "message": "Presence log recorded successfully.",
  "data": {
    "id": "cm3abc123xyz",
    "userId": "cm3user456",
    "status": "ACTIVE",
    "timestamp": "2026-11-24T02:15:00.000Z"
  }
}
```

### `200 OK` — Log Duplikat (Timestamp Persis Sama Diabaikan)

```json
{
  "message": "Presence log already recorded.",
  "data": {
    "id": "cm3abc123xyz"
  }
}
```

### `400 Bad Request` — Payload / Field Tidak Valid

```json
{
  "error": "Bad Request: internId, status, and timestamp are required."
}
```

Kemungkinan pesan error `400` lainnya:
- `"Bad Request: Invalid JSON body."`
- `"Bad Request: status must be one of ACTIVE, IDLE, AWAY."`
- `"Bad Request: timestamp must be a valid ISO date string."`
- `"Bad Request: timestamp must be within the last 24 hours and not in the future."`

### `401 Unauthorized` — Header `X-API-Secret` Kosong atau Salah

```json
{
  "error": "Unauthorized: Invalid or missing API secret."
}
```

### `404 Not Found` — `internId` Tidak Valid / Terlalu Pendek (< 2 Karakter)

```json
{
  "error": "Not Found: No intern found matching \"...\"."
}
```

### `429 Too Many Requests` — Melebihi Batas 60 Request/Menit

```json
{
  "error": "Too many requests."
}
```

---

## 7. Contoh Implementasi Python (Siap Pakai di `app_server.py`)

Tambahkan variabel berikut di `.env` backend AI:

```env
VERCEL_PRESENCE_URL=https://internship-monitoring-one.vercel.app/api/presence
PRESENCE_API_SECRET=<ISI_SECRET_DARI_CHAT>
```

Contoh fungsi pengiriman asinkron di Python (`app_server.py`):

```python
import os
import time
import requests
from threading import Lock, Thread
from datetime import datetime, timezone

VERCEL_PRESENCE_URL = os.environ.get(
    "VERCEL_PRESENCE_URL",
    "https://internship-monitoring-one.vercel.app/api/presence",
).strip()
PRESENCE_API_SECRET = os.environ.get("PRESENCE_API_SECRET", "").strip()

WEBHOOK_MIN_INTERVAL_SEC = 5.0
_LAST_WEBHOOK_SENT = {}
_WEBHOOK_LOCK = Lock()


def _map_ai_status(physical_state, status):
    if status == "Out-of-Region":
        return "AWAY"
    if physical_state == "Dynamic":
        return "ACTIVE"
    if physical_state == "Static":
        return "IDLE"
    return "AWAY"


def _forward_log_to_vercel(entry):
    if not VERCEL_PRESENCE_URL or not PRESENCE_API_SECRET:
        return

    pid = str(entry.get("personnel_id", "")).strip()
    if not pid:
        return

    mapped_status = _map_ai_status(entry.get("physical_state"), entry.get("status"))
    now_ts = time.time()

    with _WEBHOOK_LOCK:
        last_ts, last_status = _LAST_WEBHOOK_SENT.get(pid, (0.0, None))
        if mapped_status == last_status and (now_ts - last_ts) < WEBHOOK_MIN_INTERVAL_SEC:
            return
        _LAST_WEBHOOK_SENT[pid] = (now_ts, mapped_status)

    payload = {
        "internId": pid,
        "status": mapped_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        res = requests.post(
            VERCEL_PRESENCE_URL,
            json=payload,
            headers={"X-API-Secret": PRESENCE_API_SECRET},
            timeout=5,
        )
        if res.status_code in (200, 201):
            print(f"[WEBHOOK] Pushed {pid} ({mapped_status}) -> OK")
        else:
            print(f"[WEBHOOK] Gagal push {pid} -> HTTP {res.status_code}: {res.text[:120]}")
    except Exception as e:
        print(f"[WEBHOOK] Error koneksi ke Vercel: {e}")


def forward_log_async(entry):
    Thread(target=_forward_log_to_vercel, args=(dict(entry),), daemon=True).start()
```

Panggil `forward_log_async(data)` di dalam handler `POST /api/log` (`receive_log()`) tepat setelah log disimpan secara lokal.

---

## 8. Contoh Uji Cepat (`curl`)

```bash
curl -X POST https://internship-monitoring-one.vercel.app/api/presence \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: <PRESENCE_API_SECRET>" \
  -d "{\"internId\":\"002_Felix\",\"status\":\"ACTIVE\",\"timestamp\":\"2026-11-24T02:15:00.000Z\"}"
```

---

## 9. Checklist Integrasi untuk Tim AI

- [ ] Tambahkan `VERCEL_PRESENCE_URL` dan `PRESENCE_API_SECRET` ke `.env` backend AI.
- [ ] Pastikan `X-API-Secret` dikirim di header (bukan di body/URL).
- [ ] Gunakan format timestamp **ISO 8601 UTC** (`datetime.now(timezone.utc).isoformat()`).
- [ ] Terapkan pemetaan `Out-of-Region -> AWAY`, `Dynamic -> ACTIVE`, `Static -> IDLE`.
- [ ] Jalankan pengiriman secara *async* dengan throttle minimal 5 detik per `personnel_id` untuk status yang sama.
- [ ] Uji satu kali dengan `curl` atau jalankan kamera AI, lalu pastikan muncul log `[WEBHOOK] Pushed ... -> OK` dan status muncul di dashboard `https://internship-monitoring-one.vercel.app/admin/dashboard`.
