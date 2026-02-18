export type ListingSidebarItem = {
  id: string;
  title: string | null;
  listingStage: string | null;
  lastOpenedAt?: Date | string | null;
};

export interface ViewSidebarProps {
  className?: string;
  userName?: string;
  paymentPlan?: string;
  userAvatar?: string;
  listings?: ListingSidebarItem[];
}

export interface SidebarLayoutProps extends ViewSidebarProps {
  onMobileClose?: () => void;
  isCollapsed?: boolean;
}
