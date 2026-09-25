"""Serveur de développement local qui rejoue le handler Lambda : python backend/local_server.py"""

from http.server import BaseHTTPRequestHandler, HTTPServer

from app.handler import handler


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        res = handler({"rawPath": self.path, "requestContext": {"http": {"method": "GET"}}}, None)
        self.send_response(res["statusCode"])
        for key, value in res["headers"].items():
            self.send_header(key, value)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(res["body"].encode("utf-8"))


if __name__ == "__main__":
    print("API locale sur http://localhost:8000")
    HTTPServer(("", 8000), Handler).serve_forever()
