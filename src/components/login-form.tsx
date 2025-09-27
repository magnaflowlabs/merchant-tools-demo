import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react';
import { useAppStore } from '@/stores';
import { ERROR_MESSAGES } from '@/utils/ws';
import { useWebSocketService, useAuthLoginMutation } from '@/services/ws';
import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const { ws, connectAsync } = useWebSocketService();
  const { mutateAsync: login } = useAuthLoginMutation();
  const [username, setUsername] = useState('');
  const [connUrl, setConnUrl] = useState('');
  const [wsConfig, setWsConfig] = useAtom(wsStoreAtom);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');

  const { setUser, setIsAdmin } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useAppStore();
  useEffect(() => {
    const localUserName = localStorage.getItem('user_name');
    const localConnUrl = localStorage.getItem('ws_url');
    setConnUrl(localConnUrl || '');
    setPassword('');
    setUsername(localUserName || '');
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
    try {
      const urlObj = new URL(url);
      const match = url.match(/\/ws\/([^/]+)/);
      const merchantId = match ? match[1] : null;
      return /^wss?:$/.test(urlObj.protocol) && merchantId;
    } catch {
      return false;
    }
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
      return;
    }
    if (!ws.isConnected()) {
      setConnectionStatus('connecting');

      await connectAsync(connUrl);
      setConnectionStatus('connected');
    }
    const match = connUrl.match(/\/ws\/([^/]+)/);
    const merchantId = match ? match[1] : null;

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

        setWsConfig({
          ...wsConfig,
          wsUrl: connUrl,
          token,
          user: { ...user_info },
        });
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

  const clearFieldError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <>
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  localStorage.setItem('user_name', e.target.value);
                  clearFieldError('username');
                }}
                onBlur={() => clearFieldError('username')}
                required
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
                onChange={(e) => {
                  setConnUrl(e.target.value);
                  localStorage.setItem('ws_url', e.target.value);
                  clearFieldError('connUrl');
                }}
                onBlur={() => clearFieldError('connUrl')}
                required
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  onBlur={() => clearFieldError('password')}
                  required
                  className={cn(
                    'pr-10 transition-colors focus:ring-2 focus:ring-primary/20',
                    formErrors.password && 'border-red-500 focus:ring-red-500/20'
                  )}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {!showPassword ? (
                    <IconEyeOff className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <IconEye className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full transition-all duration-200 hover:scale-[1.02]"
              >
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
    </>
  );
}
