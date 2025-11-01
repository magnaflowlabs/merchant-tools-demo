import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconShieldCheck } from '@tabler/icons-react';

interface StepOneProps {
  onNext: () => void;
}

export function StepOne({ onNext }: StepOneProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <IconShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Security Reminder</CardTitle>
          <CardDescription>
            Please ensure you are in a secure environment before creating your wallet. Keep your
            private keys safe and never share them with anyone.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={onNext} size="lg" className="w-full">
            I Understand, Confirm
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
