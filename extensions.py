"""Shared Flask extension instances.

Keeping extensions outside the application factory avoids circular imports
between the app, models, and route resources.
"""

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
