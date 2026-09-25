"""API du parcours RoboFête : sert le contenu pédagogique (blocs, quiz, missions).

Déployée en AWS Lambda (Function URL) par Amplify Gen 2, voir amplify/backend.ts.
Aucune donnée personnelle n'est collectée.
"""

import json
from pathlib import Path

CONTENT = json.loads((Path(__file__).parent / "content.json").read_text(encoding="utf-8"))

HEADERS = {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300"}


def _response(status, body):
    return {"statusCode": status, "headers": HEADERS, "body": json.dumps(body, ensure_ascii=False)}


def handler(event, context):
    path = (event.get("rawPath") or "/").rstrip("/") or "/"
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")

    if method != "GET":
        return _response(405, {"error": "method not allowed"})
    if path == "/content":
        return _response(200, CONTENT)
    if path == "/health":
        return _response(200, {"status": "ok"})
    return _response(404, {"error": "not found"})
