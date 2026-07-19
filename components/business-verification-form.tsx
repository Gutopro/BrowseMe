'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/selectbv';
import { Badge } from './ui/badgebv';
import { Check, ChevronRight } from 'lucide-react';
import { Label } from './ui/labelbv';
import { Input } from './ui/inputbv';
import { Button } from './ui/buttonbv';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/cardbv';

interface FormData {
  businessName: string;
  taxId: string;
  coarseLocation: string;
  fineGrainedAddress: string;
  sector: string;
  estimatedAnnualRevenue: string;
}

export default function BusinessVerificationForm() {
  const [selectedTrack, setSelectedTrack] = useState<'trackA' | 'trackB' | null>(null);
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    taxId: '',
    coarseLocation: '',
    fineGrainedAddress: '',
    sector: '',
    estimatedAnnualRevenue: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [completionStep, setCompletionStep] = useState(0);

  const handleTrackSelection = (track: 'trackA' | 'trackB' | null) => {
    setSelectedTrack(track);
    setFormData({
      businessName: '',
      taxId: '',
      coarseLocation: '',
      fineGrainedAddress: '',
      sector: '',
      estimatedAnnualRevenue: '',
    });
    setSubmitted(false);
    setCompletionStep(0);
  };

  const handleInputChange = (field: keyof FormData, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTrackASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.businessName.trim() && formData.taxId.trim()) {
      setSubmitted(true);
      setCompletionStep(1);
      setTimeout(() => setCompletionStep(2), 800);
    }
  };

  const handleTrackBSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allFieldsFilled =
      formData.businessName.trim() &&
      formData.coarseLocation &&
      formData.fineGrainedAddress.trim() &&
      formData.sector &&
      formData.estimatedAnnualRevenue;

    if (allFieldsFilled) {
      setSubmitted(true);
      setCompletionStep(1);
      setTimeout(() => setCompletionStep(2), 600);
      setTimeout(() => setCompletionStep(3), 1200);
      setTimeout(() => setCompletionStep(4), 1800);
    }
  };

  if (!selectedTrack) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Business Verification</CardTitle>
            <CardDescription className="text-base mt-2">
              Select your business registration track
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Track A Button */}
              <button
                onClick={() => handleTrackSelection('trackA')}
                className="group relative overflow-hidden rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6 text-left transition-all hover:border-primary/60 hover:shadow-lg"
              >
                <div className="relative z-10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-primary mb-1">Track A</h3>
                      <p className="text-sm font-semibold text-foreground">
                        CAC-Registered SME
                      </p>
                    </div>
                    <Badge className="bg-primary">Quick</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For registered small and medium enterprises with CAC certification
                  </p>
                  <div className="pt-2 text-xs text-muted-foreground font-medium">
                    ✓ Business Name
                    <br />✓ Tax ID
                  </div>
                </div>
              </button>

              {/* Track B Button */}
              <button
                onClick={() => handleTrackSelection('trackB')}
                className="group relative overflow-hidden rounded-lg border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-6 text-left transition-all hover:border-accent/60 hover:shadow-lg"
              >
                <div className="relative z-10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-accent mb-1">Track B</h3>
                      <p className="text-sm font-semibold text-foreground">
                        Informal Community Business
                      </p>
                    </div>
                    <Badge className="bg-accent">Attestation</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For community-based businesses requiring community verification
                  </p>
                  <div className="pt-2 text-xs text-muted-foreground font-medium">
                    ✓ Business Name
                    <br />✓ Location & Address
                    <br />✓ Sector & Revenue
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {selectedTrack === 'trackA'
                  ? 'CAC-Registered SME Verification'
                  : 'Informal Community Business Verification'}
              </CardTitle>
              <CardDescription>
                {selectedTrack === 'trackA'
                  ? 'Provide your business registration details'
                  : 'Complete community business information'}
              </CardDescription>
            </div>
            <button
              onClick={() => handleTrackSelection(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {!submitted ? (
            <form
              onSubmit={
                selectedTrack === 'trackA' ? handleTrackASubmit : handleTrackBSubmit
              }
              className="space-y-6"
            >
              {/* Track A Form */}
              {selectedTrack === 'trackA' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="Enter your registered business name"
                      value={formData.businessName}
                      onChange={(e) =>
                        handleInputChange('businessName', e.target.value)
                      }
                      required
                      className="border-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID *</Label>
                    <Input
                      id="taxId"
                      placeholder="Enter your tax identification number"
                      value={formData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      required
                      className="border-input"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={
                      !formData.businessName.trim() || !formData.taxId.trim()
                    }
                  >
                    Verify Business
                  </Button>
                </div>
              )}

              {/* Track B Form */}
              {selectedTrack === 'trackB' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="Enter your business name"
                      value={formData.businessName}
                      onChange={(e) =>
                        handleInputChange('businessName', e.target.value)
                      }
                      required
                      className="border-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coarseLocation">State/Region (Coarse Location) *</Label>
                    <Select
                      value={formData.coarseLocation}
                      onValueChange={(value) =>
                        handleInputChange('coarseLocation', value)
                      }
                    >
                      <SelectTrigger id="coarseLocation">
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lagos">Lagos</SelectItem>
                        <SelectItem value="Abuja">Abuja</SelectItem>
                        <SelectItem value="Kano">Kano</SelectItem>
                        <SelectItem value="Rivers">Rivers</SelectItem>
                        <SelectItem value="Kaduna">Kaduna</SelectItem>
                        <SelectItem value="Enugu">Enugu</SelectItem>
                        <SelectItem value="Oyo">Oyo</SelectItem>
                        <SelectItem value="Katsina">Katsina</SelectItem>
                        <SelectItem value="Kebbi">Kebbi</SelectItem>
                        <SelectItem value="Borno">Borno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fineGrainedAddress">
                      Detailed Address (Fine-Grained) *
                    </Label>
                    <Input
                      id="fineGrainedAddress"
                      placeholder="Enter street address, plot number, landmark, etc."
                      value={formData.fineGrainedAddress}
                      onChange={(e) =>
                        handleInputChange('fineGrainedAddress', e.target.value)
                      }
                      required
                      className="border-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sector">Business Sector *</Label>
                    <Select
                      value={formData.sector}
                      onValueChange={(value) =>
                        handleInputChange('sector', value)
                      }
                    >
                      <SelectTrigger id="sector">
                        <SelectValue placeholder="Select business sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agriculture">Agriculture</SelectItem>
                        <SelectItem value="retail">Retail Trade</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="hospitality">Hospitality</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedAnnualRevenue">
                      Estimated Annual Revenue *
                    </Label>
                    <Select
                      value={formData.estimatedAnnualRevenue}
                      onValueChange={(value) =>
                        handleInputChange('estimatedAnnualRevenue', value)
                      }
                    >
                      <SelectTrigger id="estimatedAnnualRevenue">
                        <SelectValue placeholder="Select revenue range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-500k">₦0 - ₦500,000</SelectItem>
                        <SelectItem value="500k-2m">₦500,000 - ₦2,000,000</SelectItem>
                        <SelectItem value="2m-5m">₦2,000,000 - ₦5,000,000</SelectItem>
                        <SelectItem value="5m-10m">₦5,000,000 - ₦10,000,000</SelectItem>
                        <SelectItem value="10m+">₦10,000,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90"
                    disabled={
                      !formData.businessName.trim() ||
                      !formData.coarseLocation ||
                      !formData.fineGrainedAddress.trim() ||
                      !formData.sector ||
                      !formData.estimatedAnnualRevenue
                    }
                  >
                    Submit for Community Attestation
                  </Button>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              {selectedTrack === 'trackA' ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 border border-green-200 dark:border-green-900">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      ✓ Verification Successful
                    </h3>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your CAC-registered business has been verified.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Business Details Recorded:</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Business Name:</strong> {formData.businessName}
                      </p>
                      <p>
                        <strong>Tax ID:</strong> {formData.taxId}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleTrackSelection(null)}
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90">
                      Continue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-900">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      ✓ Application Submitted
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Your application is now awaiting community attestations.
                    </p>
                  </div>

                  {/* Progress Stepper */}
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-foreground">
                      Verification Progress
                    </p>

                    <div className="space-y-3">
                      {/* Step 1: Application Submitted */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {completionStep >= 1 ? (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                completionStep >= 2
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500'
                              }`}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-muted-foreground bg-muted" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-medium">
                            Application Submitted
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Your business information has been recorded
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Community Review */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {completionStep >= 2 ? (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                completionStep >= 3
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500'
                              }`}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-muted-foreground bg-muted" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-medium">
                            Community Review Initiated
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Community members are reviewing your application
                          </p>
                        </div>
                      </div>

                      {/* Step 3: Attestations Gathered */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {completionStep >= 3 ? (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                completionStep >= 4
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500'
                              }`}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-muted-foreground bg-muted" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-medium">
                            Community Attestations
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Gathering minimum required attestations (3-5 needed)
                          </p>
                        </div>
                      </div>

                      {/* Step 4: Verification Complete */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {completionStep >= 4 ? (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-muted-foreground bg-muted" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-medium">Verification Complete</p>
                          <p className="text-xs text-muted-foreground">
                            Your business will be fully verified upon completion
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Business Details Recorded:</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Business Name:</strong> {formData.businessName}
                      </p>
                      <p>
                        <strong>Location:</strong> {formData.coarseLocation}
                      </p>
                      <p>
                        <strong>Address:</strong> {formData.fineGrainedAddress}
                      </p>
                      <p>
                        <strong>Sector:</strong>{' '}
                        {formData.sector.charAt(0).toUpperCase() +
                          formData.sector.slice(1)}
                      </p>
                      <p>
                        <strong>Annual Revenue:</strong>{' '}
                        {formData.estimatedAnnualRevenue}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleTrackSelection(null)}
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button className="flex-1 bg-accent hover:bg-accent/90">
                      Track Progress
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
