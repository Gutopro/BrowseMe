import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/buttonn'

export default function AttestationPlaceholder() {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            Attestation & Verification
          </CardTitle>
          <CardDescription>
            Verify your credentials and submit attestations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-6 text-center space-y-3">
            <p className="text-foreground font-medium">
              Attestation Verification
            </p>
            <p className="text-muted-foreground text-sm">
              This section will include verification steps, such as:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 text-left inline-block">
              <li>• Email Verification</li>
              <li>• Document Upload & Verification</li>
              <li>• KYC/AML Compliance Check</li>
              <li>• On-Chain Attestation</li>
              <li>• Cryptographic Commitment Hash</li>
            </ul>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1">
              Review Information
            </Button>
            <Button disabled className="flex-1 bg-muted text-muted-foreground cursor-not-allowed">
              Submit Attestation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
