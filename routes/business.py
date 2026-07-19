"""Business listing and Track B attestation resources."""

from flask import request
from flask_restful import Resource
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import AttesterRecord, AttesterType, BusinessListing, BusinessStatus, BusinessTrack


def serialize_business(business: BusinessListing) -> dict:
    """Return only the public Business Page disclosure surface."""
    return {
        "id": business.id,
        "track": business.track.value,
        "tier": business.tier,
        "status": business.status.value,
        "sector": business.sector,
        "location": business.location,
        "listed": business.listed,
    }


class BusinessListResource(Resource):
    """Browse listed businesses and register a new business."""

    def get(self):
        query = BusinessListing.query.filter_by(listed=True)

        tier = request.args.get("tier", type=int)
        if tier is not None:
            if tier not in (1, 2, 3):
                return {"message": "tier must be 1, 2, or 3."}, 400
            query = query.filter_by(tier=tier)

        for field in ("sector", "location"):
            value = request.args.get(field)
            if value:
                query = query.filter(getattr(BusinessListing, field).ilike(value))

        status = request.args.get("status")
        if status:
            try:
                query = query.filter_by(status=BusinessStatus(status.lower()))
            except ValueError:
                return {"message": "status must be 'open' or 'investing'."}, 400

        return {"businesses": [serialize_business(item) for item in query.order_by(BusinessListing.id).all()]}, 200

    def post(self):
        payload = request.get_json(silent=True) or {}
        required_fields = ("track", "sector", "location", "commitment")
        missing = [field for field in required_fields if not payload.get(field)]
        if missing:
            return {"message": f"Missing required fields: {', '.join(missing)}."}, 400

        try:
            track = BusinessTrack(payload["track"].upper())
        except ValueError:
            return {"message": "track must be 'A' or 'B'."}, 400

        business = BusinessListing(
            track=track,
            tier=2 if track is BusinessTrack.FORMAL else 0,
            status=BusinessStatus.OPEN,
            sector=payload["sector"],
            location=payload["location"],
            commitment=payload["commitment"],
            listed=track is BusinessTrack.FORMAL,
        )
        db.session.add(business)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return {"message": "A business with this commitment already exists."}, 409

        return serialize_business(business), 201


class BusinessResource(Resource):
    """Retrieve one public, listed business record."""

    def get(self, business_id: int):
        business = db.session.get(BusinessListing, business_id)
        if business is None or not business.listed:
            return {"message": "Listed business not found."}, 404
        return serialize_business(business), 200


class AttestationResource(Resource):
    """Submit a hashed attestation for a Track B business."""

    def post(self, business_id: int):
        business = db.session.get(BusinessListing, business_id)
        if business is None:
            return {"message": "Business not found."}, 404
        if business.track is not BusinessTrack.COMMUNITY_ATTESTED:
            return {"message": "Attestations apply only to Track B businesses."}, 400
        if business.attestation_count >= 4:
            return {"message": "A business can have at most four attestations."}, 400

        payload = request.get_json(silent=True) or {}
        attester_hash = payload.get("attester_hash")
        attester_type = payload.get("attester_type")
        if not attester_hash or not attester_type:
            return {"message": "attester_hash and attester_type are required."}, 400

        try:
            kind = AttesterType(attester_type.lower())
        except ValueError:
            return {"message": "Invalid attester_type."}, 400

        record = AttesterRecord(
            business_id=business.id,
            attester_hash=attester_hash,
            attester_type=kind,
        )
        db.session.add(record)
        business.attestation_count += 1
        if kind is AttesterType.UNION:
            business.has_union_attestation = True

        if business.attestation_count >= 2 and business.has_union_attestation:
            business.listed = True
            business.tier = 1 if business.attestation_count >= 4 else 2 if business.attestation_count >= 3 else 3

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return {"message": "This attester has already attested for the business."}, 409

        return {
            "attestation_count": business.attestation_count,
            "has_union_attestation": business.has_union_attestation,
            "business": serialize_business(business),
        }, 201
