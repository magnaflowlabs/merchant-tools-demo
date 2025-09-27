import { useState } from 'react';
import { StepOne } from './wallet-steps/step-one';
import { StepTwo } from './wallet-steps/step-two';
import { StepThree } from './wallet-steps/step-three';
import { SuccessStep } from './wallet-steps/success-step';

import { useWalletStore } from '@/stores/wallet-store';
import { toast } from 'sonner';

type Step = 'one' | 'two' | 'three' | 'success';

export function CreateWallet() {
  const { setTempMnemonic, clearTempMnemonic } = useWalletStore();
  const [currentStep, setCurrentStep] = useState<Step>('one');
  const [walletName, setWalletName] = useState('');
  const handleStartCreate = () => {
    setCurrentStep('two');
  };

  const handleConfirmMnemonic = (finalMnemonic: string) => {
    setTempMnemonic(finalMnemonic);
    setCurrentStep('three');
  };

  const handleBackToStepTwo = () => {
    setCurrentStep('two');
  };

  const handleBackToStepOne = () => {
    setCurrentStep('one');
  };

  const handleComplete = (name: string) => {
    setWalletName(name);
    setCurrentStep('success');
  };

  const handleFinish = () => {
    toast.success('Wallet created successfully!');
    setCurrentStep('one');
    setWalletName('');

    clearTempMnemonic();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'one':
        return <StepOne onNext={handleStartCreate} />;
      case 'two':
        return <StepTwo onNext={handleConfirmMnemonic} onBack={handleBackToStepOne} />;
      case 'three':
        return <StepThree onBack={handleBackToStepTwo} onComplete={handleComplete} />;
      case 'success':
        return <SuccessStep walletName={walletName} onComplete={handleFinish} />;
      default:
        return <StepOne onNext={handleStartCreate} />;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 lg:px-6">
      <div className="min-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Create New Wallet</h1>

        <div className="flex items-center gap-4 mb-6">
          <div
            className={`flex items-center gap-2 ${
              currentStep === 'one' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'one' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              1
            </div>
            <span className="text-sm">Start Creation</span>
          </div>

          <div className={`flex-1 h-px bg-border`}></div>

          <div
            className={`flex items-center gap-2 ${
              currentStep === 'two' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'two' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              2
            </div>
            <span className="text-sm">Backup Mnemonic</span>
          </div>

          <div className={`flex-1 h-px bg-border`}></div>

          <div
            className={`flex items-center gap-2 ${
              currentStep === 'three' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'three' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              3
            </div>
            <span className="text-sm">Setup Information</span>
          </div>

          <div className={`flex-1 h-px bg-border`}></div>

          <div
            className={`flex items-center gap-2 ${
              currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'success' ? 'bg-green-600 text-white' : 'bg-muted'
              }`}
            >
              ✓
            </div>
            <span className="text-sm">Creation Complete</span>
          </div>
        </div>

        {renderStep()}
      </div>
    </div>
  );
}
