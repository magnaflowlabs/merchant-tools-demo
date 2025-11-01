import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import * as bip39 from 'bip39';
import { KeyService } from '@/services/KeyService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { IconCopy, IconCheck, IconPlus, IconRotateClockwise } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconHelp } from '@tabler/icons-react';
import { useWalletStore } from '@/stores/wallet-store';

interface StepTwoProps {
  onNext: (mnemonic: string) => void;
  onBack: () => void;
}

export function StepTwo({ onNext, onBack }: StepTwoProps) {
  const [copied, setCopied] = useState(false);
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const { tempMnemonic } = useWalletStore();
  // When the component loads or the mnemonic prop changes, automatically fill the mnemonic
  useEffect(() => {
    if (tempMnemonic && tempMnemonic.trim()) {
      const words = tempMnemonic.trim().split(/\s+/);
      setMnemonicWords(words);
      setErrorMessage('');
    }
  }, [tempMnemonic]);

  const handleCopy = async () => {
    try {
      const mnemonicString = mnemonicWords.join(' ');
      await navigator.clipboard.writeText(mnemonicString);
      setCopied(true);
      toast.success('Mnemonic has been copied to the clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy, please manually copy');
    }
  };

  const handleReset = () => {
    setMnemonicWords([]);
    setErrorMessage('');
  };

  const handleCreateMnemonic = () => {
    const generatedMnemonic = KeyService.generateMnemonic();
    const words = generatedMnemonic.split(' ');
    setMnemonicWords(words);
    setErrorMessage('');
  };

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...mnemonicWords];
    newWords[index] = value;
    setMnemonicWords(newWords);
    if (errorMessage) setErrorMessage('');
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentWord = mnemonicWords[index]?.trim() || '';

      // Check if it's a single English word (only contains letters)
      const isEnglishWord = /^[a-zA-Z]+$/.test(currentWord);

      if (!currentWord) {
        toast.error('Please enter a word first');
        return;
      }

      if (!isEnglishWord) {
        toast.error('Only English words are allowed, Chinese or other languages are not supported');
        return;
      }

      // Check if it contains spaces (multiple words)
      if (currentWord.includes(' ')) {
        toast.error('Please enter a single word');
        return;
      }

      // If current is the last input and word count is less than 24, add new input
      if (index === mnemonicWords.length - 1 && mnemonicWords.length < 24) {
        const newWords = [...mnemonicWords, ''];
        setMnemonicWords(newWords);
        // Delay to auto-focus on the new input after it's rendered
        setTimeout(() => {
          const nextInput = document.querySelector(
            `input[placeholder="word ${index + 2}"]`
          ) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
          }
        }, 10);
      } else if (index < mnemonicWords.length - 1) {
        // If it's not the last input, focus on the next one
        const nextInput = document.querySelector(
          `input[placeholder="word ${index + 2}"]`
        ) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };

  const handlePasteToFirst = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const words = text.trim().split(/\s+/);
      setMnemonicWords(words);
      if (errorMessage) setErrorMessage('');
    } catch {
      toast.error('Failed to read clipboard content');
    }
  };

  const validateMnemonic = (): string | null => {
    const mnemonicString = mnemonicWords.join(' ').trim();

    if (!mnemonicString) {
      setErrorMessage('Please enter mnemonic');
      toast.error('Please enter mnemonic');
      return null;
    }

    // Standardize mnemonic (multiple spaces become single space)
    const normalized = mnemonicString.split(/\s+/).join(' ').toLowerCase();

    const wordCount = normalized ? normalized.split(' ').length : 0;
    const validCounts = new Set([12, 15, 18, 21, 24]);

    if (!validCounts.has(wordCount)) {
      setErrorMessage('Mnemonic should be 12/15/18/21/24 English words');
      return null;
    }

    if (!bip39.validateMnemonic(normalized)) {
      setErrorMessage('Invalid mnemonic, please check spelling, order and spaces');
      return null;
    }

    setErrorMessage('');
    return normalized;
  };

  const handleNext = () => {
    const validated = validateMnemonic();
    if (validated) {
      onNext(validated);
    }
  };

  // Determine the number of rows to display based on the number of mnemonic words
  const getWordCount = useMemo(() => {
    if (mnemonicWords?.length > 12) return mnemonicWords.length;
    return 12;
  }, [mnemonicWords]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">
              <CardTitle className="text-xl">Mnemonic Settings</CardTitle>
              <CardDescription>Import Existing Mnemonic or Generate New Mnemonic</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {Boolean(mnemonicWords?.length) && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-2"
                  >
                    <IconRotateClockwise className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <IconCheck className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <IconCopy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleCreateMnemonic}>
                <IconPlus className="h-4 w-4" />
                New
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconHelp className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent>
                  No Mnemonic? Click to New Button to generate a new Mnemonic
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mnemonic Input Area */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Click the first input box to paste the complete mnemonic, and the system will
              automatically allocate it to each input box.(Mnemonic should be 12/15/18/21/24 English
              words)
            </div>

            {/* Mnemonic Input Grid */}
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: getWordCount }, (_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs w-[20px] justify-center">
                    {index + 1}
                  </Badge>
                  <Input
                    value={mnemonicWords[index] || ''}
                    onChange={(e) => handleWordChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    placeholder={`word ${index + 1}`}
                    className="text-sm"
                    onPaste={index === 0 ? handlePasteToFirst : undefined}
                  />
                </div>
              ))}
            </div>

            {errorMessage && (
              <div className="text-sm text-red-600" role="alert" aria-live="polite">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleNext}>I have safely backed up, confirm mnemonic</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
