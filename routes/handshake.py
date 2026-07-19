"""Nonce-based handshake resources."""

from flask import request
from flask_restful import Resource
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import BusinessListing, HandshakeState, Investor


def serialize_handshake(handshake: HandshakeState) -> dict:
    return {
        "nonce": handshake.nonce,
        "investor_id": handshake.investor.investor_id,
        "business_id": handshake.business_id,
        "investor_data_staged": handshake.investor_data_staged,
        "shaken": handshake.shaken,
        "unshaken": handshake.unshaken,
    }


class HandshakeResource(Resource):
    """Initiate a handshake without accepting a private payload."""

    def post(self):
        payload = request.get_json(silent=True) or {}
        investor_id = payload.get("investor_id")
        business_id = payload.get("business_id")
        nonce = payload.get("nonce")
        if not investor_id or not business_id or not nonce:
            return {"message": "investor_id, business_id, and nonce are required."}, 400

        investor = Investor.query.filter_by(investor_id=investor_id).first()
        business = db.session.get(BusinessListing, business_id)
        if investor is None:
            return {"message": "Investor not found."}, 404
        if business is None or not business.listed:
            return {"message": "Listed business not found."}, 404

        handshake = HandshakeState(nonce=nonce, investor_id=investor.id, business_id=business.id)
        db.session.add(handshake)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return {"message": "This nonce has already been used."}, 409

        return serialize_handshake(handshake), 201


class ShakeResource(Resource):
    """Accept a pending handshake and mark the staged data as released."""

    def post(self, nonce: str):
        handshake = db.session.get(HandshakeState, nonce)
        if handshake is None:
            return {"message": "Handshake not found."}, 404
        if handshake.unshaken:
            return {"message": "This handshake has been withdrawn."}, 409
        if handshake.shaken:
            return {"message": "This handshake has already been accepted."}, 409

        # Wallet/signature authentication should verify the business owner here.
        handshake.shaken = True
        handshake.investor_data_staged = False
        db.session.commit()
        return serialize_handshake(handshake), 200


class UnshakeResource(Resource):
    """Allow either participant to withdraw from a handshake."""

    def post(self, nonce: str):
        handshake = db.session.get(HandshakeState, nonce)
        if handshake is None:
            return {"message": "Handshake not found."}, 404
        if handshake.unshaken:
            return {"message": "This handshake has already been withdrawn."}, 409

        payload = request.get_json(silent=True) or {}
        actor_type = payload.get("actor_type")
        actor_id = payload.get("actor_id")
        valid_investor = actor_type == "investor" and actor_id == handshake.investor.investor_id
        valid_business = actor_type == "business" and actor_id == str(handshake.business_id)
        if not (valid_investor or valid_business):
            return {"message": "Only a handshake participant can withdraw it."}, 403

        handshake.unshaken = True
        handshake.investor_data_staged = False
        db.session.commit()
        return serialize_handshake(handshake), 200
