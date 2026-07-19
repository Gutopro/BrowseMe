"""Create the BrowseMe schema and seed fictional, privacy-safe demo data.

Run with ``python init_db.py`` after installing ``requirements.txt``.
"""

from __future__ import annotations

from hashlib import sha256

from app import app, db
from models import (
    AttesterRecord,
    AttesterType,
    BusinessListing,
    BusinessStatus,
    BusinessTrack,
    HandshakeState,
    Investor,
)


def commitment(value: str) -> str:
    """Return a deterministic placeholder for a 32-byte private commitment."""
    return sha256(value.encode("utf-8")).hexdigest()


def get_or_create_investor(investor_id: str) -> Investor:
    investor = Investor.query.filter_by(investor_id=investor_id).first()
    if investor is None:
        investor = Investor(investor_id=investor_id, commitment=commitment(f"investor:{investor_id}"))
        db.session.add(investor)
        db.session.flush()
    return investor


def get_or_create_business(
    key: str,
    *,
    track: BusinessTrack,
    tier: int,
    sector: str,
    location: str,
    listed: bool,
    attestation_count: int = 0,
    has_union_attestation: bool = False,
) -> BusinessListing:
    business_commitment = commitment(f"business:{key}")
    business = BusinessListing.query.filter_by(commitment=business_commitment).first()
    if business is None:
        business = BusinessListing(
            track=track,
            tier=tier,
            status=BusinessStatus.OPEN,
            sector=sector,
            location=location,
            commitment=business_commitment,
            listed=listed,
            attestation_count=attestation_count,
            has_union_attestation=has_union_attestation,
        )
        db.session.add(business)
        db.session.flush()
    return business


def add_attestation(business: BusinessListing, kind: AttesterType, label: str) -> None:
    attester_hash = commitment(f"attester:{label}")
    exists = AttesterRecord.query.filter_by(
        business_id=business.id, attester_hash=attester_hash
    ).first()
    if exists is None:
        db.session.add(
            AttesterRecord(
                business_id=business.id,
                attester_type=kind,
                attester_hash=attester_hash,
            )
        )


def seed_database() -> None:
    """Create tables and insert demo data without duplicating existing rows."""
    db.create_all()

    ade = get_or_create_investor("demo-investor-ade")
    zainab = get_or_create_investor("demo-investor-zainab")

    green_harvest = get_or_create_business(
        "green-harvest",
        track=BusinessTrack.FORMAL,
        tier=2,
        sector="Agriculture",
        location="Kwara",
        listed=True,
    )
    loom_craft = get_or_create_business(
        "loom-craft",
        track=BusinessTrack.COMMUNITY_ATTESTED,
        tier=2,
        sector="Fashion & Textiles",
        location="Lagos",
        listed=True,
        attestation_count=3,
        has_union_attestation=True,
    )
    coastal_labs = get_or_create_business(
        "coastal-labs",
        track=BusinessTrack.COMMUNITY_ATTESTED,
        tier=0,
        sector="Technology",
        location="Rivers",
        listed=False,
        attestation_count=1,
        has_union_attestation=True,
    )

    add_attestation(loom_craft, AttesterType.COMMUNITY, "loom-craft-community")
    add_attestation(loom_craft, AttesterType.UNION, "loom-craft-union")
    add_attestation(loom_craft, AttesterType.EDUCATION, "loom-craft-education")
    add_attestation(coastal_labs, AttesterType.UNION, "coastal-labs-union")

    pending_nonce = commitment("handshake:ade-to-loom-craft")
    if db.session.get(HandshakeState, pending_nonce) is None:
        db.session.add(
            HandshakeState(
                nonce=pending_nonce,
                investor_id=ade.id,
                business_id=loom_craft.id,
                investor_data_staged=True,
            )
        )

    accepted_nonce = commitment("handshake:zainab-to-green-harvest")
    if db.session.get(HandshakeState, accepted_nonce) is None:
        db.session.add(
            HandshakeState(
                nonce=accepted_nonce,
                investor_id=zainab.id,
                business_id=green_harvest.id,
                investor_data_staged=True,
                shaken=True,
            )
        )

    db.session.commit()


if __name__ == "__main__":
    with app.app_context():
        seed_database()
    print("BrowseMe database initialized with demo data.")
