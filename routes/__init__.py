"""HTTP resource registration for BrowseMe."""

from flask_restful import Api

from routes.business import AttestationResource, BusinessListResource, BusinessResource
from routes.handshake import HandshakeResource, ShakeResource, UnshakeResource
from routes.investors import InvestorResource


def register_resources(app) -> Api:
    """Attach the public API resources to a Flask application."""
    api = Api(app)
    api.add_resource(InvestorResource, "/investors")
    api.add_resource(BusinessListResource, "/businesses")
    api.add_resource(BusinessResource, "/businesses/<int:business_id>")
    api.add_resource(AttestationResource, "/businesses/<int:business_id>/attestations")
    api.add_resource(HandshakeResource, "/handshakes")
    api.add_resource(ShakeResource, "/handshakes/<string:nonce>/shake")
    api.add_resource(UnshakeResource, "/handshakes/<string:nonce>/unshake")
    return api
