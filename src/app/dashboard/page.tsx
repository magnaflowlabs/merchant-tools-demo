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
import { useAuthStore, useAppStore, useShallow } from '@/stores';
import { useCollectionAddressInfo } from '@/hooks/use-collection-address-info';
import type { NavigationItemId } from '@/config/navigation';

export default function Page() {
  const { connectionStatus } = useWebSocketContext();
  const [searchParams] = useSearchParams();
  const [selectedItem, setSelectedItem] = useState<NavigationItemId>('merchant.content');

  const [wsConfig] = useAtom(wsStoreAtom);
  const isAdmin = wsConfig.user?.role === 'admin';
  const { profileData, setProfileData } = useAuthStore(
    useShallow((state) => ({
      profileData: state.profileData,
      setProfileData: state.setProfileData,
    }))
  );

  const { sidebarOpen, setSidebarOpen } = useAppStore(
    useShallow((state) => ({
      sidebarOpen: state.sidebarOpen,
      setSidebarOpen: state.setSidebarOpen,
    }))
  );

  // Use derived state hook to automatically get collection address info for current chain
  const curCollectionAddressInfo = useCollectionAddressInfo();

  const wsConnected = connectionStatus === 'connected';
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'create-wallet') {
      setSelectedItem(isAdmin ? 'create.wallet' : 'merchant.content');
    }
  }, [searchParams, isAdmin]);

  const handleItemClick = (itemId: NavigationItemId) => {
    if (itemId === 'create.wallet' && !isAdmin) return;
    setSelectedItem(itemId);
  };

  const renderContent = () => {
    const view = selectedItem === 'create.wallet' && isAdmin ? 'create-wallet' : 'dashboard';
    return <MerchantDashboard view={view} />;
  };
  useEffect(() => {
    const autoSubscribeFn = async () => {
      const otherChains = profileData?.collection_addresses?.filter(
        (addr) => addr.chain !== curCollectionAddressInfo?.chain
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
          chain: curCollectionAddressInfo?.chain,
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

    if (curCollectionAddressInfo?.chain && wsConnected) {
      autoSubscribeFn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curCollectionAddressInfo?.chain, wsConnected]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await kitGetProfile();

        if (response?.code === 200 && response?.data) {
          const profileData = response?.data as MerchantProfile;
          setProfileData(profileData);
        } else {
          console.error('Failed to get configuration: ' + (response?.error || 'Unknown error'));
        }
      } catch {
        console.error('Failed to get configuration, please check network connection');
      }
    };

    if (wsConnected) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected]);

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
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
