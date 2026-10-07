import { CinematicLanding } from '@/components/landing/CinematicLanding';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import './nutrizen-cinematic.css';

const Index = () => {
  useReferralTracking();
  return <CinematicLanding />;
};

export default Index;
