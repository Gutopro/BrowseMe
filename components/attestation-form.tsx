'use client'

import { useState } from 'react'
import { Button } from './ui/buttonaf'
import { Input } from './ui/inputaf'
import { Label } from './ui/labelaf'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/selectaf'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltipaf'
import { HelpCircle } from 'lucide-react'
import { cn } from '../lib/utils'

interface AttestationFormData {
  fullName: string
  idNumber: string
  positionRole: string
  organizationName: string
  physicalAddress: string
}

interface AttestationFormProps {
  onSubmit?: (data: AttestationFormData) => void
}

export function AttestationForm({ onSubmit }: AttestationFormProps) {
  const [formData, setFormData] = useState<AttestationFormData>({
    fullName: '',
    idNumber: '',
    positionRole: '',
    organizationName: '',
    physicalAddress: '',
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      organizationName: value ?? "",
    }))
    setTouched((prev) => ({
      ...prev,
      organizationName: true,
    }))
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }))
  }

  const validateForm = () => {
    return (
      formData.fullName.trim() !== '' &&
      formData.idNumber.trim() !== '' &&
      formData.positionRole.trim() !== '' &&
      formData.organizationName !== '' &&
      formData.physicalAddress.trim() !== ''
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({
      fullName: true,
      idNumber: true,
      positionRole: true,
      organizationName: true,
      physicalAddress: true,
    })

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      if (onSubmit) {
        onSubmit(formData)
      }
      // Reset form on success
      setFormData({
        fullName: '',
        idNumber: '',
        positionRole: '',
        organizationName: '',
        physicalAddress: '',
      })
      setTouched({})
    } finally {
      setIsSubmitting(false)
    }
  }

  const PrivacyTooltip = ({
    label,
    children,
  }: {
    label: string
    children: React.ReactNode
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <button
            type="button"
            className="inline-flex items-center ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Privacy information for ${label}`}
          >
            <HelpCircle className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  const FormField = ({
    label,
    name,
    value,
    error,
    tooltip,
    type = 'text',
    placeholder,
  }: {
    label: string
    name: string
    value: string
    error?: string
    tooltip?: React.ReactNode
    type?: string
    placeholder?: string
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-0">
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        {tooltip && <PrivacyTooltip label={label}>{tooltip}</PrivacyTooltip>}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onBlur={() => handleBlur(name)}
        aria-invalid={touched[name] && !value}
        className={cn('transition-colors', {
          'border-destructive focus-visible:ring-destructive':
            touched[name] && !value,
        })}
      />
      {touched[name] && !value && (
        <p className="text-xs text-destructive">This field is required</p>
      )}
    </div>
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Attestation Form</h1>
        <p className="text-sm text-muted-foreground">
          Community authority verification for informal business
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <span className="font-semibold">Note:</span> Your personal information
          is handled with care. Some details will be verified for accreditation
          while others remain confidential.
        </p>
      </div>

      <div className="space-y-5 bg-card border border-border rounded-lg p-6">
        {/* Attester Full Name */}
        <FormField
          label="Attester Full Name"
          name="fullName"
          value={formData.fullName}
          error={touched.fullName ? 'Name is required' : undefined}
          placeholder="John Doe"
          tooltip={
            <div className="space-y-1">
              <p className="font-semibold text-xs">Privacy: Verified</p>
              <p>Your name will be verified for accreditation but kept private.</p>
            </div>
          }
        />

        {/* ID Number */}
        <FormField
          label="ID Number"
          name="idNumber"
          value={formData.idNumber}
          error={touched.idNumber ? 'ID number is required' : undefined}
          placeholder="123456789"
          tooltip={
            <div className="space-y-1">
              <p className="font-semibold text-xs">Privacy: Confidential</p>
              <p>Your ID number is never shared publicly and used only for verification.</p>
            </div>
          }
        />

        {/* Position/Role */}
        <FormField
          label="Position/Role"
          name="positionRole"
          value={formData.positionRole}
          error={touched.positionRole ? 'Position is required' : undefined}
          placeholder="Community Manager"
          tooltip={
            <div className="space-y-1">
              <p className="font-semibold text-xs">Privacy: Public</p>
              <p>Your role will be displayed publicly to establish credibility.</p>
            </div>
          }
        />

        {/* Organization Name */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-0">
            <Label htmlFor="organization" className="text-sm font-medium">
              Organization Type
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <PrivacyTooltip label="Organization Type">
              <div className="space-y-1">
                <p className="font-semibold text-xs">Privacy: Public</p>
                <p>Organization type is displayed to show community authority backing.</p>
              </div>
            </PrivacyTooltip>
          </div>
          <Select value={formData.organizationName} onValueChange={handleSelectChange}>
            <SelectTrigger
              id="organization"
              aria-invalid={touched.organizationName && !formData.organizationName}
              className={cn('transition-colors', {
                'border-destructive focus:ring-destructive':
                  touched.organizationName && !formData.organizationName,
              })}
            >
              <SelectValue placeholder="Select organization type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="union">Union</SelectItem>
              <SelectItem value="religious">Religious Organization</SelectItem>
              <SelectItem value="education">Local Education</SelectItem>
              <SelectItem value="community">Community Authority</SelectItem>
            </SelectContent>
          </Select>
          {touched.organizationName && !formData.organizationName && (
            <p className="text-xs text-destructive">Organization type is required</p>
          )}
        </div>

        {/* Physical Address */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-0">
            <Label htmlFor="address" className="text-sm font-medium">
              Attester Physical Address
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <PrivacyTooltip label="Physical Address">
              <div className="space-y-1">
                <p className="font-semibold text-xs">Privacy: Verified</p>
                <p>Address is used for verification purposes and kept on file securely.</p>
              </div>
            </PrivacyTooltip>
          </div>
          <textarea
            id="address"
            name="physicalAddress"
            value={formData.physicalAddress}
            onChange={handleInputChange}
            onBlur={() => handleBlur('physicalAddress')}
            placeholder="123 Main Street, City, State ZIP"
            aria-invalid={touched.physicalAddress && !formData.physicalAddress}
            className={cn(
              'w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              {
                'border-destructive focus-visible:ring-destructive':
                  touched.physicalAddress && !formData.physicalAddress,
              },
            )}
            rows={3}
          />
          {touched.physicalAddress && !formData.physicalAddress && (
            <p className="text-xs text-destructive">Address is required</p>
          )}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
        <p className="text-xs text-amber-900 dark:text-amber-100">
          <span className="font-semibold">Attestation Reminder:</span> By submitting
          this form, you acknowledge that the information provided is accurate and
          you are authorized to verify the business mentioned.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Attestation'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              fullName: '',
              idNumber: '',
              positionRole: '',
              organizationName: '',
              physicalAddress: '',
            })
            setTouched({})
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
