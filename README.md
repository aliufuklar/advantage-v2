# AdVantage ERP/CRM v2

**Durum:** İnşa ediliyor
**Tarih:** 1 Mayıs 2026
**Versiyon:** v3.0.0 (Sektörel MVP)

---

## Genel Bakış

Reklam ajansları, tabela firmaları ve baskı işletmeleri için sektörel ERP/CRM sistemi.

### Hedef Kitle
- Reklam ajansları
- Tabela firmaları
- Baskı işletmeleri

### Temel Özellikler

| Modül | Durum |
|--------|--------|
| Auth & RBAC | İnşa ediliyor |
| Müşteriler | İnşa ediliyor |
| Teklifler | İnşa ediliyor |
| Siparişler | İnşa ediliyor |
| Keşifler | İnşa ediliyor |
| Üretim | İnşa ediliyor |
| Stok | İnşa ediliyor |
| Finans | İnşa ediliyor |
| Personel | İnşa ediliyor |

---

## Teknoloji Stack

### Frontend
- React 19 + TypeScript
- Vite
- TailwindCSS
- TanStack Query
- Zustand
- Recharts
- Fabric.js

### Backend
- FastAPI
- MongoDB (Motor)
- Pydantic v2
- JWT + MFA

---

## Mimari

```
/
├── apps/
│   ├── web/          # React Frontend
│   └── api/          # FastAPI Backend
├── packages/
│   └── shared/       # Paylaşılan tipler
└── docs/              # Dokümantasyon
```

---

## Geliştirme

```bash
# Backend
cd apps/api
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd apps/web
npm install
npm run dev
```

---

## Lisans

Proprietary - Tüm hakları saklıdır.
