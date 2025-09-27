import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconCheck, IconWallet } from '@tabler/icons-react';

interface SuccessStepProps {
  walletName: string;
  onComplete: () => void;
}

export function SuccessStep({ walletName, onComplete }: SuccessStepProps) {
  return (
    <div className="flex flex-col gap-6 items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <IconCheck className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-green-600">Wallet Created Successfully!</CardTitle>
          <CardDescription>
            Your wallet has been successfully created and is now ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <IconWallet className="h-4 w-4" />
            <span>Wallet Name: {walletName}</span>
          </div>

          <div className="flex justify-center pt-4">
            <Button onClick={onComplete} className="flex items-center gap-2">
              <IconWallet className="h-4 w-4" />
              Complete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
