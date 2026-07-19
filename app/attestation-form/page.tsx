'use client'

import { AttestationForm } from '@/components/attestation-form'

export default function Page() {
  const handleFormSubmit = (data: any) => {
    console.log('Form submitted:', data)
    alert('Attestation form submitted! Check the console for details.')
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Community Attestation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Verify and vouch for informal business operations
          </p>
        </div>
        <AttestationForm onSubmit={handleFormSubmit} />
      </div>
    </main>
  )
}
