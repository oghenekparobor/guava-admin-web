# Admin Analytics Endpoints

All endpoints support an optional `start_date` query parameter (default: "2025-06-03") to filter data from a specific date.

Example: `GET /dashboard/admin-details/user-growth/weekly/?start_date=2025-01-01`

## User Growth Metrics

### 1. Weekly User Growth Rate
**Endpoint:** `GET /dashboard/admin-details/user-growth/weekly/`

**Response:**
```json
{
  "results": [
    {
      "week_start": "2025-10-27T00:00:00Z",
      "new_users": 150,
      "prev_week_users": 120,
      "growth_rate_percentage": 25.0
    }
  ]
}
```

### 2. Monthly User Growth Rate
**Endpoint:** `GET /dashboard/admin-details/user-growth/monthly/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "month_start": "2025-10-01T00:00:00Z",
      "new_users": 500,
      "prev_month_users": 400,
      "growth_rate_percentage": 25.0
    }
  ]
}
```

### 3. Quarterly User Growth
**Endpoint:** `GET /dashboard/admin-details/user-growth/quarterly/`

**Response:**
```json
{
  "results": [
    {
      "quarter": "2025-Q4",
      "quarter_start": "2025-10-01T00:00:00Z",
      "new_users": 1500,
      "prev_quarter_users": 1200,
      "growth_rate_percentage": 25.0
    }
  ]
}
```

---

## Transaction Volume & Revenue Metrics

### 4. Monthly Transaction Volume & Revenue
**Endpoint:** `GET /dashboard/admin-details/revenue/monthly/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "total_transactions": 5000,
      "total_volume": 250000.50,
      "total_revenue": 12500.25,
      "avg_transaction_amount": 50.0,
      "active_users": 450,
      "revenue_per_user": 27.78
    }
  ]
}
```

### 5. Quarterly Revenue
**Endpoint:** `GET /dashboard/admin-details/revenue/quarterly/`

**Response:**
```json
{
  "results": [
    {
      "quarter": "2025-Q4",
      "quarter_start": "2025-10-01T00:00:00Z",
      "total_transactions": 15000,
      "total_volume": 750000.0,
      "total_revenue": 37500.0,
      "avg_fee_per_transaction": 2.5,
      "active_users": 1200
    }
  ]
}
```

### 6. Annual Revenue
**Endpoint:** `GET /dashboard/admin-details/revenue/annual/`

**Response:**
```json
{
  "results": [
    {
      "year": 2025,
      "total_transactions": 60000,
      "total_volume": 3000000.0,
      "total_revenue": 150000.0,
      "avg_transaction_amount": 50.0,
      "active_users": 5000,
      "avg_revenue_per_transaction": 2.5
    }
  ]
}
```

### 7. Weekly Transaction Growth Rate
**Endpoint:** `GET /dashboard/admin-details/revenue/weekly-growth/`

**Response:**
```json
{
  "results": [
    {
      "week_start": "2025-10-27T00:00:00Z",
      "transaction_count": 1200,
      "weekly_revenue": 6000.0,
      "prev_week_revenue": 5500.0,
      "revenue_growth_percentage": 9.09
    }
  ]
}
```

---

## Deposit Analytics

### 8. Monthly Deposit Metrics
**Endpoint:** `GET /dashboard/admin-details/deposits/monthly/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "total_deposits": 1500,
      "total_deposit_amount": 500000.0,
      "total_deposit_fees": 7500.0,
      "avg_deposit_amount": 333.33,
      "unique_depositors": 800,
      "successful_deposits": 1450,
      "success_rate_percentage": 96.67
    }
  ]
}
```

---

## User Engagement Metrics

### 9. Monthly Active Users (MAU)
**Endpoint:** `GET /dashboard/admin-details/engagement/mau/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "monthly_active_users": 1200,
      "total_transactions": 5000,
      "avg_transactions_per_user": 4.17
    }
  ]
}
```

### 10. User Retention Rate
**Endpoint:** `GET /dashboard/admin-details/engagement/retention/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "active_users": 1200,
      "returning_users": 950,
      "retention_rate_percentage": 79.17
    }
  ]
}
```

---

## KYC Verification Metrics

### 11. Monthly KYC Verification Stats
**Endpoint:** `GET /dashboard/admin-details/kyc/monthly-stats/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "total_verifications": 500,
      "approved": 450,
      "rejected": 30,
      "pending": 20,
      "approval_rate_percentage": 90.0,
      "countries_served": 15
    }
  ]
}
```

### 12. User KYC Status Distribution
**Endpoint:** `GET /dashboard/admin-details/kyc/status-distribution/`

**Response:**
```json
{
  "results": [
    {
      "kyc_status": "verified",
      "user_count": 3500,
      "percentage": 70.0
    },
    {
      "kyc_status": "pending",
      "user_count": 1000,
      "percentage": 20.0
    },
    {
      "kyc_status": "not-started",
      "user_count": 500,
      "percentage": 10.0
    }
  ]
}
```

---

## Transaction Type Breakdown

### 13. Monthly Transaction Type Analysis
**Endpoint:** `GET /dashboard/admin-details/transaction-types/monthly/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "transaction_type": "wallet",
      "entry_type": "debit",
      "transaction_count": 2500,
      "total_amount": 125000.0,
      "total_fees": 6250.0,
      "avg_amount": 50.0
    }
  ]
}
```

---

## Revenue by Currency

### 14. Monthly Revenue by Currency
**Endpoint:** `GET /dashboard/admin-details/revenue/by-currency/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "currency": "USDC",
      "transaction_count": 5000,
      "total_volume": 250000.0,
      "total_revenue": 12500.0
    },
    {
      "month": "2025-10",
      "currency": "NGN",
      "transaction_count": 1000,
      "total_volume": 50000000.0,
      "total_revenue": 2500000.0
    }
  ]
}
```

---

## Geographic Insights

### 15. User Distribution by Country
**Endpoint:** `GET /dashboard/admin-details/geography/user-distribution/`

**Response:**
```json
{
  "results": [
    {
      "country_code": "NGA",
      "user_count": 3500,
      "percentage": 70.0,
      "verified_users": 2800
    },
    {
      "country_code": "GHA",
      "user_count": 1000,
      "percentage": 20.0,
      "verified_users": 800
    }
  ]
}
```

---

## Cohort Analysis

### 16. User Cohort by Month
**Endpoint:** `GET /dashboard/admin-details/cohort/monthly/`

**Response:**
```json
{
  "results": [
    {
      "cohort": "2025-10",
      "cohort_size": 500,
      "total_revenue": 25000.0,
      "avg_revenue_per_user": 50.0,
      "lifetime_value": 50.0
    }
  ]
}
```

---

## Bank Transfer Metrics

### 17. Monthly Bank Transfer Stats
**Endpoint:** `GET /dashboard/admin-details/bank-transfers/monthly/`

**Response:**
```json
{
  "results": [
    {
      "month": "2025-10",
      "country": "Nigeria",
      "transfer_count": 2000,
      "total_amount": 100000000.0,
      "successful_transfers": 1950,
      "success_rate_percentage": 97.5
    }
  ]
}
```

---

## Performance Summary Dashboard

### 18. Overall Platform Health
**Endpoint:** `GET /dashboard/admin-details/health/overview/`

**Description:** Returns last 30 days metrics (no start_date parameter)

**Response:**
```json
{
  "new_users_30d": 250,
  "active_users_30d": 1500,
  "transactions_30d": 6000,
  "revenue_30d": 30000.0,
  "kyc_submissions_30d": 150,
  "deposits_30d": 500
}
```

---

## Existing Endpoints (Previously Implemented)

### Transaction Status Analysis
**Endpoint:** `GET /dashboard/admin-details/status-analysis/`

### User Level Transaction Category Analysis
**Endpoint:** `GET /dashboard/admin-details/user-category-analysis/`

### Comparative Analysis of Transaction Categories
**Endpoint:** `GET /dashboard/admin-details/category-comparative/`

### Monthly Transaction Volume by Category
**Endpoint:** `GET /dashboard/admin-details/monthly-category-volume/`

### Detailed Transaction Type and Source Analysis
**Endpoint:** `GET /dashboard/admin-details/type-source-analysis/`

### Transaction Volume Over Time
**Endpoint:** `GET /dashboard/admin-details/volume-over-time/`

---

## Authentication

All endpoints require the `require_app_source_validation` decorator, which means they need proper authentication headers to access.

## Notes

1. All date fields in responses are in ISO 8601 format
2. All monetary values are rounded to 2 decimal places
3. Growth percentages and rates are also rounded to 2 decimal places
4. The default `start_date` is "2025-06-03" but can be overridden via query parameter
5. Results are typically ordered by date (newest first) unless otherwise specified
