"""Database models for BrowseMe's public discovery and handshake state.

Sensitive form data (names, addresses, tax IDs, and revenue) is deliberately
not stored in these models.  It is represented only by commitments, matching
the privacy boundary in ``docs/spec.md``.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from extensions import db


class BusinessTrack(enum.Enum):
    """Verification paths available to a business."""

    FORMAL = "A"
    COMMUNITY_ATTESTED = "B"


class BusinessStatus(enum.Enum):
    """Public availability status shown on a business listing."""

    INVESTING = "investing"
    OPEN = "open"


class AttesterType(enum.Enum):
    """Recognized sources of a Track B attestation."""

    COMMUNITY = "community"
    RELIGIOUS = "religious"
    UNION = "union"
    EDUCATION = "education"


class Investor(db.Model):
    """An investor represented publicly by a private-form commitment."""

    __tablename__ = "investors"

    id = db.Column(db.Integer, primary_key=True)
    investor_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    commitment = db.Column(db.String(64), unique=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    handshakes = db.relationship("HandshakeState", back_populates="investor", lazy=True)


class BusinessListing(db.Model):
    """The deliberately small, publicly discoverable business record."""

    __tablename__ = "business_listings"

    id = db.Column(db.Integer, primary_key=True)
    track = db.Column(db.Enum(BusinessTrack), nullable=False)
    tier = db.Column(db.SmallInteger, nullable=False, default=0)
    status = db.Column(db.Enum(BusinessStatus), nullable=False, default=BusinessStatus.OPEN)
    sector = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    commitment = db.Column(db.String(64), unique=True, nullable=False)
    listed = db.Column(db.Boolean, nullable=False, default=False)
    attestation_count = db.Column(db.SmallInteger, nullable=False, default=0)
    has_union_attestation = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    attestations = db.relationship(
        "AttesterRecord", back_populates="business", cascade="all, delete-orphan", lazy=True
    )
    handshakes = db.relationship("HandshakeState", back_populates="business", lazy=True)

    __table_args__ = (
        db.CheckConstraint("tier BETWEEN 0 AND 3", name="business_tier_range"),
        db.CheckConstraint("attestation_count BETWEEN 0 AND 4", name="business_attestation_count_range"),
    )


class AttesterRecord(db.Model):
    """A privacy-preserving Track B attestation.

    The attester is represented by a hash; no identifying attester form data
    is persisted in the public database model.
    """

    __tablename__ = "attester_records"

    id = db.Column(db.Integer, primary_key=True)
    attester_type = db.Column(db.Enum(AttesterType), nullable=False)
    attester_hash = db.Column(db.String(64), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey("business_listings.id"), nullable=False, index=True)
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    business = db.relationship("BusinessListing", back_populates="attestations")

    __table_args__ = (
        db.UniqueConstraint("attester_hash", "business_id", name="unique_attester_per_business"),
    )


class HandshakeState(db.Model):
    """Nonce-keyed staged handshake state; private payloads are never stored here."""

    __tablename__ = "handshake_states"

    nonce = db.Column(db.String(64), primary_key=True)
    investor_id = db.Column(db.Integer, db.ForeignKey("investors.id"), nullable=False, index=True)
    business_id = db.Column(db.Integer, db.ForeignKey("business_listings.id"), nullable=False, index=True)
    investor_data_staged = db.Column(db.Boolean, nullable=False, default=True)
    shaken = db.Column(db.Boolean, nullable=False, default=False)
    unshaken = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    investor = db.relationship("Investor", back_populates="handshakes")
    business = db.relationship("BusinessListing", back_populates="handshakes")

    __table_args__ = (
        db.CheckConstraint("NOT (shaken AND unshaken)", name="handshake_not_shaken_and_unshaken"),
    )
