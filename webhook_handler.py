"""
webhook_handler.py — Flat procedural module for Razorpay Webhook Ingestion & Loop Closure.
Strictly adheres to codecrafters-shell-python style (15-20 lines per function, zero class bloat).
"""
import hmac
import hashlib
import json
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from constants import AUDIT_LOG_FILE, BENCHMARK_FILE, OUTPUT_DIR
from ptp_tracker import update_ptp_status


def verify_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    if not secret:
        return True
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


def record_settlement_audit(case_id: str, payment_id: str, amount_paise: int, link_id: str = None):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now().isoformat()
    record = {
        "event_id": f"evt_stl_{payment_id[-8:] if len(payment_id)>=8 else payment_id}",
        "timestamp": now,
        "case_id": case_id,
        "event_type": "SETTLEMENT_DETECTED",
        "action": "settle_payment",
        "rule_fired": "razorpay_webhook_payment_captured",
        "reason": f"Payment successfully captured via Razorpay webhook for ₹{amount_paise/100:.2f}.",
        "details": {"payment_id": payment_id, "link_id": link_id, "amount_paise": amount_paise, "status": "settled"}
    }
    with open(AUDIT_LOG_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")
    return record


def update_benchmark_ledger(case_id: str, amount_paise: int):
    if not BENCHMARK_FILE.exists():
        return False
    with open(BENCHMARK_FILE, "r") as f:
        data = json.load(f)
    data["treatment_recovered_paise"] = data.get("treatment_recovered_paise", 0) + amount_paise
    data["treatment_net_recovery_paise"] = data.get("treatment_net_recovery_paise", 0) + amount_paise
    c_net = data.get("control_net_recovery_paise", 0)
    data["net_recovery_lift_paise"] = data["treatment_net_recovery_paise"] - c_net
    if c_net > 0:
        data["net_recovery_lift_pct"] = round(data["net_recovery_lift_paise"] / c_net * 100, 2)
    with open(BENCHMARK_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)
    return True


def handle_payment_captured(payload: dict):
    payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
    notes = payment.get("notes", {})
    case_id = notes.get("case_id") or payload.get("case_id") or "unknown_case"
    pay_id = payment.get("id", f"pay_mock_{datetime.now().strftime('%H%M%S')}")
    amt = payment.get("amount", 0)
    record = record_settlement_audit(case_id, pay_id, amt, notes.get("link_id"))
    update_benchmark_ledger(case_id, amt)
    update_ptp_status(case_id, "KEPT", f"Settled via payment capture {pay_id}")
    return {"status": "success", "event": "payment.captured", "case_id": case_id, "record": record}


def handle_payment_link_paid(payload: dict):
    plink = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
    payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
    notes = plink.get("notes", {})
    case_id = notes.get("case_id") or payload.get("case_id") or "unknown_case"
    pay_id = payment.get("id") or f"pay_link_{plink.get('id', 'mock')[-6:]}"
    amt = plink.get("amount", payment.get("amount", 0))
    record = record_settlement_audit(case_id, pay_id, amt, plink.get("id"))
    update_benchmark_ledger(case_id, amt)
    update_ptp_status(case_id, "KEPT", f"Settled via payment link {pay_id}")
    return {"status": "success", "event": "payment_link.paid", "case_id": case_id, "record": record}


WEBHOOK_DISPATCH = {
    "payment.captured": handle_payment_captured,
    "payment_link.paid": handle_payment_link_paid,
    "order.paid": handle_payment_captured,
}


def dispatch_webhook(event_name: str, payload: dict):
    handler = WEBHOOK_DISPATCH.get(event_name)
    if not handler:
        return {"status": "ignored", "event": event_name, "reason": "No handler configured"}
    return handler(payload)


def build_mock_captured_payload(case_id: str, amount_paise: int, link_id: str = None):
    now_ts = int(datetime.now().timestamp())
    pay_id = f"pay_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    return {
        "event": "payment.captured",
        "account_id": "acc_testbed_001",
        "contains": ["payment"],
        "created_at": now_ts,
        "case_id": case_id,
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "entity": "payment",
                    "amount": amount_paise,
                    "currency": "INR",
                    "status": "captured",
                    "method": "card",
                    "captured": True,
                    "notes": {"case_id": case_id, "link_id": link_id or f"plink_{case_id[:8]}"},
                    "created_at": now_ts,
                }
            }
        }
    }


def simulate_testbed_capture(case_id: str, amount_paise: int = 50000, link_id: str = None):
    payload = build_mock_captured_payload(case_id, amount_paise, link_id)
    return dispatch_webhook(payload["event"], payload)


class WebhookServerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length)
        sig = self.headers.get("X-Razorpay-Signature", "")
        secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
        if not verify_signature(raw_body, sig, secret):
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error":"Invalid signature"}')
            return
        payload = json.loads(raw_body.decode())
        res = dispatch_webhook(payload.get("event", ""), payload)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(res).encode())

    def log_message(self, format, *args):
        pass


def run_webhook_server(port: int = 8080):
    server = HTTPServer(("0.0.0.0", port), WebhookServerHandler)
    print(f"Razorpay Webhook Listener running on port {port} (POST /webhook)...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
        print("\nWebhook listener stopped.")
