import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import { MerchantDashboard } from '@/components/merchant-dashboard';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { kitGetProfile, autoSubscribe, unsubscribe } from '@/services/ws/api';
import { toast } from 'sonner';
import type { MerchantProfile } from '@/services/ws/type';
import { useWebSocketContext } from '@/contexts/WebSocketProvider';
import { useAuthStore } from '@/stores/auth-store';
export default function Page() {
  const { connectionStatus } = useWebSocketContext();
  const [searchParams] = useSearchParams();
  const [selectedItem, setSelectedItem] = useState('Merchant Content');

  const [wsConfig] = useAtom(wsStoreAtom);
  const isAdmin = wsConfig.user?.role === 'admin';
  const { user, setUser, setCurChain, cur_chain } = useAuthStore();

  const wsConnected = connectionStatus === 'connected';
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'create-wallet') {
      setSelectedItem(isAdmin ? 'Create Wallet' : 'Merchant Content');
    }
  }, [searchParams, isAdmin]);

  const handleItemClick = (item: string) => {
    if (item === 'Create Wallet' && !isAdmin) return;
    setSelectedItem(item);
  };

  const renderContent = () => {
    const view = selectedItem === 'Create Wallet' && isAdmin ? 'create-wallet' : 'dashboard';
    return <MerchantDashboard view={view} />;
  };
  const autoSubscribeFn = async () => {
    const otherChains = user?.collection_addresses?.filter(
      (addr) => addr.chain !== cur_chain?.chain
    );
    if (otherChains && otherChains.length > 0) {
      for (const chain of otherChains) {
        const unsubscribeResponse = await unsubscribe({
          chain: chain.chain,
          events: ['address_usage', 'collection_orders', 'payout_orders'],
        });
        if (unsubscribeResponse?.code === 200) {
        }
      }
    }

    try {
      const autoSubscribeResponse = await autoSubscribe({
        chain: cur_chain?.chain,
        events: ['address_usage', 'collection_orders', 'payout_orders', 'lock'],
      });
      if (autoSubscribeResponse?.code === 200) {
      } else {
        toast.warning(`Subscribe response: ${autoSubscribeResponse?.code}`);
      }
    } catch (error) {
      console.error('AutoSubscribe failed:', error);
      toast.error('Subscribe failed: ' + (error as Error).message);
    }
  };
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await kitGetProfile();

        if (response?.code === 200 && response?.data) {
          const profileData = response?.data as MerchantProfile;

          if (user) {
            setUser({
              ...user,
              keystore_id: profileData.keystore_id,
              merchant_id: profileData?.merchant_id,
              collection_addresses: profileData?.collection_addresses || [],
            });
            if (profileData?.collection_addresses?.length > 0) {
              const isCurChain = profileData?.collection_addresses?.find(
                (addr) => addr.chain === cur_chain?.chain
              );
              if (cur_chain?.chain && isCurChain) {
                setCurChain(isCurChain);
              } else {
                setCurChain(profileData.collection_addresses[0]);
              }
            }
          }
        } else {
          console.error('Get configuration failed: ' + (response?.error || 'Unknown error'));
          // toast.error('Get configuration failed: ' + (response?.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Get configuration failed, please check network connection');
        // toast.error('Get configuration failed, please check network connection');
      } finally {
        // setIsLoading(false);;
      }
    };

    if (wsConnected) {
      fetchProfile();
    }
  }, [wsConnected]);
  useEffect(() => {
    if (cur_chain?.chain && wsConnected) {
      autoSubscribeFn();
    }
  }, [cur_chain?.chain, wsConnected]);
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" selectedItem={selectedItem} onItemClick={handleItemClick} />
      <SidebarInset>
        <SiteHeader selectedItem={selectedItem} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-1 flex-col">{renderContent()}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
