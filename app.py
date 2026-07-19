"""Flask application initialization for BrowseMe."""

import os

from flask import Flask
from extensions import db


def create_app() -> Flask:
    """Create and configure the BrowseMe Flask application."""
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-me"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///browseme.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    db.init_app(app)

    from routes import register_resources

    register_resources(app)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
