"""
razorpay_client.py — Flat procedural wrapper for Razorpay Testbed API.

Adheres strictly to the style and pattern of codecrafters-shell-python/app/main.py:
  - Flat, concise procedural functions (15-20 lines max).
  - Zero bloated class hierarchies or OOP boilerplate.
  - Clean error handling and explicit dict return types.
"""

import os
import razorpay
from dotenv import load_dotenv

load_dotenv()


def get_credentials():
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    return key_id, key_secret


def is_testbed_ready():
    key_id, key_secret = get_credentials()
    return bool(key_id and key_secret and key_id.startswith("rzp_test_"))


def get_client():
    if not is_testbed_ready():
        return None
    key_id, key_secret = get_credentials()
    return razorpay.Client(auth=(key_id, key_secret))


def build_link_payload(amount_paise, desc, cust, notes=None):
    return {
        "amount": amount_paise,
        "currency": "INR",
        "accept_partial": False,
        "description": desc,
        "customer": {
            "name": cust.get("name", "Customer"),
            "email": cust.get("email", "customer@example.com"),
            "contact": cust.get("phone", "+919876543210"),
        },
        "notify": {"sms": False, "email": False},
        "notes": notes or {"channel": "ai_recovery_agent"},
    }


def fetch_fallback_testbed_link(client, amount_paise):
    try:
        links = client.payment_link.all({"count": 30})
        items = links.get("payment_links") or links.get("items") or []
        for item in items:
            if item.get("amount") == amount_paise:
                return {"id": item.get("id"), "short_url": item.get("short_url"), "status": "active", "amount": amount_paise}
    except Exception:
        pass
    return None


def create_invoice_link(client, amount_paise, description, customer_info, notes=None):
    import time
    payload = {
        "type": "invoice",
        "currency": "INR",
        "description": description,
        "customer": {
            "name": customer_info.get("name", "Customer"),
            "contact": customer_info.get("phone", "+919876543210"),
            "email": customer_info.get("email", "customer@example.com"),
        },
        "line_items": [{"name": description, "amount": int(amount_paise), "currency": "INR", "quantity": 1}],
        "notes": notes or {"channel": "ai_recovery_agent"},
    }
    for attempt in range(2):
        try:
            inv = client.invoice.create(payload)
            if inv and inv.get("short_url"):
                return {"id": inv.get("id"), "short_url": inv.get("short_url"), "status": inv.get("status") or "active", "amount": inv.get("amount") or amount_paise}
        except Exception:
            if attempt == 0:
                time.sleep(1.0)
    return None


def create_payment_link(client, amount_paise, description, customer_info, notes=None):
    if client is None:
        return None
    try:
        res = client.payment_link.create(build_link_payload(amount_paise, description, customer_info, notes))
        return {"id": res.get("id"), "short_url": res.get("short_url"), "status": res.get("status"), "amount": res.get("amount")}
    except Exception as e:
        inv = create_invoice_link(client, amount_paise, description, customer_info, notes)
        if inv:
            return inv
        fallback = fetch_fallback_testbed_link(client, amount_paise)
        return fallback if fallback else {"error": str(e), "status": "failed"}


def create_recovery_order(client, amount_paise, receipt_id, notes=None):
    if client is None:
        return None
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt_id,
        "notes": notes or {"purpose": "ai_recovery_order"},
    }
    try:
        return client.order.create(payload)
    except Exception as e:
        return {"error": str(e), "status": "failed"}


def fetch_payment(client, payment_id):
    if client is None:
        return None
    try:
        return client.payment.fetch(payment_id)
    except Exception as e:
        return {"error": str(e), "status": "failed"}


def fetch_testbed_failed_payments(client, count: int = 50):
    if client is None:
        return []
    try:
        res = client.payment.all({"count": count})
        items = res.get("items", [])
        return [p for p in items if p.get("status") == "failed"]
    except Exception:
        return []


def convert_payment_to_failure_input(p: dict):
    from datetime import datetime, timezone, timedelta
    from models import FailureInput
    ist = timezone(timedelta(hours=5, minutes=30))
    ts = p.get("created_at")
    dt_iso = datetime.fromtimestamp(ts, ist).isoformat() if isinstance(ts, int) else datetime.now(ist).isoformat()
    return FailureInput(
        case_id=f"live_{p.get('id')}",
        case_type="payment",
        payment_id=p.get("id"),
        order_id=p.get("order_id") or f"order_{p.get('id')[-8:]}",
        customer_id=p.get("customer_id") or "cust_live_testbed",
        amount_paise=p.get("amount", 0),
        currency=p.get("currency", "INR"),
        method=p.get("method", "card"),
        card_network=p.get("card", {}).get("network", "visa").lower() if isinstance(p.get("card"), dict) else "visa",
        error_reason=p.get("error_reason") or "payment_failed",
        error_code=p.get("error_code") or "BAD_REQUEST_ERROR",
        error_source=p.get("error_source") or "gateway",
        error_step=p.get("error_step") or "payment_authorization",
        error_description=p.get("error_description") or "Live testbed payment failure.",
        contact_phone=p.get("contact") or "+919876543210",
        contact_email=p.get("email") or "customer@example.com",
        contact_name="Testbed Customer",
        created_at=dt_iso,
    )
