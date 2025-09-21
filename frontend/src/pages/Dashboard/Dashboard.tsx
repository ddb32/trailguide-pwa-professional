import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { useEvents } from '../../hooks/useEvents';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../contexts/AuthContext';
import { eventsService } from '../../services/eventsService';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button/Button';
import { StatsCard } from '../../components/desktop/StatsCard';
import DataTable from '../../components/desktop/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { SkeletonStats, SkeletonTable } from '../../components/common/Skeleton';

// Types and Interfaces
interface DashboardStats {
  title: string;
  value: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string | null;
}

interface DeleteDialog {
  isOpen: boolean;
  guide: any | null;
  isLoading: boolean;
}


interface WelcomeHeaderProps {
  userName: string;
  description: string;
}

interface StatsGridProps {
  stats: DashboardStats[];
  isLoading: boolean;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText: string;
  actionLink: string;
  variant?: 'default' | 'error';
}

// Clean Welcome Header Component - Mobile Optimized
const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName, description }) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl lg:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 xl:p-10">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1 sm:mb-2 lg:mb-3 leading-tight">
              {t('dashboard.welcomeMessage', { name: userName })}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-blue-100 leading-relaxed max-w-3xl">
              {description}
            </p>
          </div>

          {/* Enhanced icon design - Hidden on small screens for better space usage */}
          <div className="hidden md:flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 bg-white/10 backdrop-blur-sm rounded-lg lg:rounded-xl ml-4">
            <Icon
              name="dashboard"
              size="lg"
              className="text-white"
              ariaHidden
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Stats Grid Component
const StatsGrid: React.FC<StatsGridProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <SkeletonStats 
          cards={4}
          columns={4}
          animate={true}
          speed="normal"
          respectMotion={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Row - Total Guides & Completion Rate side by side */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 items-stretch">
        {/* Total Guides */}
        <div className="transform transition-all duration-300 hover:scale-105 animate-fade-in">
          <StatsCard
            title={stats[0].title}
            value={stats[0].value}
            icon={stats[0].icon}
            variant={stats[0].variant}
            subtitle={stats[0].subtitle}
            isLoading={false}
            animateValue={true}
            enhanced={true}
          />
        </div>

        {/* Completion Rate */}
        <div className="transform transition-all duration-300 hover:scale-105 animate-fade-in">
          <StatsCard
            title={stats[1].title}
            value={stats[1].value}
            icon={stats[1].icon}
            variant={stats[1].variant}
            subtitle={stats[1].subtitle}
            isLoading={false}
            animateValue={true}
            enhanced={true}
          />
        </div>
      </div>

      {/* Bottom Row - Feedback Summary spanning full width */}
      <div className="w-full">
        <div className="transform transition-all duration-300 hover:scale-105 animate-fade-in">
          <StatsCard
            title={stats[2].title}
            value={stats[2].value}
            icon={stats[2].icon}
            variant={stats[2].variant}
            subtitle={stats[2].subtitle}
            isLoading={false}
            animateValue={true}
            enhanced={true}
          />
        </div>
      </div>
    </div>
  );
};


// Enhanced Empty State Component
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionLink,
  variant = 'default'
}) => {

  return (
    <div className={`bg-white rounded-xl shadow-lg p-8 text-center border ${
      variant === 'error' ? 'border-error-200' : 'border-gray-100'
    }`}>
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 ${
        variant === 'error'
          ? 'bg-error-50'
          : 'bg-gray-50'
      }`}>
        <Icon
          name={icon as any}
          size="xl"
          className={variant === 'error' ? 'text-error-500' : 'text-gray-400'}
          ariaHidden
        />
      </div>

      <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {variant === 'default' && (
        <Link to={actionLink}>
          <Button
            variant="primary"
            size="md"
            className="px-4 py-2 font-semibold shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105"
            icon={<Icon name="plus" size="md" />}
            iconPosition="left"
          >
            {actionText}
          </Button>
        </Link>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, languageClasses } = useLanguageDirection();
  const { user } = useAuth();
  const { stats, isLoading, error, hasError, clearError, recentEvents, refreshEvents } = useEvents();
  const {
    isLoading: analyticsLoading,
    refreshAnalytics
  } = useAnalytics({ days: 30 });
  
  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>({
    isOpen: false,
    guide: null,
    isLoading: false
  });

  // Sample feedback data for demonstration (replace with real data from API)
  const sampleFeedbackData = {
    totalFeedback: 24,
    positiveFeedback: 18,
    negativeFeedback: 6,
    positiveFeedbackRate: 75,
    negativeFeedbackRate: 25
  };

  // Use sample data if no real feedback data available
  const feedbackStats = stats.totalFeedback > 0 ? stats : sampleFeedbackData;

  // Color-coded stats inspired by mockup design
  const dashboardStats: DashboardStats[] = [
    {
      title: t('dashboard.stats.totalGuides'),
      value: stats.totalGuides.toString(),
      icon: 'guides',
      variant: 'warning', // Orange/amber for total guides
      subtitle: `${stats.activeGuides || 0} ${t('dashboard.stats.active')}`
    },
    {
      title: t('dashboard.stats.completionRate'),
      value: '0%',
      icon: 'target',
      variant: 'info', // Blue for completion rate
      subtitle: undefined
    },
    {
      title: t('dashboard.stats.feedbackSummary'),
      value: feedbackStats.totalFeedback?.toString() || '0',
      icon: 'feedback',
      variant: 'success', // Green for feedback
      subtitle: feedbackStats.totalFeedback > 0
        ? `👍 ${feedbackStats.positiveFeedback || 0} ${t('dashboard.stats.positive')} (${feedbackStats.positiveFeedbackRate || 0}%)\n👎 ${feedbackStats.negativeFeedback || 0} ${t('dashboard.stats.negative')} (${feedbackStats.negativeFeedbackRate || 0}%)`
        : t('dashboard.stats.noFeedbackYet')
    }
  ];

  // Delete handlers
  const handleDeleteClick = (guide: any) => {
    setDeleteDialog({
      isOpen: true,
      guide: guide,
      isLoading: false
    });
  };

  const handleDeleteCancel = () => {
    if (deleteDialog.isLoading) return;
    setDeleteDialog({
      isOpen: false,
      guide: null,
      isLoading: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.guide || deleteDialog.isLoading) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await eventsService.deleteEvent(deleteDialog.guide.id);
      
      if (result.success) {
        toast.success(t('dashboard.actions.deleteSuccess'), {
          duration: 3000,
          style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
        });

        await refreshEvents();
        setDeleteDialog({
          isOpen: false,
          guide: null,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Delete guide error:', error);
      
      let errorMessage = t('dashboard.actions.deleteError');
      if (error instanceof Error && error.message) {
        errorMessage += `: ${error.message}`;
      }

      toast.error(errorMessage, {
        duration: 5000,
        style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
      });

      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleErrorRetry = () => {
    clearError();
    refreshAnalytics();
  };

  return (
    <div className={`relative w-full h-full ${languageClasses}`}>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 xl:space-y-10 px-2 sm:px-0">
      {/* Enhanced Welcome Header */}
      <WelcomeHeader
        userName={user?.username || t('user.defaultName')}
        description={t('dashboard.welcomeDescription')}
      />

      {/* Enhanced Stats Grid */}
      <StatsGrid
        stats={dashboardStats}
        isLoading={isLoading || analyticsLoading}
      />


      {/* Recent Guides with Enhanced Error and Empty States - Mobile Optimized */}
      {hasError ? (
        <div className="bg-white rounded-xl lg:rounded-2xl shadow-desktop p-6 sm:p-8 lg:p-12 border border-error-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-error-100 to-error-200 rounded-xl lg:rounded-2xl mb-4 sm:mb-6 lg:mb-8">
              <Icon name="warning" size="2xl" className="text-error-600" ariaHidden />
            </div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-error-900 mb-2 sm:mb-3 lg:mb-4">
              {t('dashboard.error.loadFailed')}
            </h3>
            <p className="text-error-700 mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md mx-auto px-2">
              {error}
            </p>
            <Button
              onClick={handleErrorRetry}
              variant="secondary"
              size="md"
              className="px-6 py-3 sm:px-8 sm:py-4"
              icon={<Icon name="refresh" size="md" />}
              iconPosition="left"
            >
              {t('dashboard.error.tryAgain')}
            </Button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="animate-fade-in">
          <SkeletonTable
            rows={5}
            columns={4}
            header={true}
            animate={true}
            speed="normal"
            respectMotion={true}
            className="shadow-desktop"
          />
        </div>
      ) : recentEvents.length > 0 ? (
        <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
          <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 mb-1 lg:mb-2 leading-tight">
                  {t('dashboard.recentGuides.title', 'Recent Guides')}
                </h2>
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                  {t('dashboard.recentGuides.subtitle', 'Manage your created guides')}
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 bg-blue-100 rounded-lg lg:rounded-xl ml-4">
                <Icon name="guides" size="md" className="text-blue-600" ariaHidden />
              </div>
            </div>
          </div>
          <DataTable
            data={recentEvents}
            isLoading={isLoading}
            onDelete={handleDeleteClick}
            deleteLoading={deleteDialog.isLoading}
            className="p-0 sm:p-4 lg:p-0"
          />
        </div>
      ) : (
        <div className="animate-fade-in">
          <EmptyState
            icon="guides"
            title={t('dashboard.recentGuides.noGuides')}
            description={t('dashboard.recentGuides.createFirst')}
            actionText={t('dashboard.createFirstGuide')}
            actionLink="/app/create"
          />
        </div>
      )}

      {/* Mobile Floating Action Button - Create New Guide */}
      <div className={`fixed bottom-6 lg:hidden z-50 ${isRTL ? 'left-6' : 'right-6'}`}>
        <Link
          to="/app/create"
          className="group flex items-center justify-center w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-300"
          aria-label={t('dashboard.createFirstGuide')}
        >
          <Icon
            name="plus"
            size="md"
            className="group-hover:scale-110 transition-transform duration-200"
          />
        </Link>
      </div>

      {/* Enhanced Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteDialog.isLoading}
        type="danger"
        title={t('confirmations.deleteGuide', { guideName: deleteDialog.guide?.name || '' })}
        message={
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">
              {t('confirmations.deleteWarning')}
            </p>
            <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-error-800 text-sm font-medium">
                {t('confirmations.deleteConsequence', 'This action cannot be undone. All associated data will be permanently removed.')}
              </p>
            </div>
          </div>
        }
        confirmText={t('confirmations.confirmDelete')}
        cancelText={t('confirmations.cancelDelete')}
      />
      </div>
    </div>
  );
};

export default Dashboard;