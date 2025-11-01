import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconLoader2 } from '@tabler/icons-react';
import { ToggleVisibilityButton } from '@/components/customerUI';
import { useAppStore, useShallow } from '@/stores';
import { ERROR_MESSAGES } from '@/utils/ws';
import { useWebSocketService, useAuthLoginMutation } from '@/services/ws';
import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { extractMerchantId } from '@/utils';
import {
  getSafeUrlParam,
  validateUsername,
  validateCompleteWebSocketUrl,
} from '@/utils/url-sanitizer';

export function LoginForm() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const { ws, connectAsync } = useWebSocketService();
  const { mutateAsync: login } = useAuthLoginMutation();
  const [username, setUsername] = useState('');
  const [connUrl, setConnUrl] = useState('');
  const [, setWsConfig] = useAtom(wsStoreAtom);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');

  const { setUser, setIsAdmin } = useAuthStore(
    useShallow((state) => ({
      setUser: state.setUser,
      setIsAdmin: state.setIsAdmin,
    }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const addNotification = useAppStore((state) => state.addNotification);
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const demoUserNameParam = searchParams.get('user_name');
    const demoConnUrlParam = searchParams.get('conn_url');

    // Safely handle connection URL
    if (demoConnUrlParam) {
      const safeUrl = getSafeUrlParam(demoConnUrlParam);
      if (safeUrl) {
        const urlValidation = validateCompleteWebSocketUrl(safeUrl);
        if (urlValidation.isValid) {
          setConnUrl(safeUrl);
          localStorage.setItem('ws_url', safeUrl);
        }
      }
    } else {
      const localConnUrl = localStorage.getItem('ws_url');
      setConnUrl(localConnUrl || '');
    }

    // Safely handle username
    if (demoUserNameParam) {
      const safeUsername = getSafeUrlParam(demoUserNameParam, validateUsername);
      if (safeUsername) {
        setUsername(safeUsername);
        localStorage.setItem('user_name', safeUsername);
      }
    } else {
      const localUserName = localStorage.getItem('user_name');
      if (localUserName && validateUsername(localUserName)) {
        setUsername(localUserName);
      }
    }
  }, []);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!username.trim()) {
      errors.username = 'Username is required';
    }

    if (!password.trim()) {
      errors.password = 'Password is required';
    }

    if (!connUrl.trim()) {
      errors.connUrl = 'Connection address is required';
    } else if (!isValidUrl(connUrl)) {
      errors.connUrl = 'Please enter a valid connection address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (url: string) => {
    const validation = validateCompleteWebSocketUrl(url);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!validateForm()) {
      addNotification({
        type: 'error',
        title: 'Form validation failed',
        message: 'Please check input information',
      });
      setIsLoading(false);
      return;
    }
    if (!ws.isConnected()) {
      setConnectionStatus('connecting');

      try {
        await connectAsync(connUrl);
        setConnectionStatus('connected');
      } catch (error: any) {
        ws.disconnect();
        setConnectionStatus('disconnected');
        toast.error(`${error.message}, Please check the connection url`);
        setIsLoading(false);
        return;
      }
    }
    const merchantId = extractMerchantId(connUrl);

    const newName = `${merchantId}.${username}`;

    try {
      const result = await login({ username: newName, password });
      if (!ws) {
        toast.error(ERROR_MESSAGES.CONNECTION.NOT_INITIALIZED);
        setIsLoading(false);
        return;
      }
      if (result?.token) {
        const { token, user_info } = result;

        setWsConfig((prevConfig) => ({
          ...prevConfig,
          wsUrl: connUrl,
          token,
          user: { ...user_info },
        }));
        setUser(user_info);
        setIsAdmin(user_info.role === 'admin');
        navigate('/passkey');
      }
    } catch (error: any) {
      toast.error(error.message || ' Merchant ID or Password is incorrect');
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Clear error message for specified field
  const clearFieldError = useCallback((field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Handle username input change
  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const trimmedValue = e.target.value.trim();
      setUsername(trimmedValue);
      localStorage.setItem('user_name', trimmedValue);
      clearFieldError('username');
    },
    [clearFieldError]
  );

  // Handle connection URL input change
  const handleConnUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const trimmedValue = e.target.value.trim();
      setConnUrl(trimmedValue);
      localStorage.setItem('ws_url', trimmedValue);
      clearFieldError('connUrl');
    },
    [clearFieldError]
  );

  // Handle password input change
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const trimmedValue = e.target.value.trim();
      setPassword(trimmedValue);
      clearFieldError('password');
    },
    [clearFieldError]
  );

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-3">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={handleUsernameChange}
              onBlur={() => clearFieldError('username')}
              className={cn(
                'transition-colors focus:ring-2 focus:ring-primary/20',
                formErrors.username && 'border-red-500 focus:ring-red-500/20'
              )}
            />
            {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="conn_url">Connection URL</Label>
            <Input
              id="conn_url"
              type="text"
              placeholder="Enter WebSocket connection address (e.g., ws://localhost:8080/ws)"
              value={connUrl}
              onChange={handleConnUrlChange}
              onBlur={() => clearFieldError('connUrl')}
              className={cn(
                'transition-colors focus:ring-2 focus:ring-primary/20',
                formErrors.connUrl && 'border-red-500 focus:ring-red-500/20'
              )}
            />
            {formErrors.connUrl && <p className="text-sm text-red-500">{formErrors.connUrl}</p>}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => clearFieldError('password')}
                className={cn(
                  'pr-10 transition-colors focus:ring-2 focus:ring-primary/20',
                  formErrors.password && 'border-red-500 focus:ring-red-500/20'
                )}
                autoComplete="off"
              />
              <ToggleVisibilityButton
                isVisible={showPassword}
                onToggle={togglePasswordVisibility}
                iconClassName="h-3 w-3"
                iconColorClassName="text-muted-foreground"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50"
              />
            </div>
            {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
          </div>

          <div className="flex flex-col gap-3">
            <Button type="submit" className="w-full transition-all duration-200 hover:scale-[1.02]">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Logging in...'}
                </div>
              ) : (
                'Login'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
