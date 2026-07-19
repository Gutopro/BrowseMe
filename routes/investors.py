"""Investor registration resource."""

from flask import request
from flask_restful import Resource
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import Investor


class InvestorResource(Resource):
    """Create commitment-only investor records."""

    def post(self):
        payload = request.get_json(silent=True) or {}
        investor_id = payload.get("investor_id")
        commitment = payload.get("commitment")

        if not investor_id or not commitment:
            return {"message": "investor_id and commitment are required."}, 400

        investor = Investor(investor_id=investor_id, commitment=commitment)
        db.session.add(investor)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return {"message": "An investor with this ID or commitment already exists."}, 409

        return {
            "id": investor.id,
            "investor_id": investor.investor_id,
            "commitment": investor.commitment,
        }, 201
