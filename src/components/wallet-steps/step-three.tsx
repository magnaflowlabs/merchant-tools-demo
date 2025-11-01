import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeystoreService } from '@/services/KeystoreService';
import { ToggleVisibilityButton } from '@/components/customerUI';
import {
  validateKeystoreForm,
  validateKeystoreField,
  type KeystoreFormData,
} from '@/utils/validators';
import { useWalletStore } from '@/stores/wallet-store';

interface StepThreeProps {
  onBack: () => void;
  onComplete: (walletName: string) => void;
}

interface FormErrors {
  walletName?: string;
  password?: string;
  confirmPassword?: string;
}

export function StepThree({ onBack, onComplete }: StepThreeProps) {
  const [formData, setFormData] = useState({
    walletName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { tempMnemonic } = useWalletStore();
  // Create KeystoreService instance
  const keystoreService = new KeystoreService();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear the error for the corresponding field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Real-time validation of fields
    const keystoreFormData: KeystoreFormData = {
      walletName: field === 'walletName' ? value : formData.walletName,
      // description: field === 'userToken' ? value : formData.userToken,
      password: field === 'password' ? value : formData.password,
      confirmPassword: field === 'confirmPassword' ? value : formData.confirmPassword,
    };

    const fieldError = validateKeystoreField(
      field as keyof KeystoreFormData,
      value,
      keystoreFormData
    );

    if (fieldError) {
      setErrors((prev) => ({
        ...prev,
        [field]: fieldError,
      }));
    }
  };

  const validateForm = (): boolean => {
    const keystoreFormData: KeystoreFormData = {
      walletName: formData.walletName,
      // description: formData.userToken,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    const validationErrors = validateKeystoreForm(keystoreFormData);
    const newErrors: FormErrors = {};

    // Convert validation errors to the format used by the component
    validationErrors.forEach((error) => {
      const field = error.field;
      newErrors[field as keyof FormErrors] = error.message;
    });

    setErrors(newErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!tempMnemonic) {
      toast.error('Please import mnemonic first');
      return;
    }
    e.preventDefault();

    if (!validateForm()) {
      const firstError = Object.values(errors).find((error) => error);
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    setIsLoading(true);
    try {
      const { walletName, password, confirmPassword } = formData;

      keystoreService.setCurrentMnemonic(tempMnemonic);
      const result = await keystoreService.createKeystoreWithState({
        walletName,
        password,
        confirmPassword,
      });

      if (result.success) {
        toast.success('Wallet created successfully!');
        onComplete(formData.walletName);
      } else if (result.cancelled) {
        // Notify user cancelled save operation
        toast.warning('Wallet file save cancelled');
      } else {
        toast.error(result.error || 'Failed to create wallet, please try again');
      }
    } catch {
      toast.error('Failed to create wallet, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Set Wallet Information</CardTitle>
          <CardDescription>
            Please fill in the basic information for your wallet. This information will be used for
            wallet creation and management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wallet Name */}
            <div className="space-y-2">
              <Label htmlFor="walletName">Wallet Name</Label>
              <Input
                id="walletName"
                type="text"
                placeholder="Please enter wallet name"
                value={formData.walletName}
                onChange={(e) => handleInputChange('walletName', e.target.value)}
                className={errors.walletName ? 'border-red-500' : ''}
              />
              {errors.walletName && <p className="text-sm text-red-500">{errors.walletName}</p>}
            </div>

            {/* Create Wallet Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Create Wallet Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Please enter password (at least 8 characters)"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? 'border-red-500' : ''}
                  autoComplete="off"
                />
                <ToggleVisibilityButton
                  isVisible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                />
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Please re-enter the above password to confirm</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Please enter password again"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <ToggleVisibilityButton
                  isVisible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Confirm Create Wallet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
