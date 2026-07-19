'use client'

import { useState } from 'react'
import InvestorForm from './investor-form'
import BusinessVerificationForm from './business-verification-form'
import AttestationPlaceholder from './attestation-placeholder'
import { Tabs,  TabsContent, TabsList, TabsTrigger } from './ui/tabs'

export default function OnboardingPortal() {
  const [activeTab, setActiveTab] = useState('investor')

  return (
    <div className="min-h-screen bg-gradient-to-br pt-0.5 pb-12 px-4 sm:px-6 lg:px-8">
    {/* <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-0.5 pb-12 px-4 sm:px-6 lg:px-8"> */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold pt-3 tracking-tight text-foreground mb-2">
            Welcome to Onboarding
          </h1>
          <p className="text-lg text-muted-foreground">
            Complete your onboarding in a few simple steps
          </p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-auto bg-white border border-border shadow-sm p-1">
            <TabsTrigger
              value="investor"
              className="data-[state=active]:bg-blue-300 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-lg">💼</span>
                <span className="hidden sm:inline">Investor</span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="business"
              className="data-[state=active]:bg-blue-300 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="hidden sm:inline">Business</span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="attestation"
              className="data-[state=active]:bg-blue-300 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span className="hidden sm:inline">Attestation</span>
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Content */}
          <div className="bg-white rounded-xl border border-border shadow-sm">
            <TabsContent value="investor" className="m-0 p-6 sm:p-8">
              <InvestorForm />
            </TabsContent>

            <TabsContent value="business" className="m-0 sm:p-8">
              <BusinessVerificationForm />
            </TabsContent>
            
            <TabsContent value="attestation" className="m-0 p-6 sm:p-8">
              <AttestationPlaceholder />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
