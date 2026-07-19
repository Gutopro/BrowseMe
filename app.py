"""Flask application initialization for BrowseMe."""

import os

from flask import Flask
from flask_cors import CORS
from extensions import db


def create_app() -> Flask:
    """Create and configure the BrowseMe Flask application."""
    app = Flask(__name__)
    cors_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-me"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///browseme.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        CORS_ORIGINS=cors_origins,
    )

    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

    from routes import register_resources

    register_resources(app)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
