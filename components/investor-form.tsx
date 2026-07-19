'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/buttonn'
import { Input } from './ui/inputt'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

const REGIONS = [
  'North America',
  'Europe',
  'Asia Pacific',
  'Latin America',
  'Middle East & Africa',
]

export default function InvestorForm() {
  const [formData, setFormData] = useState({
    taxId: '',
    companyName: '',
    address: '',
    region: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (field: string, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Form submission logic would go here
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const isFormComplete =
    formData.taxId && formData.companyName && formData.address && formData.region

  return (
    <div className="space-y-8">
      {/* Security Alert Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 font-semibold">
          Your Data Privacy is Protected
        </AlertTitle>
        <AlertDescription className="text-blue-800 mt-2 space-y-2">
          <p>
            Your sensitive identity and tax data are written exclusively to local Private State. 
            Only a cryptographic commitment hash goes on-chain.
          </p>
          <p className="text-xs opacity-80">
            This ensures your personal information remains private while maintaining verifiable authenticity on the blockchain.
          </p>
        </AlertDescription>
      </Alert>

      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle>Investor Information</CardTitle>
          <CardDescription>
            Please provide your company details to complete the investor registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Tax ID */}
            <div className="space-y-2">
              <label htmlFor="taxId" className="block text-sm font-medium text-foreground">
                Company Tax ID <span className="text-red-500">*</span>
              </label>
              <Input
                id="taxId"
                placeholder="e.g., 12-3456789"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                className="h-10"
                required
              />
              <p className="text-xs text-muted-foreground">
                Your tax identification number (securely stored locally)
              </p>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="companyName"
                placeholder="e.g., Acme Ventures LLC"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="h-10"
                required
              />
              <p className="text-xs text-muted-foreground">
                Your registered company name
              </p>
            </div>

            {/* Fine-Grained Address */}
            <div className="space-y-2">
              <label htmlFor="address" className="block text-sm font-medium text-foreground">
                Fine-Grained Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                placeholder="e.g., 123 Main St, Suite 100, San Francisco, CA 94102, USA"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-24 resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">
                Complete address including street, city, state, and ZIP code
              </p>
            </div>

            {/* Regional Location */}
            <div className="space-y-2">
              <label htmlFor="region" className="block text-sm font-medium text-foreground">
                Regional Location <span className="text-red-500">*</span>
              </label>
              <Select value={formData.region} onValueChange={(value) => handleInputChange('region', value)}>
                <SelectTrigger id="region" className="h-10">
                  <SelectValue placeholder="Select your regional location" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the primary region where your company operates
              </p>
            </div>

            {/* Submission Status */}
            {submitted && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Form submitted successfully!</p>
                  <p className="text-sm text-green-800">Your information has been securely stored.</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
              >
                Save Draft
              </Button>
              <Button
                type="submit"
                disabled={!isFormComplete}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitted ? 'Submitted!' : 'Complete Registration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Form Progress Indicator */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Tax ID', complete: !!formData.taxId },
          { label: 'Company', complete: !!formData.companyName },
          { label: 'Address', complete: !!formData.address },
          { label: 'Region', complete: !!formData.region },
        ].map((step, idx) => (
          <div key={idx} className="space-y-1">
            <div className={`h-1.5 rounded-full transition-colors ${
              step.complete ? 'bg-blue-600' : 'bg-muted'
            }`} />
            <p className="text-xs text-muted-foreground text-center">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
