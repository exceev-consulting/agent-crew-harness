# Fake Telegram Bot API for the notify tests: records each request as one JSON line.
import json, sys, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
log = open(sys.argv[2], "a")
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        form = {k: v[0] for k, v in urllib.parse.parse_qs(body).items()}
        log.write(json.dumps({"path": self.path, "form": form}) + "\n"); log.flush()
        method = self.path.rsplit("/", 1)[-1]
        ok = "/botBADTOKEN" not in self.path
        result = {}
        if method == "getMe": result = {"username": "test_bot"}
        if method == "getUpdates": result = [{"update_id": 7, "message": {"chat": {"id": 555, "type": "private", "first_name": "Ada"}}}]
        res = {"ok": ok, "result": result}
        if not ok: res["description"] = "Unauthorized"
        out = json.dumps(res).encode()
        self.send_response(200 if ok else 401); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out))); self.end_headers(); self.wfile.write(out)
    do_GET = do_POST
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
