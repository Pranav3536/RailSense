"""
RailSense — API Documentation Endpoints (backend/app/api/docs.py)
Serves Swagger UI and OpenAPI 3.0 specification.
"""

import json
from pathlib import Path
from flask import Blueprint, jsonify, render_template_string

docs_bp = Blueprint('docs', __name__)

DOCS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "docs"
OPENAPI_JSON_PATH = DOCS_DIR / "openapi.json"

SWAGGER_UI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RailSense API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" >
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; font-family: sans-serif; }
    .topbar { display: none !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
  window.onload = function() {
    window.ui = SwaggerUIBundle({
      url: "/api/openapi.json",
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "StandaloneLayout"
    });
  };
  </script>
</body>
</html>
"""


@docs_bp.route('/docs', methods=['GET'])
def get_swagger_ui():
    """Renders interactive Swagger UI documentation."""
    return render_template_string(SWAGGER_UI_HTML), 200, {'Content-Type': 'text/html; charset=utf-8'}


@docs_bp.route('/openapi.json', methods=['GET'])
def get_openapi_json():
    """Returns OpenAPI 3.0 specification as JSON."""
    if not OPENAPI_JSON_PATH.exists():
        return jsonify({
            "error": {
                "code": "SPEC_NOT_FOUND",
                "message": f"OpenAPI spec not found at {OPENAPI_JSON_PATH}"
            }
        }), 404

    with open(OPENAPI_JSON_PATH, "r", encoding="utf-8") as f:
        spec = json.load(f)

    return jsonify(spec), 200
