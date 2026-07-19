import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/buttonn'

export default function BusinessPlaceholder() {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            Business Registration
          </CardTitle>
          <CardDescription>
            Register your business details with BrowseMe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-6 text-center space-y-3">
            <p className="text-foreground font-medium">
              Business Registration Form
            </p>
            <p className="text-muted-foreground text-sm">
              This section will include fields for business registration, such as:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 text-left inline-block">
              <li>• Business License Number</li>
              <li>• Industry Classification</li>
              <li>• Business Type (LLC, Corporation, etc.)</li>
              <li>• Principal Business Activities</li>
              <li>• Employee Count</li>
            </ul>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1">
              Save Draft
            </Button>
            <Button disabled className="flex-1 bg-muted text-muted-foreground cursor-not-allowed">
              Complete Registration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
